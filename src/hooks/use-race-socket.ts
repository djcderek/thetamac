"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type {
  RaceClientToServerEvents,
  RaceServerToClientEvents,
  RaceConfig,
  PlayerProblems,
  ActionType,
  TrackObstacle,
  TrackDrop,
  UserCosmetics,
} from "@/lib/racing/types";

type TypedSocket = Socket<RaceServerToClientEvents, RaceClientToServerEvents>;

// ============================================
// STATE INTERFACES
// ============================================

interface QueueState {
  inQueue: boolean;
  playersInQueue: number;
  estimatedWait: number;
}

interface LobbyState {
  inLobby: boolean;
  lobbyId: string | null;
  players: Array<{ 
    id: string; 
    username: string; 
    rating: number;
    cosmetics?: UserCosmetics;
  }>;
  config: RaceConfig | null;
  startingIn: number | null;
}

interface RacePlayerState {
  id: string;
  username: string;
  rating: number;
  lane: number;
  position: number;
  isStunned: boolean;
  hasShield: boolean;
  selectedSkin?: string;
  selectedTrail?: string;
  selectedVehicle?: string;
  selectedWheel?: string;
}

interface RaceState {
  inRace: boolean;
  raceId: string | null;
  status: "countdown" | "racing" | "finished" | null;
  countdown: number;
  players: RacePlayerState[];
  config: RaceConfig | null;
  myProblems: PlayerProblems | null;
  obstacles: TrackObstacle[];
  drops: TrackDrop[];
  finishOrder: Array<{
    playerId: string;
    position: number;
    time: number;
  }>;
  myFinishPosition: number | null; // Track if current player has finished
}

interface RaceResult {
  results: Array<{
    playerId: string;
    username: string;
    position: number;
    time: number | null;
    ratingChange: number;
    stats: {
      problemsSolved: number;
      bumpsGiven: number;
      bumpsReceived: number;
      boostsUsed: number;
    };
  }>;
  myRatingChange: number;
  coinsEarned?: number;
}

interface ActionFeedback {
  type: "success" | "wrong" | "bump_given" | "bump_received";
  message: string;
  timestamp: number;
}

// ============================================
// HOOK
// ============================================

