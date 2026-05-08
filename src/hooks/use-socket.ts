"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Problem,
  PrivateDuelPlayerRoundResult,
  PrivateDuelRoomSnapshot,
} from "@/lib/multiplayer/types";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface MatchmakingState {
  isSearching: boolean;
  position: number;
  opponent: { id: string; username: string; rating: number; isGuest?: boolean } | null;
}

interface GameplayState {
  status: "idle" | "countdown" | "playing" | "round_end" | "game_over";
  countdown: number;
  currentRound: number;
  problem: Problem | null;
  scores: Record<string, number>;
  roundResult: {
    winnerId: string | null;
    correctAnswer: number;
    yourTime: number | null;
    opponentTime: number | null;
  } | null;
  gameResult: {
    winnerId: string | null;
    finalScores: Record<string, number>;
    ratingChange: number;
  } | null;
  opponentAnswered: boolean;
}

interface PrivateDuelState {
  inRoom: boolean;
  room: PrivateDuelRoomSnapshot | null;
  youAreHost: boolean;
  joinUrl: string | null;
  countdown: number;
  currentRound: number;
  totalRounds: number;
  problem: Problem | null;
  scores: Record<string, number>;
  lastCorrectAnswer: number | null;
  roundResults: PrivateDuelPlayerRoundResult[] | null;
  gameOver: {
    winnerId: string | null;
    finalScores: Record<string, number>;
    leaderboard: Array<{ playerId: string; username: string; score: number }>;
  } | null;
  error: string | null;
}

type PlayerIdentity = {
  id: string;
  username: string;
  isGuest: boolean;
};

