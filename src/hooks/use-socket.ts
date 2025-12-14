"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Problem,
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

type PlayerIdentity = {
  id: string;
  username: string;
  isGuest: boolean;
};

export function useSocket() {
  const { data: session } = useSession();
  const socketRef = useRef<TypedSocket | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
  
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
              setIdentity({
                id: guestData.guest.id,
                username: guestData.guest.name,
                isGuest: true,
              });
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
            setIdentity(sessionIdentity);
          } else if (data.userId && data.username) {
            setIdentity({
              id: data.userId,
              username: data.username,
              isGuest: data.isGuest === true,
            });
          }
        } else if (sessionIdentity) {
          // Still expose the signed-in identity even if socket token fetch failed.
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
      });

      socket.on("connect_error", (err) => {
        console.error("[socket] connect_error:", err?.message || err, err);
        setIsConnected(false);
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
    identity,
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