export function useRaceSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const myPlayerIdRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  
  const [queue, setQueue] = useState<QueueState>({
    inQueue: false,
    playersInQueue: 0,
    estimatedWait: 0,
  });
  
  const [lobby, setLobby] = useState<LobbyState>({
    inLobby: false,
    lobbyId: null,
    players: [],
    config: null,
    startingIn: null,
  });
  
  const [race, setRace] = useState<RaceState>({
    inRace: false,
    raceId: null,
    status: null,
    countdown: 0,
    players: [],
    config: null,
    myProblems: null,
    obstacles: [],
    drops: [],
    finishOrder: [],
    myFinishPosition: null,
  });
  
  const [result, setResult] = useState<RaceResult | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Cooldown tracking for wrong answers
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [cooldownState, setCooldownState] = useState({ isOnCooldown: false, cooldownRemaining: 0 });

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const remaining = Math.max(0, cooldownUntil - now);
      setCooldownState({ isOnCooldown: remaining > 0, cooldownRemaining: remaining });
    };
    
    update();
    
    if (cooldownUntil > Date.now()) {
      // Reduced from 100ms to 250ms for better performance
      const interval = setInterval(update, 250);
      return () => clearInterval(interval);
    }
  }, [cooldownUntil]);

  // Add feedback helper
  const addFeedback = useCallback((type: ActionFeedback["type"], message: string) => {
    const newFeedback: ActionFeedback = {
      type,
      message,
      timestamp: Date.now(),
    };
    setFeedback(prev => [...prev.slice(-4), newFeedback]); // Keep last 5
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setFeedback(prev => prev.filter(f => f.timestamp !== newFeedback.timestamp));
    }, 3000);
  }, []);

  // Reset all state helper
  const resetAllState = useCallback(() => {
    myPlayerIdRef.current = null;
    setMyPlayerId(null);
    setQueue({ inQueue: false, playersInQueue: 0, estimatedWait: 0 });
    setLobby({
      inLobby: false,
      lobbyId: null,
      players: [],
      config: null,
      startingIn: null,
    });
    setRace({
      inRace: false,
      raceId: null,
      status: null,
      countdown: 0,
      players: [],
      config: null,
      myProblems: null,
      obstacles: [],
      drops: [],
      finishOrder: [],
      myFinishPosition: null,
    });
    setResult(null);
    setFeedback([]);
    setError(null);
    setCooldownUntil(0);
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const socket: TypedSocket = io({
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("[Race] Socket connected:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[Race] Socket disconnected");
      setIsConnected(false);
      resetAllState();
    });

    // Queue events
    socket.on("race:queue_update", ({ playersInQueue, estimatedWait }) => {
      setQueue(prev => ({ ...prev, playersInQueue, estimatedWait }));
    });

    // Lobby events
    socket.on("race:lobby_joined", ({ lobbyId, players, config }) => {
      setQueue({ inQueue: false, playersInQueue: 0, estimatedWait: 0 });
      setLobby({
        inLobby: true,
        lobbyId,
        players,
        config,
        startingIn: null,
      });
    });

    socket.on("race:player_joined", ({ player, totalPlayers }) => {
      setLobby(prev => ({
        ...prev,
        players: [...prev.players, player],
      }));
    });

    socket.on("race:player_left", ({ playerId, totalPlayers }) => {
      setLobby(prev => ({
        ...prev,
        players: prev.players.filter(p => p.id !== playerId),
      }));
    });

    socket.on("race:starting_soon", ({ secondsUntilStart }) => {
      setLobby(prev => ({ ...prev, startingIn: secondsUntilStart }));
    });

    // Race events
    socket.on("race:countdown", ({ seconds }) => {
      setRace(prev => ({ ...prev, status: "countdown", countdown: seconds }));
    });

    socket.on("race:start", ({ raceId, players, config, yourProblems, obstacles, drops }) => {
      // Clear queue state to ensure consistent state (especially during reconnection)
      setQueue({ inQueue: false, playersInQueue: 0, estimatedWait: 0 });
      setLobby({
        inLobby: false,
        lobbyId: null,
        players: [],
        config: null,
        startingIn: null,
      });
      setRace({
        inRace: true,
        raceId,
        status: "countdown",
        countdown: 3,
        players: players.map(p => ({ ...p, isStunned: false, hasShield: false })),
        config,
        myProblems: yourProblems,
        obstacles,
        drops,
        finishOrder: [],
        myFinishPosition: null,
      });
      setResult(null);
    });

    socket.on("race:state_update", ({ players }) => {
      setRace(prev => ({
        ...prev,
        status: "racing",
        players: prev.players.map(p => {
          const update = players.find(u => u.id === p.id);
          if (update) {
            return { 
              ...p, 
              lane: update.lane,
              position: update.position,
              isStunned: update.isStunned,
              hasShield: update.hasShield,
            };
          }
          return p;
        }),
      }));
    });

    socket.on("race:action_result", ({ 
      playerId, 
      action, 
      success, 
      newLane, 
      newPosition,
      bumpedPlayerId,
      bumpedPlayerNewPosition,
      yourNewProblems,
    }) => {
      // Update player position
      setRace(prev => ({
        ...prev,
        players: prev.players.map(p => {
          if (p.id === playerId) {
            return {
              ...p,
              lane: newLane ?? p.lane,
              position: newPosition ?? p.position,
            };
          }
          if (p.id === bumpedPlayerId) {
            return {
              ...p,
              position: bumpedPlayerNewPosition ?? p.position,
              isStunned: true,
            };
          }
          return p;
        }),
        myProblems: yourNewProblems ?? prev.myProblems,
      }));
    });

    socket.on("race:player_bumped", ({ bumperId, victimId, victimNewPosition, victimNewLane, stunDuration }) => {
      setRace(prev => ({
        ...prev,
        players: prev.players.map(p => {
          if (p.id === victimId) {
            return {
              ...p,
              lane: victimNewLane,
              position: victimNewPosition,
              isStunned: true,
            };
          }
          return p;
        }),
      }));

      // Clear stun after duration
      setTimeout(() => {
        setRace(prev => ({
          ...prev,
          players: prev.players.map(p => {
            if (p.id === victimId) {
              return { ...p, isStunned: false };
            }
            return p;
          }),
        }));
      }, stunDuration);
    });

    socket.on("race:wrong_answer", ({ playerId, action, cooldownMs }) => {
      setCooldownUntil(Date.now() + cooldownMs);
    });

    socket.on("race:drop_collected", ({ playerId, dropId, dropType, effectDuration, coinValue, coinsEarnedTotal }) => {
      setRace(prev => ({
        ...prev,
        drops: prev.drops.map(d => 
          d.id === dropId ? { ...d, collected: true, collectedBy: playerId } : d
        ),
      }));
      // Add feedback if it's the current player
      if (playerId === myPlayerIdRef.current) {
        if (dropType === "coin" && coinValue) {
          const total = coinsEarnedTotal ?? 0;
          addFeedback("success", `Collected ${coinValue} coins! (${total} this race)`);
        } else {
          addFeedback("success", `Collected ${dropType.replace("_", " ")}!`);
        }
      }
    });

    socket.on("race:drops_update", ({ drops }) => {
      setRace(prev => ({
        ...prev,
        drops,
      }));
    });

    socket.on("race:obstacle_hit", ({ playerId, obstacleId, obstacleType, stunDuration, pushback }) => {
      if (playerId === myPlayerIdRef.current) {
        addFeedback("wrong", `Hit ${obstacleType.replace("_", " ")}! Stunned for ${stunDuration / 1000}s`);
      }
    });

    socket.on("race:powerup_activated", ({ playerId, powerupType, duration }) => {
      if (playerId === myPlayerIdRef.current) {
        addFeedback("success", `${powerupType.replace("_", " ")} activated for ${duration / 1000}s!`);
      }
    });

    socket.on("race:powerup_expired", ({ playerId, powerupType }) => {
      if (playerId === myPlayerIdRef.current) {
        addFeedback("wrong", `${powerupType.replace("_", " ")} expired`);
      }
    });

    socket.on("race:player_finished", ({ playerId, position, time }) => {
      setRace(prev => {
        // Check if this is the current player finishing
        const isMe = playerId === myPlayerIdRef.current;
        return {
          ...prev,
          finishOrder: [...prev.finishOrder, { playerId, position, time }],
          myFinishPosition: isMe ? position : prev.myFinishPosition,
          // Clear problems when finished
          myProblems: isMe ? null : prev.myProblems,
        };
      });
    });

    socket.on("race:finished", ({ results, yourRatingChange, coinsEarned }) => {
      setRace(prev => ({ ...prev, status: "finished" }));
      setResult({ results, myRatingChange: yourRatingChange, coinsEarned });
    });

    socket.on("race:player_disconnected", ({ playerId }) => {
      setRace(prev => ({
        ...prev,
        players: prev.players.filter(p => p.id !== playerId),
      }));
    });

    socket.on("race:error", (errorMsg) => {
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, []); // Empty dependency array for resetAllState

  // ============================================
  // ACTIONS
  // ============================================

  const joinQueue = useCallback(async (userId: string, username: string) => {
    if (socketRef.current) {
      myPlayerIdRef.current = userId;
      setMyPlayerId(userId);
      
      // Fetch user's equipped cosmetics
      let cosmetics: UserCosmetics | undefined;
      try {
        const res = await fetch("/api/user/cosmetics");
        if (res.ok) {
          cosmetics = await res.json();
        }
      } catch (err) {
        console.warn("Failed to fetch cosmetics:", err);
      }
      
      socketRef.current.emit("race:join_queue", { userId, username, cosmetics });
      setQueue(prev => ({ ...prev, inQueue: true }));
    }
  }, []);

  const leaveQueue = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("race:leave_queue");
      setQueue({ inQueue: false, playersInQueue: 0, estimatedWait: 0 });
      setLobby({
        inLobby: false,
        lobbyId: null,
        players: [],
        config: null,
        startingIn: null,
      });
    }
  }, []);

  const submitAnswer = useCallback((
    action: ActionType,
    answer: number,
    problemId: string
  ) => {
    // Check cooldown
    if (Date.now() < cooldownUntil) {
      addFeedback("wrong", "On cooldown!");
      return false;
    }

    if (socketRef.current) {
      socketRef.current.emit("race:submit_answer", { action, answer, problemId });
      return true;
    }
    return false;
  }, [cooldownUntil, addFeedback]);

  const forfeit = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("race:forfeit");
    }
  }, []);

  const leaveRace = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("race:leave");
    }
    resetAllState();
  }, [resetAllState]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const { isOnCooldown, cooldownRemaining } = cooldownState;

  // Get my player from the race
  const getMyPlayer = useCallback((myUserId: string) => {
    return race.players.find(p => p.id === myUserId);
  }, [race.players]);

  // Get players sorted by position (for leaderboard display)
  const getLeaderboard = useCallback(() => {
    return [...race.players].sort((a, b) => b.position - a.position);
  }, [race.players]);

  return {
    // Connection
    isConnected,
    
    // State
    queue,
    lobby,
    race,
    result,
    feedback,
    error,
    myPlayerId,
    
    // Cooldown
    isOnCooldown,
    cooldownRemaining,
    
    // Actions
    joinQueue,
    leaveQueue,
    submitAnswer,
    forfeit,
    leaveRace,
    resetAllState,
    
    // Helpers
    getMyPlayer,
    getLeaderboard,
  };
}