export function useSocket() {
  const { data: session } = useSession();
  const socketRef = useRef<TypedSocket | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  // If we were mid-search or mid-game when the socket dropped, auto rejoin on reconnect.
  const resumeOnReconnectRef = useRef<boolean>(false);
  const resumePrivateDuelOnReconnectRef = useRef<boolean>(false);
  const privateDuelRoomCodeRef = useRef<string | null>(null);
  const lastAutoJoinAtRef = useRef<number>(0);
  const lastPrivateAutoJoinAtRef = useRef<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
  const identityIdRef = useRef<string | null>(null);
  
  const [matchmaking, setMatchmaking] = useState<MatchmakingState>({
    isSearching: false,
    position: 0,
    opponent: null,
  });
  
  const [gameplay, setGameplay] = useState<GameplayState>({
    status: "idle",
    countdown: 0,
    currentRound: 0,
    problem: null,
    scores: {},
    roundResult: null,
    gameResult: null,
    opponentAnswered: false,
  });

  const [privateDuel, setPrivateDuel] = useState<PrivateDuelState>({
    inRoom: false,
    room: null,
    youAreHost: false,
    joinUrl: null,
    countdown: 0,
    currentRound: 0,
    totalRounds: 10,
    problem: null,
    scores: {},
    lastCorrectAnswer: null,
    roundResults: null,
    gameOver: null,
    error: null,
  });

  // Initialize socket connection
  useEffect(() => {
    const userId = session?.user?.id ?? null;

    // In production, missing NEXT_PUBLIC_SOCKET_URL often means the client will try to connect
    // to the frontend origin (e.g. Vercel) which does not run the Socket.io server.
    if (process.env.NODE_ENV === "production" && !socketUrl) {
      console.warn(
        "[socket] NEXT_PUBLIC_SOCKET_URL is not set; connecting to current origin. " +
          "If multiplayer/bots fail in prod, set NEXT_PUBLIC_SOCKET_URL to your websocket server origin."
      );
    }

    // Avoid tearing down the socket when the session refreshes on tab focus.
    if (socketRef.current && lastUserIdRef.current === userId) {
      return;
    }

    // If the authenticated user changed (login/logout), fully reset the socket before reconnecting.
    if (socketRef.current && lastUserIdRef.current !== userId) {
      socketRef.current.disconnect();
      socketRef.current = null;
      lastUserIdRef.current = null;
    }

    let socket: TypedSocket | null = null;
    let mounted = true;

    async function initSocket() {
      // Fetch a secure token for cross-origin authentication
      let authToken: string | undefined;
      try {
        const sessionIdentity: PlayerIdentity | null = session?.user?.id
          ? {
              id: session.user.id,
              username: session.user.name || "Player",
              isGuest: false,
            }
          : null;

        let socketTokenRes = await fetch("/api/auth/socket-token");

        // If unauthenticated, mint/refresh a guest cookie then retry.
        if (socketTokenRes.status === 401 && !sessionIdentity) {
          const guestRes = await fetch("/api/auth/guest-token");
          if (guestRes.ok) {
            const guestData = await guestRes.json();
            if (guestData?.guest?.id && guestData?.guest?.name) {
              const guestIdentity = {
                id: guestData.guest.id,
                username: guestData.guest.name,
                isGuest: true,
              };
              identityIdRef.current = guestIdentity.id;
              setIdentity(guestIdentity);
            }
          }

          socketTokenRes = await fetch("/api/auth/socket-token");
        }

        if (socketTokenRes.ok) {
          const data: {
            token?: string;
            isGuest?: boolean;
            userId?: string;
            username?: string;
          } = await socketTokenRes.json();

          authToken = data.token;

          if (sessionIdentity) {
            identityIdRef.current = sessionIdentity.id;
            setIdentity(sessionIdentity);
          } else if (data.userId && data.username) {
            const tokenIdentity = {
              id: data.userId,
              username: data.username,
              isGuest: data.isGuest === true,
            };
            identityIdRef.current = tokenIdentity.id;
            setIdentity(tokenIdentity);
          }
        } else if (sessionIdentity) {
          // Still expose the signed-in identity even if socket token fetch failed.
          identityIdRef.current = sessionIdentity.id;
          setIdentity(sessionIdentity);
        }
      } catch (err) {
        console.warn("Failed to fetch socket token:", err);
      }

      if (!mounted) return;

      socket = io(socketUrl, {
        transports: ["websocket", "polling"],
        autoConnect: true,
        withCredentials: true,
        auth: authToken ? { token: authToken } : undefined,
      }) as TypedSocket;

      socketRef.current = socket;
      lastUserIdRef.current = userId;

      // Connection events
      socket.on("connect", () => {
        console.log("Socket connected:", socket?.id);
        setIsConnected(true);

        // If we were in matchmaking/game when the connection dropped, try to resume automatically.
        if (resumeOnReconnectRef.current) {
          const now = Date.now();
          // Throttle to avoid spamming on flappy networks / repeated reconnects.
          if (now - lastAutoJoinAtRef.current > 2500) {
            lastAutoJoinAtRef.current = now;
            socket?.emit("matchmaking:join");
          }
        }

        // If we were in a private duel room, try to rejoin automatically.
        if (resumePrivateDuelOnReconnectRef.current && privateDuelRoomCodeRef.current) {
          const now = Date.now();
          if (now - lastPrivateAutoJoinAtRef.current > 2500) {
            lastPrivateAutoJoinAtRef.current = now;
            socket?.emit("duel_private:join_room", { roomCode: privateDuelRoomCodeRef.current });
          }
        }
      });

      socket.on("connect_error", (err) => {
        console.error("[socket] connect_error:", err?.message || err, err);
        setIsConnected(false);
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        setIsConnected(false);
        
        // Only fully reset state for intentional disconnects (user-initiated)
        // For transport-related disconnects, preserve state for reconnection
        const isIntentionalDisconnect = reason === "io client disconnect" || reason === "io server disconnect";
        
        setMatchmaking({
          isSearching: false,
          position: 0,
          opponent: null,
        });
        setGameplay({
          status: "idle",
          countdown: 0,
          currentRound: 0,
          problem: null,
          scores: {},
          roundResult: null,
          gameResult: null,
          opponentAnswered: false,
        });
        
        if (isIntentionalDisconnect) {
          // Full reset for intentional disconnects
          setPrivateDuel({
            inRoom: false,
            room: null,
            youAreHost: false,
            joinUrl: null,
            countdown: 0,
            currentRound: 0,
            totalRounds: 10,
            problem: null,
            scores: {},
            lastCorrectAnswer: null,
            roundResults: null,
            gameOver: null,
            error: null,
          });
        } else {
          // Transport disconnect (switching apps, network issues) - preserve room info for UI
          // The refs are preserved for auto-rejoin, but we also keep joinUrl for display
          setPrivateDuel((prev) => ({
            ...prev,
            // Keep room info and joinUrl for display during reconnection
            // inRoom stays true so the UI shows "Reconnecting..." instead of resetting to lobby
            countdown: 0,
            problem: null,
            roundResults: null,
            error: "Reconnecting...",
          }));
        }
      });

      // Online count
      socket.on("online_count", (count) => {
        setOnlineCount(count);
      });

      // Matchmaking events
      socket.on("matchmaking:searching", ({ position }) => {
        resumeOnReconnectRef.current = true;
        setMatchmaking((prev) => ({ ...prev, isSearching: true, position }));
      });

      socket.on("matchmaking:found", ({ opponent }) => {
        resumeOnReconnectRef.current = true;
        setMatchmaking({
          isSearching: false,
          position: 0,
          opponent,
        });
        setGameplay((prev) => ({ ...prev, status: "countdown" }));
      });

      socket.on("matchmaking:cancelled", () => {
        resumeOnReconnectRef.current = false;
        setMatchmaking({
          isSearching: false,
          position: 0,
          opponent: null,
        });
      });

      socket.on("matchmaking:error", (error) => {
        console.error("Matchmaking error:", error);
        resumeOnReconnectRef.current = false;
        setMatchmaking({
          isSearching: false,
          position: 0,
          opponent: null,
        });
      });

      // Game events
      socket.on("game:start", ({ gameState }) => {
        // Server-side state snapshot (used for reconnect/resume)
        resumeOnReconnectRef.current = true;

        const currentSocketId = socket?.id;
        const self =
          gameState.players.find((p) => p.socketId === currentSocketId) ??
          gameState.players.find((p) => p.id === session?.user?.id);
        const opponent =
          gameState.players.find((p) => p.id !== self?.id) ??
          gameState.players.find((p) => p.socketId !== currentSocketId) ??
          null;

        if (opponent) {
          setMatchmaking({
            isSearching: false,
            position: 0,
            opponent: {
              id: opponent.id,
              username: opponent.username,
              rating: opponent.rating,
              isGuest: opponent.isGuest,
            },
          });
        }

        // Best-effort UI restore. (We intentionally don’t try to recreate roundResult overlays.)
        setGameplay((prev) => ({
          ...prev,
          status: gameState.status === "waiting" ? "idle" : gameState.status,
          countdown: 0,
          currentRound: gameState.currentRound,
          problem: gameState.currentProblem,
          scores: gameState.scores,
          roundResult: null,
          gameResult: null,
          opponentAnswered: false,
        }));
      });

      socket.on("game:countdown", ({ seconds }) => {
        resumeOnReconnectRef.current = true;
        setGameplay((prev) => ({ ...prev, status: "countdown", countdown: seconds }));
      });

      socket.on("game:new_round", ({ round, problem }) => {
        resumeOnReconnectRef.current = true;
        setGameplay((prev) => ({
          ...prev,
          status: "playing",
          currentRound: round,
          problem,
          roundResult: null,
          opponentAnswered: false,
        }));
      });

      socket.on("game:opponent_answered", () => {
        setGameplay((prev) => ({ ...prev, opponentAnswered: true }));
      });

      socket.on("game:round_result", (result) => {
        resumeOnReconnectRef.current = true;
        setGameplay((prev) => ({
          ...prev,
          status: "round_end",
          scores: result.scores,
          roundResult: {
            winnerId: result.winnerId,
            correctAnswer: result.correctAnswer,
            yourTime: result.yourTime,
            opponentTime: result.opponentTime,
          },
        }));
      });

      socket.on("game:over", (result) => {
        resumeOnReconnectRef.current = false;
        setGameplay((prev) => ({
          ...prev,
          status: "game_over",
          gameResult: {
            winnerId: result.winnerId,
            finalScores: result.finalScores,
            ratingChange: result.ratingChange,
          },
        }));
      });

      socket.on("game:forfeit", ({ forfeitedBy }) => {
        console.log("Player forfeited:", forfeitedBy);
      });

      socket.on("game:opponent_disconnected", () => {
        setGameplay((prev) => ({
          ...prev,
          status: "game_over",
          gameResult: {
            winnerId: null,
            finalScores: prev.scores,
            ratingChange: 0,
          },
        }));
      });

      // ==========================================
      // PRIVATE DUEL EVENTS
      // ==========================================

      socket.on("duel_private:room_joined", ({ room, youAreHost, joinUrl }) => {
        resumePrivateDuelOnReconnectRef.current = true;
        privateDuelRoomCodeRef.current = room.roomCode;
        setPrivateDuel((prev) => ({
          ...prev,
          inRoom: true,
          room,
          youAreHost,
          joinUrl: joinUrl ?? prev.joinUrl,
          countdown: 0,
          currentRound: 0,
          totalRounds: room.totalRounds,
          problem: null,
          scores: {},
          lastCorrectAnswer: null,
          roundResults: null,
          gameOver: null,
          error: null,
        }));
      });

      socket.on("duel_private:player_joined", ({ player }) => {
        setPrivateDuel((prev) => {
          const room = prev.room;
          if (!room) return prev;
          return {
            ...prev,
            room: {
              ...room,
              players: [...room.players, player],
            },
          };
        });
      });

      socket.on("duel_private:player_left", ({ playerId, newHostId }) => {
        setPrivateDuel((prev) => {
          const room = prev.room;
          if (!room) return prev;
          const nextPlayers = room.players.filter((p) => p.id !== playerId);
          const nextHostId = newHostId ?? room.hostId;
          return {
            ...prev,
            youAreHost: prev.youAreHost ? true : nextHostId === (session?.user?.id ?? identityIdRef.current ?? ""),
            room: {
              ...room,
              hostId: nextHostId,
              players: nextPlayers,
            },
          };
        });
      });

      socket.on("duel_private:countdown", ({ seconds }) => {
        setPrivateDuel((prev) => ({ ...prev, countdown: seconds }));
      });

      socket.on("duel_private:new_round", ({ round, totalRounds, problem }) => {
        setPrivateDuel((prev) => ({
          ...prev,
          currentRound: round,
          totalRounds,
          problem,
          lastCorrectAnswer: null,
          roundResults: null,
          gameOver: null,
        }));
      });

      socket.on("duel_private:round_result", ({ round, correctAnswer, results, scores }) => {
        setPrivateDuel((prev) => ({
          ...prev,
          currentRound: round,
          scores,
          lastCorrectAnswer: correctAnswer,
          roundResults: results,
        }));
      });

      socket.on("duel_private:game_over", (data) => {
        resumePrivateDuelOnReconnectRef.current = false;
        setPrivateDuel((prev) => ({
          ...prev,
          gameOver: data,
        }));
      });

      socket.on("duel_private:room_restarted", ({ room }) => {
        resumePrivateDuelOnReconnectRef.current = true;
        privateDuelRoomCodeRef.current = room.roomCode;
        setPrivateDuel({
          inRoom: true,
          room,
          youAreHost: room.hostId === (session?.user?.id ?? identityIdRef.current ?? ""),
          joinUrl: null,
          countdown: 0,
          currentRound: 0,
          totalRounds: room.totalRounds,
          problem: null,
          scores: {},
          lastCorrectAnswer: null,
          roundResults: null,
          gameOver: null,
          error: null,
        });
      });

      socket.on("duel_private:error", (error) => {
        setPrivateDuel((prev) => ({ ...prev, error }));
        setTimeout(() => setPrivateDuel((prev) => ({ ...prev, error: null })), 5000);
      });
    }

    void initSocket();

    return () => {
      mounted = false;
      if (socket && socketRef.current === socket) {
        socket.disconnect();
        socketRef.current = null;
        lastUserIdRef.current = null;
      }
    };
  }, [session?.user?.id, session?.user?.name, socketUrl]);

  // Handle page visibility changes (app switching on mobile)
  // When user returns to the app, quickly attempt to reconnect if disconnected
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const socket = socketRef.current;
        if (!socket) return;

        // If socket is disconnected, force reconnect immediately
        if (!socket.connected) {
          console.log("[socket] Page became visible, attempting reconnect...");
          socket.connect();
        } else {
          // Socket still connected - rejoin private duel room if we were in one
          // This handles cases where the socket stayed connected but we lost room state
          if (resumePrivateDuelOnReconnectRef.current && privateDuelRoomCodeRef.current) {
            const now = Date.now();
            if (now - lastPrivateAutoJoinAtRef.current > 2500) {
              lastPrivateAutoJoinAtRef.current = now;
              console.log("[socket] Page became visible, rejoining private duel room...");
              socket.emit("duel_private:join_room", { roomCode: privateDuelRoomCodeRef.current });
            }
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Matchmaking actions
  const joinMatchmaking = useCallback(() => {
    if (socketRef.current) {
      resumeOnReconnectRef.current = true;
      socketRef.current.emit("matchmaking:join");
      setMatchmaking((prev) => ({ ...prev, isSearching: true }));
    }
  }, []);

  const leaveMatchmaking = useCallback(() => {
    if (socketRef.current) {
      resumeOnReconnectRef.current = false;
      socketRef.current.emit("matchmaking:leave");
      setMatchmaking({
        isSearching: false,
        position: 0,
        opponent: null,
      });
    }
  }, []);

  // Game actions
  const submitAnswer = useCallback((answer: number, timeMs: number) => {
    if (socketRef.current) {
      socketRef.current.emit("game:submit_answer", { answer, timeMs });
    }
  }, []);

  const forfeit = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("game:forfeit");
    }
  }, []);

  const sendQuickChat = useCallback((message: string) => {
    if (socketRef.current) {
      socketRef.current.emit("game:quick_chat", message);
    }
  }, []);

  const resetGame = useCallback(() => {
    // Tell server to clear room mapping
    if (socketRef.current) {
      socketRef.current.emit("game:leave");
    }
    resumeOnReconnectRef.current = false;
    setMatchmaking({
      isSearching: false,
      position: 0,
      opponent: null,
    });
    setGameplay({
      status: "idle",
      countdown: 0,
      currentRound: 0,
      problem: null,
      scores: {},
      roundResult: null,
      gameResult: null,
      opponentAnswered: false,
    });
  }, []);

  // ============================================
  // PRIVATE DUEL ACTIONS
  // ============================================

  const createPrivateDuelRoom = useCallback(() => {
    if (!socketRef.current) return;
    resumePrivateDuelOnReconnectRef.current = true;
    socketRef.current.emit("duel_private:create_room");
  }, []);

  const joinPrivateDuelRoom = useCallback((roomCode: string) => {
    if (!socketRef.current) return;
    const cleaned = roomCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!cleaned) return;
    resumePrivateDuelOnReconnectRef.current = true;
    privateDuelRoomCodeRef.current = cleaned;
    socketRef.current.emit("duel_private:join_room", { roomCode: cleaned });
  }, []);

  const leavePrivateDuelRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("duel_private:leave_room");
    resumePrivateDuelOnReconnectRef.current = false;
    privateDuelRoomCodeRef.current = null;
    setPrivateDuel({
      inRoom: false,
      room: null,
      youAreHost: false,
      joinUrl: null,
      countdown: 0,
      currentRound: 0,
      totalRounds: 10,
      problem: null,
      scores: {},
      lastCorrectAnswer: null,
      roundResults: null,
      gameOver: null,
      error: null,
    });
  }, []);

  const startPrivateDuelGame = useCallback((rounds?: number) => {
    if (!socketRef.current) return;
    if (rounds !== undefined) {
      socketRef.current.emit("duel_private:start_game", { rounds });
    } else {
      socketRef.current.emit("duel_private:start_game");
    }
  }, []);

  const submitPrivateDuelAnswer = useCallback((answer: number, timeMs: number) => {
    if (!socketRef.current) return;
    socketRef.current.emit("duel_private:submit_answer", { answer, timeMs });
  }, []);

  const restartPrivateDuelRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("duel_private:restart_room");
  }, []);

  return {
    isConnected,
    onlineCount,
    identity,
    matchmaking,
    gameplay,
    joinMatchmaking,
    leaveMatchmaking,
    submitAnswer,
    forfeit,
    sendQuickChat,
    resetGame,

    // Private duel
    privateDuel,
    createPrivateDuelRoom,
    joinPrivateDuelRoom,
    leavePrivateDuelRoom,
    startPrivateDuelGame,
    submitPrivateDuelAnswer,
    restartPrivateDuelRoom,
  };
}
