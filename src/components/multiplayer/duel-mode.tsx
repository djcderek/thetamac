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
  Circle,
  Wifi,
  WifiOff,
  Trophy,
  Zap,
  Clock,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import Link from "next/link";

interface MultiplayerStats {
  wins: number;
  matches: number;
  rating: number;
  avgTime: number | null;
}

export function DuelMode() {
  const { data: session, status } = useSession();
  const {
    isConnected,
    onlineCount,
    matchmaking,
    gameplay,
    joinMatchmaking,
    leaveMatchmaking,
    submitAnswer,
    forfeit,
    resetGame,
  } = useSocket();

  const [userAnswer, setUserAnswer] = useState("");
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const inputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<MultiplayerStats>({
    wins: 0,
    matches: 0,
    rating: 1000,
    avgTime: null,
  });
  const [statsLoading, setStatsLoading] = useState(!!session?.user);

  const focusInput = () => {
    // Use rAF to ensure the element is mounted before focusing
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

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
      focusInput();
    }
  }, [gameplay.status, gameplay.problem?.id]);

  // Keep the answer box focused while playing (helps after clicks elsewhere)
  useEffect(() => {
    if (gameplay.status === "playing" && !answerSubmitted) {
      focusInput();
    }
  }, [gameplay.status, answerSubmitted]);

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

  const handleStartSearch = () => {
    if (!session?.user) return;

    joinMatchmaking();
  };

  const handleCancelSearch = () => {
    leaveMatchmaking();
  };

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameplay.problem || answerSubmitted) return;

    const answer = parseInt(userAnswer);
    if (isNaN(answer)) return;

    const timeMs = Date.now() - roundStartTime;
    submitAnswer(answer, timeMs);
    setAnswerSubmitted(true);
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

  // User must be authenticated
  if (status === "loading") {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="border-b border-border">
          <div className="px-6 py-4">
            <h1 className="text-lg font-semibold">Multiplayer Duel</h1>
            <p className="text-sm text-muted-foreground">
              Challenge other players in real-time
            </p>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Swords className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
              <p className="text-muted-foreground mb-6">
                You need to be signed in to play multiplayer matches.
              </p>
              <Link href="/auth/signin">
                <Button>Sign In to Play</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Game Over Screen
  if (gameplay.status === "game_over" && gameplay.gameResult) {
    const isWinner = gameplay.gameResult.winnerId === session.user.id;
    const isDraw = gameplay.gameResult.winnerId === null;
    const myScore = gameplay.gameResult.finalScores[session.user.id || ""] || 0;
    const opponentScore = matchmaking.opponent
      ? gameplay.gameResult.finalScores[matchmaking.opponent.id] || 0
      : 0;

    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="border-b border-border">
          <div className="px-6 py-4">
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
                    <AvatarFallback>{getInitials(session.user.name || "You")}</AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{session.user.name || "You"}</p>
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

              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8 ${
                gameplay.gameResult.ratingChange >= 0
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              }`}>
                {gameplay.gameResult.ratingChange >= 0 ? "+" : ""}
                {gameplay.gameResult.ratingChange} Rating
              </div>

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

  // Playing Screen
  if (gameplay.status === "playing" || gameplay.status === "round_end" || gameplay.status === "countdown") {
    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="border-b border-border">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Match in Progress</h1>
              <p className="text-sm text-muted-foreground">
                Round {gameplay.currentRound} of 10
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleForfeit}>
              Forfeit
            </Button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Countdown Overlay */}
            {gameplay.status === "countdown" && gameplay.countdown > 0 && (
              <Card className="border-2 border-foreground">
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">Get Ready!</p>
                  <p className="text-8xl font-mono font-bold">{gameplay.countdown}</p>
                </CardContent>
              </Card>
            )}

            {/* Score Header */}
            {gameplay.status !== "countdown" && (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{getInitials(session.user.name || "You")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{session.user.name || "You"}</p>
                          <p className="text-xs text-muted-foreground">Your score</p>
                        </div>
                        <span className="text-3xl font-mono font-bold ml-4">
                          {gameplay.scores[session.user.id || ""] || 0}
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

                {/* Problem Display */}
                {gameplay.status === "playing" && gameplay.problem && (
                  <Card className={answerSubmitted ? "border-success" : ""}>
                    <CardContent className="p-12">
                      <div className="text-center">
                        <div className="text-6xl font-mono font-semibold tracking-wide mb-8">
                          {gameplay.problem.a} {gameplay.problem.operation} {gameplay.problem.b}
                        </div>

                        <form onSubmit={handleSubmitAnswer}>
                          <Input
                            ref={inputRef}
                            type="number"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="?"
                            className="h-14 text-center text-2xl font-mono max-w-[200px] mx-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            autoFocus
                            disabled={answerSubmitted}
                          />
                        </form>

                        {answerSubmitted && (
                          <p className="text-sm text-success mt-4 flex items-center justify-center gap-2">
                            <Check className="w-4 h-4" />
                            Answer submitted! Waiting for round to end...
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Round Result */}
                {gameplay.status === "round_end" && gameplay.roundResult && (
                  <Card className={
                    gameplay.roundResult.winnerId === session.user.id
                      ? "border-success"
                      : gameplay.roundResult.winnerId === null
                      ? "border-border"
                      : "border-destructive"
                  }>
                    <CardContent className="p-8 text-center">
                      <div className="text-4xl font-mono font-bold mb-4">
                        {gameplay.roundResult.correctAnswer}
                      </div>
                      <p className="text-muted-foreground mb-4">Correct Answer</p>
                      
                      {gameplay.roundResult.winnerId === session.user.id ? (
                        <Badge className="bg-success">You got it!</Badge>
                      ) : gameplay.roundResult.winnerId === null ? (
                        <Badge variant="secondary">No one answered correctly</Badge>
                      ) : (
                        <Badge variant="destructive">Opponent was faster</Badge>
                      )}

                      <div className="flex justify-center gap-8 mt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Your time</p>
                          <p className="font-mono font-semibold">
                            {gameplay.roundResult.yourTime !== null
                              ? `${(gameplay.roundResult.yourTime / 1000).toFixed(2)}s`
                              : "—"}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Opponent time</p>
                          <p className="font-mono font-semibold">
                            {gameplay.roundResult.opponentTime !== null
                              ? `${(gameplay.roundResult.opponentTime / 1000).toFixed(2)}s`
                              : "—"}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mt-6">
                        Next round starting soon...
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Match Found Screen
  if (matchmaking.opponent && gameplay.status === "idle") {
    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="border-b border-border">
          <div className="px-6 py-4">
            <h1 className="text-lg font-semibold">Match Found!</h1>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <div className="max-w-lg mx-auto text-center py-12">
            <Badge className="mb-6 text-sm">Match Found</Badge>
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <Avatar className="h-16 w-16 mx-auto mb-2">
                  <AvatarFallback>{getInitials(session.user.name || "You")}</AvatarFallback>
                </Avatar>
                <p className="font-medium">{session.user.name || "You"}</p>
                <p className="text-xs text-muted-foreground">Rating: {stats.rating}</p>
              </div>
              <span className="text-2xl font-bold text-muted-foreground">VS</span>
              <div className="text-center">
                <Avatar className="h-16 w-16 mx-auto mb-2">
                  <AvatarFallback>{getInitials(matchmaking.opponent.username)}</AvatarFallback>
                </Avatar>
                <p className="font-medium">{matchmaking.opponent.username}</p>
                <p className="text-xs text-muted-foreground">Rating: {matchmaking.opponent.rating}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Starting match...</p>
          </div>
        </div>
      </div>
    );
  }

  // Searching Screen
  if (matchmaking.isSearching) {
    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="border-b border-border">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Finding Match</h1>
              <p className="text-sm text-muted-foreground">
                Looking for an opponent...
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
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
        <div className="p-4 md:p-6">
          <div className="max-w-md mx-auto text-center py-20">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-border border-t-foreground animate-spin" />
            <h2 className="text-lg font-semibold mb-2">Finding opponent...</h2>
            <p className="text-sm text-muted-foreground mb-2">
              Matching you with a player of similar skill
            </p>
            <p className="text-xs text-muted-foreground mb-8">
              {onlineCount} players online
            </p>
            <Button variant="outline" onClick={handleCancelSearch}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Lobby Screen (default)
  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="border-b border-border">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Multiplayer Duel</h1>
            <p className="text-sm text-muted-foreground">
              Challenge other players in real-time
            </p>
          </div>
          <div className="flex items-center gap-3">
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
            <Badge variant="outline" className="text-xs">
              <Circle className="w-2 h-2 mr-1.5 fill-success text-success" />
              {onlineCount} online
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Quick Match Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                  <Swords className="w-7 h-7 text-violet-500" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">Quick Match</h2>
                  <p className="text-sm text-muted-foreground">
                    Get matched with a player of similar skill. First to 6 wins the match.
                  </p>
                </div>
                <Button onClick={handleStartSearch} disabled={!isConnected} size="lg">
                  <Play className="w-4 h-4 mr-2" />
                  Find Match
                </Button>
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
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
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
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
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
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
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
  );
}

