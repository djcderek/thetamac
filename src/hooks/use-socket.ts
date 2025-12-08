"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Problem,
  GameState,
} from "@/lib/multiplayer/types";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface MatchmakingState {
  isSearching: boolean;
  position: number;
  opponent: { id: string; username: string; rating: number } | null;
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

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  
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

  // Initialize socket connection
  useEffect(() => {
    // Connect to the WebSocket server (Fly.io in production, same host in dev)
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    const socket: TypedSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
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
    });

    // Online count
    socket.on("online_count", (count) => {
      setOnlineCount(count);
    });

    // Matchmaking events
    socket.on("matchmaking:searching", ({ position }) => {
      setMatchmaking((prev) => ({ ...prev, isSearching: true, position }));
    });

    socket.on("matchmaking:found", ({ opponent }) => {
      setMatchmaking({
        isSearching: false,
        position: 0,
        opponent,
      });
      setGameplay((prev) => ({ ...prev, status: "countdown" }));
    });

    socket.on("matchmaking:cancelled", () => {
      setMatchmaking({
        isSearching: false,
        position: 0,
        opponent: null,
      });
    });

    socket.on("matchmaking:error", (error) => {
      console.error("Matchmaking error:", error);
      setMatchmaking({
        isSearching: false,
        position: 0,
        opponent: null,
      });
    });

    // Game events
    socket.on("game:countdown", ({ seconds }) => {
      setGameplay((prev) => ({ ...prev, status: "countdown", countdown: seconds }));
    });

    socket.on("game:new_round", ({ round, problem }) => {
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

    return () => {
      socket.disconnect();
    };
  }, []);

  // Matchmaking actions
  const joinMatchmaking = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("matchmaking:join");
      setMatchmaking((prev) => ({ ...prev, isSearching: true }));
    }
  }, []);

  const leaveMatchmaking = useCallback(() => {
    if (socketRef.current) {
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

  return {
    isConnected,
    onlineCount,
    matchmaking,
    gameplay,
    joinMatchmaking,
    leaveMatchmaking,
    submitAnswer,
    forfeit,
    sendQuickChat,
    resetGame,
  };
}

