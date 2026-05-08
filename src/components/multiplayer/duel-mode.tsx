"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Swords,
  Play,
  Users,
  Wifi,
  WifiOff,
  Trophy,
  Zap,
  Clock,
  ArrowLeft,
  Check,
  X,
  Delete,
} from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import Link from "next/link";

interface MultiplayerStats {
  wins: number;
  matches: number;
  rating: number;
  avgTime: number | null;
}

export function DuelMode({ initialPrivateRoomCode }: { initialPrivateRoomCode?: string } = {}) {
  const { data: session } = useSession();
  const {
    isConnected,
    identity,
    matchmaking,
    gameplay,
    joinMatchmaking,
    leaveMatchmaking,
    submitAnswer,
    forfeit,
    resetGame,
    privateDuel,
    createPrivateDuelRoom,
    joinPrivateDuelRoom,
    leavePrivateDuelRoom,
    startPrivateDuelGame,
    submitPrivateDuelAnswer,
    restartPrivateDuelRoom,
  } = useSocket();

  const isSignedIn = !!session?.user?.id;
  const playerId = session?.user?.id ?? identity?.id ?? null;
  const playerName = (session?.user?.name || identity?.username || "Player") as string;
  const isGuest = !isSignedIn && !!identity?.isGuest;

  const [userAnswer, setUserAnswer] = useState("");
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const inputRef = useRef<HTMLInputElement>(null);
  const problemCardRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<MultiplayerStats>({
    wins: 0,
    matches: 0,
    rating: 1000,
    avgTime: null,
  });
  const [statsLoading, setStatsLoading] = useState(!!session?.user);
  const debugFocus = process.env.NODE_ENV !== "production";
  const [isMobileDevice, setIsMobileDevice] = useState(() => {
    if (typeof navigator === "undefined") return false;

    const ua = navigator.userAgent || "";
    const platform = (navigator as unknown as { platform?: string }).platform || "";
    const maxTouchPoints = (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints || 0;

    // iPadOS 13+ often reports as Mac; this heuristic catches it.
    const isIPad = /iPad/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
    const isPhoneLike = /Android|iPhone|iPod|Windows Phone|Mobile/i.test(ua);

    const uaDataMobile =
      "userAgentData" in navigator
        ? !!(navigator as unknown as { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile
        : false;

    return uaDataMobile || isIPad || isPhoneLike;
  });

  // Private duel (link lobby) local UI state
  const [privateJoinInput, setPrivateJoinInput] = useState("");
  const [privateAnswer, setPrivateAnswer] = useState("");
  const [privateAnswerSubmitted, setPrivateAnswerSubmitted] = useState(false);
  const [privateRoundStartTime, setPrivateRoundStartTime] = useState<number>(0);
  const [privateTimeLeft, setPrivateTimeLeft] = useState(10);
  const [selectedRounds, setSelectedRounds] = useState(10);
  const [linkCopied, setLinkCopied] = useState(false);

  // Private duel custom keypad helpers
  const privateAppendDigit = (digit: string) => {
    if (privateAnswerSubmitted) return;
    if (!privateDuel.problem) return;
    setPrivateAnswer((prev) => `${prev}${digit}`.replace(/[^0-9\-]/g, ""));
  };

  const privateToggleMinus = () => {
    if (privateAnswerSubmitted) return;
    if (!privateDuel.problem) return;
    setPrivateAnswer((prev) => {
      if (prev.startsWith("-")) return prev.slice(1);
      return prev.length === 0 ? "-" : `-${prev.replace(/^-/, "")}`;
    });
  };

  const privateBackspace = () => {
    if (privateAnswerSubmitted) return;
    if (!privateDuel.problem) return;
    setPrivateAnswer((prev) => prev.slice(0, -1));
  };

  const privateClearAnswer = () => {
    if (privateAnswerSubmitted) return;
    if (!privateDuel.problem) return;
    setPrivateAnswer("");
  };

  // Auto-join private room when visiting via invite link
  // Wait for socket connection before attempting to join
  useEffect(() => {
    if (!initialPrivateRoomCode) return;
    if (!isConnected) return; // Wait for socket to be connected
    if (privateDuel.inRoom) return; // Already in a room
    
    // Small delay to ensure socket is fully ready after connection
    const timer = setTimeout(() => {
      joinPrivateDuelRoom(initialPrivateRoomCode);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [initialPrivateRoomCode, isConnected, privateDuel.inRoom, joinPrivateDuelRoom]);

  const extractRoomCode = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    // Accept either a plain code or a full URL (take last path segment)
    const parts = trimmed.split("/").filter(Boolean);
    const candidate = (parts[parts.length - 1] || trimmed).toUpperCase();
    return candidate.replace(/[^A-Z0-9]/g, "");
  };

  useEffect(() => {
    // Keep detection fresh in cases where UA/client hints become available after hydration.
    if (typeof navigator === "undefined") return;
    setIsMobileDevice((prev) => {
      const ua = navigator.userAgent || "";
      const platform = (navigator as unknown as { platform?: string }).platform || "";
      const maxTouchPoints = (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints || 0;
      const isIPad = /iPad/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
      const isPhoneLike = /Android|iPhone|iPod|Windows Phone|Mobile/i.test(ua);
      const uaDataMobile =
        "userAgentData" in navigator
          ? !!(navigator as unknown as { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile
          : false;
      const next = uaDataMobile || isIPad || isPhoneLike;
      return next === prev ? prev : next;
    });
  }, []);

  const appendDigit = (digit: string) => {
    if (answerSubmitted) return;
    if (gameplay.status !== "playing") return;
    setUserAnswer((prev) => `${prev}${digit}`.replace(/[^0-9\-]/g, ""));
  };

  const toggleMinus = () => {
    if (answerSubmitted) return;
    if (gameplay.status !== "playing") return;
    setUserAnswer((prev) => {
      if (prev.startsWith("-")) return prev.slice(1);
      return prev.length === 0 ? "-" : `-${prev.replace(/^-/, "")}`;
    });
  };

  const backspace = () => {
    if (answerSubmitted) return;
    if (gameplay.status !== "playing") return;
    setUserAnswer((prev) => prev.slice(0, -1));
  };

  const clearAnswer = () => {
    if (answerSubmitted) return;
    if (gameplay.status !== "playing") return;
    setUserAnswer("");
  };

  type FocusMeta = {
    reason: string;
    status?: string;
    round?: number;
    countdown?: number;
    problemId?: string | null;
    isSearching?: boolean;
    hasOpponent?: boolean;
    isGameActive?: boolean;
    isLobby?: boolean;
  };

  type FocusOptions = FocusMeta & { immediate?: boolean };

  const focusInput = useRef((meta?: FocusOptions) => {
    const attempt = (phase: "sync" | "raf" | "timeout") => {
      const node = inputRef.current;

      if (debugFocus) {
        console.log("[duel focus] attempt", {
          phase,
          reason: meta?.reason,
          status: meta?.status,
          round: meta?.round,
          countdown: meta?.countdown,
          problemId: meta?.problemId,
          isSearching: meta?.isSearching,
          hasOpponent: meta?.hasOpponent,
          isGameActive: meta?.isGameActive,
          isLobby: meta?.isLobby,
          nodeExists: !!node,
          isVisible: node ? node.offsetParent !== null : false,
          activeTag: typeof document !== "undefined" ? document.activeElement?.tagName : undefined,
        });
      }

      if (!node) return;

      try {
        // iOS Safari is picky: focus needs to be called synchronously during a user gesture
        // to reliably open the keyboard. We still keep async fallbacks for other cases.
        node.focus({ preventScroll: true });
      } catch {
        node.focus();
      }

      const valueLength = node.value.length;
      try {
        node.setSelectionRange(valueLength, valueLength);
      } catch {
        // ignore (e.g. input types that don't support selection)
      }

      const isVisible = node.offsetParent !== null;
      if (debugFocus) {
        console.log("[duel focus] result", {
          phase,
          reason: meta?.reason,
          active: typeof document !== "undefined" ? document.activeElement === node : false,
          isVisible,
          valueLength: node.value.length,
        });
      }

      const shouldScroll =
        isVisible && !!meta?.isGameActive && meta?.status !== "countdown" && !meta?.isLobby && !meta?.isSearching;
      if (shouldScroll) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    // If called from a click/tap handler, do a synchronous attempt first so iOS can open the keyboard.
    if (meta?.immediate) {
      attempt("sync");
    }

    requestAnimationFrame(() => {
      attempt("raf");

      const isSmall = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
      if (isSmall) {
        setTimeout(() => {
          const node = inputRef.current;
          if (node && typeof document !== "undefined" && document.activeElement !== node) {
            attempt("timeout");
          }
        }, 30);
      }
    });
  }).current;


  const isSearching = matchmaking.isSearching;
  const hasOpponent = !!matchmaking.opponent;
  const isMatchFound = hasOpponent && gameplay.status === "idle";
  const isGameActive = gameplay.status === "playing" || gameplay.status === "round_end" || gameplay.status === "countdown";
  const isLobby = !isSearching && !isMatchFound && !isGameActive;
  const privateProblemId = privateDuel.problem?.id;
  const useCustomKeypad = isMobileDevice;
  const showCustomKeypad = isGameActive && useCustomKeypad;
  const [searchHeading, setSearchHeading] = useState("Finding opponent...");
  const [searchDetail, setSearchDetail] = useState("Matching you with a player of similar skill");

  useEffect(() => {
    // After 4s of searching, update the copy to reassure the player.
    if (!isSearching) {
      setSearchHeading("Finding opponent...");
      setSearchDetail("Matching you with a player of similar skill");
      return;
    }

    setSearchHeading("Finding opponent...");
    setSearchDetail("Matching you with a player of similar skill");

    const timer = setTimeout(() => {
      setSearchHeading("Still looking for an opponent...");
      setSearchDetail("This is taking a bit longer than usual");
    }, 4000);

    return () => clearTimeout(timer);
  }, [isSearching]);

  useEffect(() => {
    if (!debugFocus) return;
    console.log("[duel focus] state-change", {
      status: gameplay.status,
      countdown: gameplay.countdown,
      currentRound: gameplay.currentRound,
      problemId: gameplay.problem?.id,
      isSearching,
      hasOpponent,
      isMatchFound,
      isGameActive,
      isLobby,
    });
  }, [
    debugFocus,
    gameplay.countdown,
    gameplay.currentRound,
    gameplay.problem?.id,
    gameplay.status,
    hasOpponent,
    isGameActive,
    isLobby,
    isMatchFound,
    isSearching,
  ]);

  // Fetch user's multiplayer stats
  useEffect(() => {
    if (!session?.user) return;
    
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/user/multiplayer-stats");
        const data = await res.json();
        if (!data.error) {
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch multiplayer stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchStats();
  }, [session?.user]);

  // Refetch stats when game ends
  useEffect(() => {
    if (gameplay.status !== "game_over" || !session?.user) return;
    
    // Delay slightly to allow server to update database
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch("/api/user/multiplayer-stats");
        const data = await res.json();
        if (!data.error) {
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to refetch multiplayer stats:", err);
      }
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [gameplay.status, session?.user]);

  // Reset answer when new round starts
  useEffect(() => {
    if (gameplay.status === "playing" && gameplay.problem) {
      setUserAnswer("");
      setAnswerSubmitted(false);
      setRoundStartTime(Date.now());
      setTimeLeft(10);
      focusInput({
        reason: "new-round",
        status: gameplay.status,
        round: gameplay.currentRound,
        countdown: gameplay.countdown,
        problemId: gameplay.problem?.id,
        isSearching,
        hasOpponent,
        isGameActive,
        isLobby,
      });
      
      // Scroll problem card into view on mobile
      if (useCustomKeypad && problemCardRef.current) {
        requestAnimationFrame(() => {
          problemCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
    }
  }, [gameplay.status, gameplay.problem, focusInput, gameplay.currentRound, gameplay.countdown, hasOpponent, isGameActive, isLobby, isSearching, useCustomKeypad]);

  // Private duel: reset answer + local timer when a new problem arrives
  useEffect(() => {
    if (!privateProblemId) return;
    setPrivateAnswer("");
    setPrivateAnswerSubmitted(false);
    setPrivateRoundStartTime(Date.now());
    setPrivateTimeLeft(10);
  }, [privateProblemId]);

  // Keep the answer box focused while playing (helps after clicks elsewhere)
  useEffect(() => {
    if (gameplay.status === "playing" && !answerSubmitted) {
      focusInput({
        reason: "keep-playing-focus",
        status: gameplay.status,
        round: gameplay.currentRound,
        countdown: gameplay.countdown,
        problemId: gameplay.problem?.id,
        isSearching,
        hasOpponent,
        isGameActive,
        isLobby,
      });
    }
  }, [
    gameplay.status,
    answerSubmitted,
    focusInput,
    gameplay.currentRound,
    gameplay.countdown,
    gameplay.problem?.id,
    hasOpponent,
    isGameActive,
    isLobby,
    isSearching,
  ]);

  // Countdown timer for current round
  useEffect(() => {
    if (gameplay.status !== "playing") return;

    const timer = setInterval(() => {
      const elapsed = (Date.now() - roundStartTime) / 1000;
      const remaining = Math.max(0, 10 - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [gameplay.status, roundStartTime]);

  // Private duel timer
  useEffect(() => {
    if (!privateProblemId) return;
    if (privateDuel.roundResults) return; // stop ticking during results overlay

    const timer = setInterval(() => {
      const elapsed = (Date.now() - privateRoundStartTime) / 1000;
      const remaining = Math.max(0, 10 - elapsed);
      setPrivateTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 100);

    return () => clearInterval(timer);
  }, [privateProblemId, privateDuel.roundResults, privateRoundStartTime]);

  const handleStartSearch = () => {
    // Focus input immediately on user interaction to ensure keyboard opens on mobile
    focusInput({
      reason: "start-search",
      immediate: true,
      status: gameplay.status,
      round: gameplay.currentRound,
      countdown: gameplay.countdown,
      problemId: gameplay.problem?.id,
      isSearching,
      hasOpponent,
      isGameActive,
      isLobby,
    });
    joinMatchmaking();
  };

  const handleCancelSearch = () => {
    leaveMatchmaking();
  };

  const submitCurrentAnswer = () => {
    if (!gameplay.problem || answerSubmitted) return;

    const answer = parseInt(userAnswer);
    if (isNaN(answer)) return;

    const timeMs = Date.now() - roundStartTime;
    submitAnswer(answer, timeMs);
    setAnswerSubmitted(true);
  };

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    submitCurrentAnswer();
  };

  const handleForfeit = () => {
    forfeit();
    resetGame();
  };

  const handlePlayAgain = () => {
    resetGame();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Wait for either a signed-in session or a guest identity.
  if (!playerId) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show loading state when user is joining via invite link
  if (initialPrivateRoomCode && !privateDuel.inRoom) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex flex-col">
        <div className="border-b border-border">
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold">Joining Room</h1>
              <p className="text-sm text-muted-foreground">
                Room code: <span className="font-mono">{initialPrivateRoomCode.toUpperCase()}</span>
              </p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3 mr-1.5 text-success" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1.5 text-destructive" />
                  Connecting...
                </>
              )}
            </Badge>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            {privateDuel.error ? (
              <>
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                  <X className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Unable to Join Room</h2>
                <p className="text-sm text-muted-foreground mb-6">{privateDuel.error}</p>
                <Link href="/multiplayer">
                  <Button>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Multiplayer
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-border border-t-foreground animate-spin" />
                <h2 className="text-lg font-semibold mb-2">
                  {isConnected ? "Joining room..." : "Connecting..."}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isConnected 
                    ? "Please wait while we connect you to the room" 
                    : "Establishing connection to the game server"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // PRIVATE DUEL (LINK LOBBY) FLOW
  // ============================================
  if (privateDuel.inRoom && privateDuel.room) {
    const room = privateDuel.room;
    const players = room.players;
    const scores = privateDuel.scores;
    const leaderboard = [...players]
      .map((p) => ({ ...p, score: scores[p.id] ?? 0 }))
      .sort((a, b) => b.score - a.score);

    const copyLink = async () => {
      const link =
        privateDuel.joinUrl ||
        (typeof window !== "undefined" ? `${window.location.origin}/multiplayer/private/duel/${room.roomCode}` : "");
      try {
        await navigator.clipboard.writeText(link);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      } catch {
        // ignore
      }
    };

    // Private Duel Game Over
    if (privateDuel.gameOver) {
      const isWinner = privateDuel.gameOver.winnerId === playerId;
      const myScore = privateDuel.gameOver.finalScores[playerId] ?? 0;
      return (
        <div className="min-h-[calc(100vh-200px)]">
          <div className="border-b border-border">
            <div className="px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between gap-2">
              <h1 className="text-base sm:text-lg font-semibold">Game Complete</h1>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 sm:h-9 sm:px-4"
                onClick={() => {
                  leavePrivateDuelRoom();
                  resetGame();
                }}
              >
                Leave
              </Button>
            </div>
          </div>
          <div className="p-3 sm:p-4 md:p-6">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-4 sm:p-6 md:p-8">
                {/* Result Header */}
                <div className="text-center mb-4 sm:mb-6">
                  <div className={`inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full mb-3 ${
                    isWinner ? "bg-success/20" : "bg-muted"
                  }`}>
                    <Trophy className={`w-7 h-7 sm:w-8 sm:h-8 ${isWinner ? "text-success" : "text-muted-foreground"}`} />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold mb-1">{isWinner ? "You Won!" : "Game Over"}</div>
                  <div className="text-sm text-muted-foreground">Your score: <span className="font-mono font-semibold">{myScore}</span></div>
                </div>

                {/* Leaderboard */}
                <div className="space-y-1.5 sm:space-y-2">
                  {privateDuel.gameOver.leaderboard.map((p, idx) => (
                    <div
                      key={p.playerId}
                      className={`flex items-center justify-between rounded-lg border px-2.5 sm:px-3 py-2 ${
                        p.playerId === playerId ? "bg-primary/10 border-primary/30" : "bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <span className={`w-5 sm:w-6 text-xs sm:text-sm font-mono shrink-0 ${
                          idx === 0 ? "text-amber-500 font-bold" : "text-muted-foreground"
                        }`}>
                          {idx + 1}.
                        </span>
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                          <AvatarFallback className="text-xs sm:text-sm">{getInitials(p.username)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">
                          {p.playerId === playerId ? "You" : p.username}
                        </span>
                        {idx === 0 && (
                          <Trophy className="w-4 h-4 text-amber-500 shrink-0 hidden xs:block" />
                        )}
                      </div>
                      <span className="font-mono font-bold text-sm sm:text-base">{p.score}</span>
                    </div>
                  ))}
                </div>

                {/* Play Again button for host */}
                {privateDuel.youAreHost && (
                  <div className="mt-4 sm:mt-6 pt-4 border-t border-border">
                    <Button
                      onClick={restartPrivateDuelRoom}
                      className="w-full h-11 sm:h-10"
                      size="lg"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play Again
                    </Button>
                    <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-2">
                      Return to lobby to adjust settings
                    </p>
                  </div>
                )}

                {/* Non-host waiting message */}
                {!privateDuel.youAreHost && (
                  <div className="mt-4 sm:mt-6 pt-4 border-t border-border text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs sm:text-sm">
                        Waiting for host to start new game...
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    const isInRound = !!privateDuel.problem;

    // Private Duel Lobby
    if (!isInRound) {
      return (
        <div className="min-h-[calc(100vh-200px)]">
          {/* Header */}
          <div className="border-b border-border">
            <div className="px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-semibold">Private Room</h1>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{room.roomCode}</span>
                  <span className="hidden xs:inline">•</span>
                  <span>{players.length}/{room.maxPlayers} players</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Connection status - icon only on mobile */}
                {isConnected ? (
                  <div className="w-7 h-7 sm:hidden rounded-full bg-success/10 flex items-center justify-center">
                    <Wifi className="w-3.5 h-3.5 text-success" />
                  </div>
                ) : (
                  <div className="w-7 h-7 sm:hidden rounded-full bg-amber-500/10 flex items-center justify-center">
                    <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  </div>
                )}
                <Badge variant="outline" className="text-xs hidden sm:flex">
                  {isConnected ? (
                    <>
                      <Wifi className="w-3 h-3 mr-1.5 text-success" />
                      Connected
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 mr-1.5 text-amber-500" />
                      Reconnecting
                    </>
                  )}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 sm:h-9 sm:px-4"
                  onClick={() => {
                    leavePrivateDuelRoom();
                    resetGame();
                  }}
                >
                  Leave
                </Button>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 md:p-6">
            <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
              {/* Connection status banner - only show on mobile when disconnected */}
              {!isConnected && (
                <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs sm:text-sm flex items-center gap-2 sm:hidden">
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                  Reconnecting... Don&apos;t close this tab.
                </div>
              )}
              {privateDuel.error && privateDuel.error !== "Reconnecting..." && (
                <div className="p-2.5 sm:p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs sm:text-sm">
                  {privateDuel.error}
                </div>
              )}

              {/* Invite Section */}
              <Card>
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="mb-4">
                    <p className="text-xs sm:text-sm font-medium mb-2">Share this link to invite friends</p>
                    {/* Mobile: Show room code prominently with copy button */}
                    <div className="flex sm:hidden items-center gap-2">
                      <div className="flex-1 bg-muted rounded-lg px-4 py-3 text-center border">
                        <p className="text-xs text-muted-foreground mb-0.5">Room Code</p>
                        <p className="text-2xl font-mono font-bold tracking-wider">{room.roomCode}</p>
                      </div>
                      <Button
                        onClick={copyLink}
                        variant={linkCopied ? "secondary" : "default"}
                        className="h-full aspect-square shrink-0 transition-all duration-200 active:scale-95"
                      >
                        <div className="relative w-5 h-5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`absolute inset-0 transition-all duration-200 ${
                              linkCopied ? "opacity-0 scale-50" : "opacity-100 scale-100"
                            }`}
                          >
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                          <Check
                            className={`absolute inset-0 w-5 h-5 text-success transition-all duration-200 ${
                              linkCopied ? "opacity-100 scale-100" : "opacity-0 scale-50"
                            }`}
                          />
                        </div>
                      </Button>
                    </div>
                    {/* Desktop: Show full URL */}
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-md px-3 py-2 font-mono text-sm truncate border">
                        {privateDuel.joinUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/multiplayer/private/duel/${room.roomCode}`}
                      </div>
                      <Button
                        onClick={copyLink}
                        variant={linkCopied ? "secondary" : "default"}
                        size="icon"
                        className="shrink-0 transition-all duration-200 active:scale-90"
                      >
                        <div className="relative w-4 h-4">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`absolute inset-0 transition-all duration-200 ${
                              linkCopied ? "opacity-0 scale-50" : "opacity-100 scale-100"
                            }`}
                          >
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                          <Check
                            className={`absolute inset-0 w-4 h-4 text-success transition-all duration-200 ${
                              linkCopied ? "opacity-100 scale-100" : "opacity-0 scale-50"
                            }`}
                          />
                        </div>
                      </Button>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 text-center sm:text-left">
                      {linkCopied ? "Link copied! Share it with friends." : `Up to ${room.maxPlayers} players can join`}
                    </p>
                  </div>

                  {/* Players List */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
                      Players ({players.length})
                    </p>
                    {players.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border px-2.5 sm:px-3 py-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                            <AvatarFallback className="text-xs sm:text-sm">{getInitials(p.username)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="font-medium text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">
                                {p.id === playerId ? "You" : p.username}
                              </span>
                              {p.id === room.hostId && (
                                <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
                                  Host
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {p.isGuest ? "Guest" : `Rating ${p.rating}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Waiting for players indicator */}
                    {players.length < 2 && (
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-muted-foreground">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs sm:text-sm">Waiting for more players...</span>
                      </div>
                    )}
                  </div>

                  {/* Game Controls */}
                  {privateDuel.countdown > 0 ? (
                    <div className="mt-4 sm:mt-6 text-center">
                      <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span className="font-semibold">Starting in {privateDuel.countdown}...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                      {privateDuel.youAreHost && (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                          <label className="text-xs sm:text-sm font-medium">Number of Rounds</label>
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            {[5, 10, 15, 20].map((count) => (
                              <Button
                                key={count}
                                type="button"
                                variant={selectedRounds === count ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedRounds(count)}
                                className="flex-1 sm:flex-none sm:w-11 h-9 text-sm"
                              >
                                {count}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {privateDuel.youAreHost ? (
                        <Button
                          onClick={() => startPrivateDuelGame(selectedRounds)}
                          disabled={players.length < 2}
                          className="w-full h-11 sm:h-10 text-sm sm:text-base"
                          size="lg"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Game ({selectedRounds} rounds)
                        </Button>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Waiting for the host to start the game...
                          </p>
                        </div>
                      )}
                      
                      {players.length < 2 && privateDuel.youAreHost && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                          Need at least 2 players to start
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
    }

    // Private Duel In-Game
    const submitPrivate = () => {
      if (!privateDuel.problem) return;
      if (privateAnswerSubmitted) return;
      const answer = parseInt(privateAnswer);
      if (isNaN(answer)) return;
      const timeMs = Date.now() - privateRoundStartTime;
      submitPrivateDuelAnswer(answer, timeMs);
      setPrivateAnswerSubmitted(true);
    };

    const sortedRoundResults = privateDuel.roundResults
      ? [...privateDuel.roundResults].sort((a, b) => {
          const ar = a.rank ?? 999;
          const br = b.rank ?? 999;
          if (ar !== br) return ar - br;
          return (a.timeMs ?? 999999) - (b.timeMs ?? 999999);
        })
      : null;

    return (
      <div className="min-h-[calc(100vh-200px)]">
        {/* In-Game Header */}
        <div className="border-b border-border">
          <div className="px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Mobile: Compact single line */}
              <div className="flex sm:hidden items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Round <span className="font-mono font-semibold text-foreground">{privateDuel.currentRound}/{privateDuel.totalRounds}</span>
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{room.roomCode}</span>
              </div>
              {/* Desktop: Two lines */}
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold">Private Duel</h1>
                <p className="text-sm text-muted-foreground">
                  Round {privateDuel.currentRound} / {privateDuel.totalRounds} • Code <span className="font-mono">{room.roomCode}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {!isConnected && (
                <Badge variant="outline" className="text-[10px] sm:text-xs border-amber-500/50 text-amber-600 dark:text-amber-400 px-1.5 sm:px-2">
                  <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                  <span className="hidden xs:inline">Reconnecting</span>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 sm:h-9 sm:px-3 text-xs sm:text-sm"
                onClick={() => {
                  leavePrivateDuelRoom();
                  resetGame();
                }}
              >
                Leave
              </Button>
            </div>
          </div>
        </div>

        <div className={`p-3 sm:p-4 md:p-6 ${isMobileDevice && privateDuel.problem && !sortedRoundResults ? "pb-[calc(env(safe-area-inset-bottom,0.5rem)+260px)]" : ""}`}>
          <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
            {/* Connection status banner - only show on mobile when disconnected */}
            {!isConnected && (
              <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2 sm:hidden">
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                Reconnecting... Don&apos;t close this tab.
              </div>
            )}
            {privateDuel.error && privateDuel.error !== "Reconnecting..." && (
              <div className="p-2.5 sm:p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs sm:text-sm">
                {privateDuel.error}
              </div>
            )}

            {/* Round Results Screen - replaces problem/leaderboard when round ends */}
            {sortedRoundResults ? (
              <Card className="border-primary/30">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="text-center mb-3 sm:mb-4">
                    <div className="text-xs sm:text-sm text-muted-foreground">Correct answer</div>
                    <div className="text-2xl sm:text-3xl font-mono font-bold">{privateDuel.lastCorrectAnswer ?? "—"}</div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-5">
                    {sortedRoundResults.map((r) => (
                      <div key={r.playerId} className="flex items-center justify-between rounded-md border px-2 sm:px-3 py-1.5 sm:py-2 gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="font-medium text-sm sm:text-base truncate max-w-[80px] sm:max-w-none">
                              {r.playerId === playerId ? "You" : r.username}
                            </span>
                            {r.isCorrect ? (
                              <Badge className="bg-success/20 text-success text-[10px] sm:text-xs px-1.5 py-0">✓</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">✗</Badge>
                            )}
                            {r.rank !== null && (
                              <Badge variant="outline" className="font-mono text-[10px] sm:text-xs px-1 py-0">
                                #{r.rank}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">
                            {r.timeMs !== null ? `${(r.timeMs / 1000).toFixed(2)}s` : "—"} • +{r.pointsAwarded}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-sm sm:text-base shrink-0">{r.totalScore}</div>
                      </div>
                    ))}
                  </div>

                  {/* Current Standings */}
                  <div className="border-t border-border pt-3 sm:pt-4">
                    <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">Current Standings</div>
                    <div className="space-y-1 sm:space-y-1.5">
                      {[...sortedRoundResults]
                        .sort((a, b) => b.totalScore - a.totalScore)
                        .map((r, idx) => {
                          const isLeader = idx === 0;
                          const isYou = r.playerId === playerId;
                          return (
                            <div
                              key={r.playerId}
                              className={`flex items-center justify-between rounded-md px-2 sm:px-3 py-1.5 sm:py-2 ${
                                isYou ? "bg-primary/10 border border-primary/30" : "bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <span className={`w-5 sm:w-6 text-xs sm:text-sm font-mono ${isLeader ? "text-amber-500 font-bold" : "text-muted-foreground"}`}>
                                  {idx + 1}.
                                </span>
                                <Avatar className="h-6 w-6 sm:h-7 sm:w-7 shrink-0">
                                  <AvatarFallback className="text-[10px] sm:text-xs">{getInitials(r.username)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium truncate text-xs sm:text-sm max-w-[80px] sm:max-w-none">
                                  {isYou ? "You" : r.username}
                                </span>
                                {isLeader && (
                                  <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
                                )}
                              </div>
                              <span className="font-mono font-bold text-sm sm:text-base">{r.totalScore}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-3 sm:mt-4">
                    Next round starting soon...
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Problem Card */}
                <Card>
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="text-xs sm:text-sm text-muted-foreground">Time left</div>
                      <div className={`font-mono font-semibold text-sm sm:text-base ${privateTimeLeft <= 3 ? "text-destructive animate-pulse" : ""}`}>
                        {privateTimeLeft.toFixed(1)}s
                      </div>
                    </div>
                    <Progress value={(privateTimeLeft / 10) * 100} className="h-1" />

                    <div className="text-center mt-4 sm:mt-5">
                      <div className="text-3xl sm:text-5xl md:text-6xl font-mono font-semibold mb-3 sm:mb-4">
                        {privateDuel.problem ? `${privateDuel.problem.a} ${privateDuel.problem.operation} ${privateDuel.problem.b}` : "..."}
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitPrivate();
                        }}
                        className="flex items-center justify-center gap-2 max-w-[280px] mx-auto"
                      >
                        {isMobileDevice ? (
                          <div className="w-full">
                            <div
                              role="textbox"
                              aria-label="Answer"
                              aria-readonly="true"
                              className={`h-12 text-center text-xl font-mono tabular-nums w-full rounded-md border bg-background px-3 flex items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap ${
                                privateAnswerSubmitted ? "border-success text-success" : "border-input"
                              }`}
                            >
                              {privateAnswer.length > 0 ? privateAnswer : "?"}
                            </div>
                          </div>
                        ) : (
                          <Input
                            value={privateAnswer}
                            onChange={(e) => {
                              if (privateAnswerSubmitted) return;
                              setPrivateAnswer(e.target.value.replace(/[^0-9\-]/g, ""));
                            }}
                            placeholder="?"
                            className="h-12 sm:h-14 text-center text-xl sm:text-2xl font-mono w-full max-w-[220px]"
                            inputMode="decimal"
                            autoComplete="off"
                            autoFocus
                          />
                        )}
                        {!isMobileDevice && (
                          <Button
                            type="submit"
                            disabled={
                              privateAnswerSubmitted ||
                              privateTimeLeft <= 0 ||
                              privateAnswer.length === 0 ||
                              privateAnswer === "-"
                            }
                          >
                            Submit
                          </Button>
                        )}
                      </form>
                      {privateAnswerSubmitted && (
                        <p className="text-xs sm:text-sm text-success mt-2 sm:mt-3 flex items-center justify-center gap-1.5 sm:gap-2">
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Answer submitted!
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Leaderboard */}
                <Card>
                  <CardHeader className="py-2 sm:py-4 px-3 sm:px-6">
                    <CardTitle className="text-xs sm:text-sm font-medium">Leaderboard</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 sm:space-y-2 px-3 sm:px-6 pb-3 sm:pb-6">
                    {leaderboard.map((p, idx) => (
                      <div key={p.id} className="flex items-center justify-between rounded-md border px-2 sm:px-3 py-1.5 sm:py-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <span className={`w-5 sm:w-6 text-xs sm:text-sm font-mono ${idx === 0 ? "text-amber-500 font-bold" : "text-muted-foreground"}`}>
                            {idx + 1}.
                          </span>
                          <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
                            <AvatarFallback className="text-[10px] sm:text-sm">{getInitials(p.username)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-xs sm:text-base truncate max-w-[80px] sm:max-w-none">
                            {p.id === playerId ? "You" : p.username}
                          </span>
                          {idx === 0 && (
                            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0 hidden xs:block" />
                          )}
                        </div>
                        <span className="font-mono font-bold text-sm sm:text-base">{p.score}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Mobile custom keypad for private duel */}
        {isMobileDevice && privateDuel.problem && !sortedRoundResults && (
          <div className="fixed left-0 right-0 bottom-0 z-50">
            <div className="border-t border-border bg-background">
              <div className="max-w-md mx-auto px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0.5rem)+8px)]">
                <div className="flex items-center justify-center pb-2">
                  <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
                </div>

                <div className="grid grid-cols-3 gap-2 select-none touch-manipulation">
                  {["1","2","3","4","5","6","7","8","9"].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant="secondary"
                      className="h-12 rounded-xl text-xl font-semibold active:scale-[0.98] transition"
                      onClick={() => privateAppendDigit(d)}
                      disabled={privateAnswerSubmitted || !privateDuel.problem}
                    >
                      {d}
                    </Button>
                  ))}

                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 rounded-xl text-xl font-semibold active:scale-[0.98] transition"
                    onClick={privateToggleMinus}
                    disabled={privateAnswerSubmitted || !privateDuel.problem}
                    aria-label="Toggle negative sign"
                  >
                    −
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 rounded-xl text-xl font-semibold active:scale-[0.98] transition"
                    onClick={() => privateAppendDigit("0")}
                    disabled={privateAnswerSubmitted || !privateDuel.problem}
                  >
                    0
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 rounded-xl active:scale-[0.98] transition"
                    onClick={privateBackspace}
                    disabled={privateAnswerSubmitted || !privateDuel.problem}
                    aria-label="Backspace"
                  >
                    <Delete className="h-5 w-5 opacity-80" />
                  </Button>

                  <Button
                    type="button"
                    className="h-11 rounded-xl text-sm font-semibold col-span-2 active:scale-[0.99] transition"
                    onClick={submitPrivate}
                    disabled={
                      privateAnswerSubmitted ||
                      !privateDuel.problem ||
                      privateAnswer.length === 0 ||
                      privateAnswer === "-"
                    }
                  >
                    Done
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 rounded-xl text-sm font-semibold active:scale-[0.99] transition"
                    onClick={privateClearAnswer}
                    disabled={privateAnswerSubmitted || !privateDuel.problem}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Game Over Screen (Kept separate as it terminates the flow)
  if (gameplay.status === "game_over" && gameplay.gameResult) {
    const isWinner = gameplay.gameResult.winnerId === playerId;
    const isDraw = gameplay.gameResult.winnerId === null;
    const myScore = gameplay.gameResult.finalScores[playerId] || 0;
    const opponentScore = matchmaking.opponent
      ? gameplay.gameResult.finalScores[matchmaking.opponent.id] || 0
      : 0;

    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="border-b border-border">
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            <h1 className="text-lg font-semibold">Match Complete</h1>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-8 text-center">
              <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
                isDraw 
                  ? "bg-secondary" 
                  : isWinner 
                  ? "bg-success/20" 
                  : "bg-destructive/20"
              }`}>
                {isDraw ? (
                  <Zap className="w-10 h-10 text-muted-foreground" />
                ) : isWinner ? (
                  <Trophy className="w-10 h-10 text-success" />
                ) : (
                  <X className="w-10 h-10 text-destructive" />
                )}
              </div>

              <h2 className="text-2xl font-bold mb-2">
                {isDraw ? "It's a Draw!" : isWinner ? "You Won!" : "You Lost"}
              </h2>

              <div className="flex items-center justify-center gap-8 my-8">
                <div className="text-center">
                  <Avatar className="h-14 w-14 mx-auto mb-2">
                    <AvatarFallback>{getInitials(playerName)}</AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{playerName}</p>
                  <p className="text-3xl font-mono font-bold mt-2">{myScore}</p>
                </div>
                <span className="text-xl font-bold text-muted-foreground">VS</span>
                <div className="text-center">
                  <Avatar className="h-14 w-14 mx-auto mb-2">
                    <AvatarFallback>
                      {matchmaking.opponent ? getInitials(matchmaking.opponent.username) : "OP"}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{matchmaking.opponent?.username || "Opponent"}</p>
                  <p className="text-3xl font-mono font-bold mt-2">{opponentScore}</p>
                </div>
              </div>

              {isSignedIn && gameplay.gameResult.ratingChange !== 0 ? (
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8 ${
                  gameplay.gameResult.ratingChange >= 0
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {gameplay.gameResult.ratingChange >= 0 ? "+" : ""}
                  {gameplay.gameResult.ratingChange} Rating
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8 bg-secondary/50 text-muted-foreground">
                  Unrated match
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button onClick={handlePlayAgain} size="lg">
                  <Play className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
                <Button variant="outline" onClick={handlePlayAgain} size="lg">
                  Back to Lobby
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Determines state
  // Main Render - Layered Approach to persist Input
  return (
    <div className="min-h-[calc(100vh-200px)] relative w-full overflow-x-hidden">
      
      {/* GAME VIEW LAYER 
          Always rendered if game is active, OR if we want the input available in background.
          We render it 'hidden' (opacity-0) when in Lobby/Searching/MatchFound to keep Input mounted.
      */}
      <div className={`transition-opacity duration-200 ${isGameActive ? "opacity-100 relative z-10" : "opacity-0 absolute top-0 left-0 w-full -z-10 h-full overflow-hidden"}`}>
        {/* Desktop header - full size */}
        <div className="hidden sm:block border-b border-border">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Match in Progress</h1>
              <p className="text-sm text-muted-foreground">
                Round {gameplay.currentRound} of 10
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleForfeit} className={isGameActive ? "" : "pointer-events-none"}>
              Forfeit
            </Button>
          </div>
        </div>
        {/* Mobile header - minimal */}
        <div className="sm:hidden border-b border-border">
          <div className="px-3 py-1 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Round {gameplay.currentRound}/10</p>
            <Button variant="ghost" size="sm" onClick={handleForfeit} className={isGameActive ? "h-7 px-2 text-xs" : "pointer-events-none h-7 px-2 text-xs"}>
              Forfeit
            </Button>
          </div>
        </div>

        <div
          className={`p-2 sm:p-4 md:p-6 ${
            showCustomKeypad ? "pb-[calc(env(safe-area-inset-bottom,0.5rem)+260px)]" : "pb-[env(safe-area-inset-bottom,0.5rem)]"
          }`}
        >
          <div className="max-w-2xl mx-auto space-y-3 sm:space-y-6">
            {/* Countdown Overlay */}
            {gameplay.status === "countdown" && gameplay.countdown > 0 && (
              <Card className="border-2 border-foreground relative z-20">
                <CardContent className="p-6 sm:p-12 text-center">
                  <p className="text-muted-foreground mb-2 sm:mb-4">Get Ready!</p>
                  <p className="text-6xl sm:text-8xl font-mono font-bold">{gameplay.countdown}</p>
                </CardContent>
              </Card>
            )}

            {/* Score Header */}
            {gameplay.status !== "countdown" && (
              <>
                <Card>
                  <CardContent className="py-1 px-2 sm:p-4">
                    {/* Mobile: ultra-compact single-row status bar */}
                    <div className="sm:hidden flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback className="text-[10px] leading-none">
                            {getInitials(playerName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-lg font-mono font-bold leading-none tabular-nums">
                          {gameplay.scores[playerId] || 0}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                          R {gameplay.currentRound}/10
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-mono font-semibold tabular-nums ${
                            timeLeft <= 3
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {timeLeft.toFixed(1)}s
                        </span>
                      </div>

                      <div className="flex items-center gap-2 min-w-0 justify-end">
                        {gameplay.opponentAnswered && (
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success shrink-0"
                            aria-label="Opponent answered"
                            title="Opponent answered"
                          >
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <span className="text-lg font-mono font-bold leading-none tabular-nums">
                          {matchmaking.opponent ? gameplay.scores[matchmaking.opponent.id] || 0 : 0}
                        </span>
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback className="text-[10px] leading-none">
                            {matchmaking.opponent ? getInitials(matchmaking.opponent.username) : "OP"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    {/* Desktop: original horizontal layout */}
                    <div className="hidden sm:flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{getInitials(playerName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{playerName}</p>
                          <p className="text-xs text-muted-foreground">Your score</p>
                        </div>
                        <span className="text-3xl font-mono font-bold ml-4">
                          {gameplay.scores[playerId] || 0}
                        </span>
                      </div>

                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Round {gameplay.currentRound}/10</p>
                        <p className={`text-xl font-mono ${timeLeft <= 3 ? "text-destructive" : ""}`}>
                          {timeLeft.toFixed(1)}s
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-mono font-bold mr-4">
                          {matchmaking.opponent ? gameplay.scores[matchmaking.opponent.id] || 0 : 0}
                        </span>
                        <div className="text-right">
                          <p className="font-medium">{matchmaking.opponent?.username || "Opponent"}</p>
                          <p className="text-xs text-muted-foreground">
                            {gameplay.opponentAnswered ? (
                              <span className="text-success flex items-center gap-1 justify-end">
                                <Check className="w-3 h-3" /> Answered
                              </span>
                            ) : (
                              "Thinking..."
                            )}
                          </p>
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {matchmaking.opponent ? getInitials(matchmaking.opponent.username) : "OP"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timer Progress */}
                <Progress value={(timeLeft / 10) * 100} className="h-1" />

                {/* Problem Display - Always rendered to maintain Input focus */}
                <div
                  ref={problemCardRef}
                  className="relative"
                  onPointerDownCapture={() => {
                    // iOS Safari often blocks programmatic focus (and thus keyboard)
                    // unless it's triggered from a user gesture. Any tap on the problem
                    // card should re-focus the input and open the keypad.
                    if (gameplay.status !== "playing" || answerSubmitted) return;
                    const node = inputRef.current;
                    if (!node) return;
                    if (typeof document !== "undefined" && document.activeElement === node) return;

                    focusInput({
                      reason: "problem-pointerdown",
                      immediate: true,
                      status: gameplay.status,
                      round: gameplay.currentRound,
                      countdown: gameplay.countdown,
                      problemId: gameplay.problem?.id,
                      isSearching,
                      hasOpponent,
                      isGameActive,
                      isLobby,
                    });
                  }}
                >
                  <Card className={answerSubmitted ? "border-success" : ""}>
                    <CardContent className="py-3 px-4 sm:p-12">
                      <div className="text-center">
                        <div className="text-3xl sm:text-6xl font-mono font-semibold tracking-wide leading-tight mb-2 sm:mb-8 min-h-12 sm:min-h-16 px-1 wrap-break-word">
                          {gameplay.problem 
                            ? `${gameplay.problem.a} ${gameplay.problem.operation} ${gameplay.problem.b}` 
                            : "..."}
                        </div>

                        <form onSubmit={handleSubmitAnswer}>
                            <div className="flex items-center gap-2 justify-center max-w-[280px] mx-auto">
                              {/* On mobile devices we use a custom keypad (more reliable than the OS keyboard). */}
                              {useCustomKeypad ? (
                                <div className="w-full">
                                  <div
                                    role="textbox"
                                    aria-label="Answer"
                                    aria-readonly="true"
                                    className={`h-12 text-center text-xl font-mono tabular-nums w-full rounded-md border bg-background px-3 flex items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap ${
                                      answerSubmitted ? "border-success text-success" : "border-input"
                                    }`}
                                  >
                                    {userAnswer.length > 0 ? userAnswer : "?"}
                                  </div>
                                </div>
                              ) : (
                                <Input
                                  ref={inputRef}
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*"
                                  enterKeyHint="done"
                                  value={userAnswer}
                                  onChange={(e) => {
                                    if (!answerSubmitted) {
                                      setUserAnswer(e.target.value.replace(/[^0-9\-]/g, ""));
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      submitCurrentAnswer();
                                    }
                                  }}
                                  onFocus={(e) => {
                                      // Only scroll if we are actually playing
                                      if (isGameActive && gameplay.status !== "countdown") {
                                          e.target.scrollIntoView({ behavior: "smooth", block: "center" });
                                      }
                                  }}
                                  placeholder="?"
                                  className="h-12 sm:h-14 text-center text-xl sm:text-2xl font-mono w-full sm:max-w-[200px]"
                                  autoFocus
                                  autoComplete="off"
                                  readOnly={false}
                                />
                              )}
                            </div>
                        </form>

                        {answerSubmitted && (
                          <p className="text-xs sm:text-sm text-success mt-2 sm:mt-4 flex items-center justify-center gap-2">
                            <Check className="w-4 h-4" />
                            Answer submitted!
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Round Result Overlay - Covers the problem but keeps input in DOM */}
                  {gameplay.status === "round_end" && gameplay.roundResult && (
                    <div className="absolute inset-0 z-10 bg-background/95 backdrop-blur-sm rounded-xl">
                      <Card className={`h-full bg-transparent ${
                        gameplay.roundResult.winnerId === playerId
                          ? "border-success"
                          : gameplay.roundResult.winnerId === null
                          ? "border-border"
                          : "border-destructive"
                      }`}>
                        <CardContent className="p-4 sm:p-8 text-center h-full flex flex-col justify-center">
                          <div className="text-3xl sm:text-4xl font-mono font-bold mb-2 sm:mb-4">
                            {gameplay.roundResult.correctAnswer}
                          </div>
                          <p className="text-muted-foreground text-sm mb-3 sm:mb-4">Correct Answer</p>
                          
                          {gameplay.roundResult.winnerId === playerId ? (
                            <Badge className="bg-success mx-auto">You got it!</Badge>
                          ) : gameplay.roundResult.winnerId === null ? (
                            <Badge variant="secondary" className="mx-auto">No one answered correctly</Badge>
                          ) : (
                            <Badge variant="destructive" className="mx-auto">Opponent was faster</Badge>
                          )}

                          <div className="flex justify-center gap-6 sm:gap-8 mt-4 sm:mt-6">
                            <div className="text-center">
                              <p className="text-xs sm:text-sm text-muted-foreground">Your time</p>
                              <p className="font-mono font-semibold text-sm sm:text-base">
                                {gameplay.roundResult.yourTime !== null
                                  ? `${(gameplay.roundResult.yourTime / 1000).toFixed(2)}s`
                                  : "—"}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs sm:text-sm text-muted-foreground">Opponent</p>
                              <p className="font-mono font-semibold text-sm sm:text-base">
                                {gameplay.roundResult.opponentTime !== null
                                  ? `${(gameplay.roundResult.opponentTime / 1000).toFixed(2)}s`
                                  : "—"}
                              </p>
                            </div>
                          </div>

                          <p className="text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6">
                            Next round starting soon...
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile custom keypad (persists for entire match) */}
        {showCustomKeypad && (
          <div className="fixed left-0 right-0 bottom-0 z-50">
            <div className="border-t border-border bg-background">
              <div className="max-w-md mx-auto px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0.5rem)+8px)]">
                <div className="flex items-center justify-center pb-2">
                  <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
                </div>

                <div className="grid grid-cols-3 gap-2 select-none touch-manipulation">
                  {["1","2","3","4","5","6","7","8","9"].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant="secondary"
                      className="h-12 rounded-xl text-xl font-semibold active:scale-[0.98] transition"
                      onClick={() => appendDigit(d)}
                      disabled={answerSubmitted || gameplay.status !== "playing"}
                    >
                      {d}
                    </Button>
                  ))}

                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 rounded-xl text-xl font-semibold active:scale-[0.98] transition"
                    onClick={toggleMinus}
                    disabled={answerSubmitted || gameplay.status !== "playing"}
                    aria-label="Toggle negative sign"
                  >
                    −
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 rounded-xl text-xl font-semibold active:scale-[0.98] transition"
                    onClick={() => appendDigit("0")}
                    disabled={answerSubmitted || gameplay.status !== "playing"}
                  >
                    0
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 rounded-xl active:scale-[0.98] transition"
                    onClick={backspace}
                    disabled={answerSubmitted || gameplay.status !== "playing"}
                    aria-label="Backspace"
                  >
                    <Delete className="h-5 w-5 opacity-80" />
                  </Button>

                  <Button
                    type="button"
                    className="h-11 rounded-xl text-sm font-semibold col-span-2 active:scale-[0.99] transition"
                    onClick={submitCurrentAnswer}
                    disabled={
                      answerSubmitted ||
                      gameplay.status !== "playing" ||
                      userAnswer.length === 0 ||
                      userAnswer === "-"
                    }
                  >
                    Done
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 rounded-xl text-sm font-semibold active:scale-[0.99] transition"
                    onClick={clearAnswer}
                    disabled={answerSubmitted || gameplay.status !== "playing"}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEARCHING OVERLAY */}
      {isSearching && (
         <div className="absolute inset-0 bg-background z-20 flex flex-col">
            <div className="border-b border-border">
              <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold">Finding Match</h1>
                  <p className="text-sm text-muted-foreground">
                    Looking for an opponent...
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {isConnected ? (
                    <>
                      <Wifi className="w-3 h-3 mr-1.5 text-success" />
                      Connected
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 mr-1.5 text-destructive" />
                      Disconnected
                    </>
                  )}
                </Badge>
              </div>
            </div>
            <div className="p-4 md:p-6 flex-1 flex items-center justify-center">
              <div className="max-w-md w-full text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-border border-t-foreground animate-spin" />
                <h2 className="text-lg font-semibold mb-2">{searchHeading}</h2>
                <p className="text-sm text-muted-foreground mb-2">
                  {searchDetail}
                </p>
                <Button variant="outline" onClick={handleCancelSearch}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
      )}

      {/* MATCH FOUND OVERLAY */}
      {isMatchFound && (
          <div className="absolute inset-0 bg-background z-20 flex flex-col">
            <div className="border-b border-border">
              <div className="px-4 sm:px-6 py-3 sm:py-4">
                <h1 className="text-lg font-semibold">Match Found!</h1>
              </div>
            </div>
            <div className="p-4 md:p-6 flex-1 flex items-center justify-center">
              <div className="max-w-lg w-full text-center">
                <Badge className="mb-6 text-sm">Match Found</Badge>
                <div className="flex items-center justify-center gap-8 mb-8">
                  <div className="text-center min-w-0">
                    <Avatar className="h-16 w-16 mx-auto mb-2">
                      <AvatarFallback>{getInitials(playerName)}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium truncate max-w-[140px] mx-auto">{playerName}</p>
                    {isSignedIn ? (
                      <p className="text-xs text-muted-foreground">Rating: {stats.rating}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Guest • Unrated</p>
                    )}
                  </div>
                  <span className="text-2xl font-bold text-muted-foreground">VS</span>
                  <div className="text-center min-w-0">
                    <Avatar className="h-16 w-16 mx-auto mb-2">
                      <AvatarFallback>{matchmaking.opponent ? getInitials(matchmaking.opponent.username) : "OP"}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium truncate max-w-[140px] mx-auto">{matchmaking.opponent?.username || "Opponent"}</p>
                    {matchmaking.opponent?.isGuest ? (
                      <p className="text-xs text-muted-foreground">Guest • Unrated</p>
                    ) : isSignedIn ? (
                      <p className="text-xs text-muted-foreground">Rating: {matchmaking.opponent?.rating}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Unrated</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Starting match...</p>
              </div>
            </div>
          </div>
      )}

      {/* LOBBY OVERLAY */}
      {isLobby && (
        <div className="relative z-20 bg-background min-h-full">
          <div className="border-b border-border">
            <div className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-lg font-semibold">Multiplayer Duel</h1>
                <p className="text-sm text-muted-foreground">
                  Challenge other players in real-time
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 sm:gap-3 min-w-0">
                {isGuest && (
                  <>
                    <Badge variant="secondary" className="text-xs max-w-[140px] truncate">
                      {playerName}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Guest • Unrated
                    </Badge>
                    <Link href={`/auth/signin?callbackUrl=${encodeURIComponent("/multiplayer")}`}>
                      <Button variant="outline" size="sm" className="shrink-0">
                        Sign in
                      </Button>
                    </Link>
                  </>
                )}
                <Badge variant="outline" className="text-xs">
                  {isConnected ? (
                    <>
                      <Wifi className="w-3 h-3 mr-1.5 text-success" />
                      Connected
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 mr-1.5 text-destructive" />
                      Connecting...
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Quick Match Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-14 h-14 rounded-xl bg-linear-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center shrink-0">
                      <Swords className="w-7 h-7 text-violet-500" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h2 className="font-semibold text-lg">Quick Match</h2>
                      <p className="text-sm text-muted-foreground">
                        Get matched with a player of similar skill. First to 6 wins the match.
                      </p>
                    </div>
                    <Button onClick={handleStartSearch} disabled={!isConnected} size="lg" className="w-full sm:w-auto">
                      <Play className="w-4 h-4 mr-2" />
                      Find Match
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Private Room Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="w-14 h-14 rounded-xl bg-secondary/60 flex items-center justify-center shrink-0">
                      <Users className="w-7 h-7 text-foreground" />
                    </div>
                    <div className="flex-1 w-full">
                      <h2 className="font-semibold text-lg">Private Room</h2>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create a room and share the link. Up to 8 players.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            resetGame();
                            createPrivateDuelRoom();
                          }}
                          disabled={!isConnected}
                          className="sm:w-auto"
                        >
                          Create Room
                        </Button>
                        <div className="flex gap-2 flex-1">
                          <Input
                            value={privateJoinInput}
                            onChange={(e) => setPrivateJoinInput(e.target.value)}
                            placeholder="Paste link or enter code"
                            className="flex-1"
                          />
                          <Button
                            onClick={() => {
                              resetGame();
                              joinPrivateDuelRoom(extractRoomCode(privateJoinInput));
                            }}
                            disabled={!isConnected || extractRoomCode(privateJoinInput).length < 4}
                          >
                            Join
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* How It Works */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">How Multiplayer Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Find a Match</p>
                        <p className="text-xs text-muted-foreground">
                          Click &quot;Find Match&quot; to be paired with another player
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Solve Problems</p>
                        <p className="text-xs text-muted-foreground">
                          Both players see the same problem. Answer first to win the round!
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold">3</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Win & Rank Up</p>
                        <p className="text-xs text-muted-foreground">
                          First to 6 points wins. Earn rating points and climb the leaderboard!
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Preview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Trophy className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                    <p className="text-2xl font-mono font-bold">
                      {statsLoading ? "—" : stats.wins}
                    </p>
                    <p className="text-xs text-muted-foreground">Wins</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Swords className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-mono font-bold">
                      {statsLoading ? "—" : stats.matches}
                    </p>
                    <p className="text-xs text-muted-foreground">Matches</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Zap className="w-5 h-5 mx-auto mb-2 text-violet-500" />
                    <p className="text-2xl font-mono font-bold">
                      {statsLoading ? "—" : stats.rating}
                    </p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
                    <p className="text-2xl font-mono font-bold">
                      {statsLoading ? "—" : stats.avgTime !== null ? `${stats.avgTime}s` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Time</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
