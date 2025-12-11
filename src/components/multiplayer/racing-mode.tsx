"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Play,
  Wifi,
  WifiOff,
  Circle,
  ArrowLeft,
  Trophy,
  Zap,
  Clock,
  Target,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Loader2,
  Flag,
  Users,
  Flame,
  X,
  Shield,
  Sparkles,
  AlertTriangle,
  Snowflake,
} from "lucide-react";
import { useRaceSocket } from "@/hooks/use-race-socket";
import Link from "next/link";
import type { ActionType, PlayerProblems, TrackObstacle, TrackDrop, ObstacleType, DropType } from "@/lib/racing/types";
import RaceTrack3D from "@/components/racing/race-track-3d";
import RaceLobby3D from "@/components/racing/race-lobby-3d";

// ============================================
// PROBLEM INPUT PANEL
// ============================================

interface ProblemPanelProps {
  problems: PlayerProblems | null;
  onSubmit: (action: ActionType, answer: number, problemId: string) => boolean;
  isStunned: boolean;
  currentLane: number;
  isOnCooldown: boolean;
  cooldownRemaining: number;
}

function ProblemPanel({
  problems,
  onSubmit,
  isStunned,
  currentLane,
  isOnCooldown,
  cooldownRemaining,
}: ProblemPanelProps) {
  const [answers, setAnswers] = useState<Record<ActionType, string>>({
    left: "",
    forward: "",
    right: "",
    boost: "",
  });
  
  const leftRef = useRef<HTMLInputElement>(null);
  const forwardRef = useRef<HTMLInputElement>(null);
  const rightRef = useRef<HTMLInputElement>(null);
  const boostRef = useRef<HTMLInputElement>(null);

  // Focus forward input on mount
  useEffect(() => {
    forwardRef.current?.focus();
  }, []);

  // Focus forward when new forward problem arrives (race start or refresh)
  useEffect(() => {
    forwardRef.current?.focus();
    forwardRef.current?.select();
  }, [problems?.forward?.id]);

  const handleSubmit = (action: ActionType) => {
    if (!problems || isStunned || isOnCooldown) return;
    
    const problem = action === "left" ? problems.left :
                    action === "right" ? problems.right :
                    action === "boost" ? problems.boost :
                    problems.forward;
    
    if (!problem) return;
    
    const answer = parseInt(answers[action]);
    if (isNaN(answer)) return;
    
    const success = onSubmit(action, answer, problem.id);
    
    // Clear input regardless of success
    setAnswers(prev => ({ ...prev, [action]: "" }));
    
    // Refocus input
    const ref = action === "left" ? leftRef :
                action === "right" ? rightRef :
                action === "boost" ? boostRef :
                forwardRef;
    ref.current?.focus();
    ref.current?.select();
  };

  const focusInput = (action: ActionType) => {
    const ref = action === "left" ? leftRef :
                action === "right" ? rightRef :
                action === "boost" ? boostRef :
                forwardRef;
    ref.current?.focus();
    ref.current?.select();
  };

  const handleKeyDown = (action: ActionType) => (e: React.KeyboardEvent) => {
    const key = e.key;
    const lower = key.toLowerCase();

    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(action);
      return;
    }

    // Arrow-key navigation between inputs
    if (key === "ArrowLeft" || lower === "a") {
      e.preventDefault();
      if (currentLane > 1 && problems?.left) focusInput("left");
      return;
    }
    if (key === "ArrowRight" || lower === "d") {
      e.preventDefault();
      if (currentLane < 5 && problems?.right) focusInput("right");
      return;
    }
    if (key === "ArrowUp" || lower === "w") {
      e.preventDefault();
      focusInput("forward");
      return;
    }
    if (key === "ArrowDown" || lower === "s") {
      e.preventDefault();
      focusInput("boost");
      return;
    }
  };

  if (!problems) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canGoLeft = currentLane > 1 && problems.left;
  const canGoRight = currentLane < 5 && problems.right;

  return (
    <div className="space-y-4">
      {/* Status bar */}
      {(isStunned || isOnCooldown) && (
        <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
          isStunned ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-600"
        }`}>
          {isStunned ? (
            <>
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">STUNNED! Wait for recovery...</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">
                Wrong answer! Cooldown: {(cooldownRemaining / 1000).toFixed(1)}s
              </span>
            </>
          )}
        </div>
      )}

      {/* Main problem grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Left lane change */}
        <div className={`${!canGoLeft ? "opacity-40 pointer-events-none" : ""}`}>
          <Card className="h-full border-dashed">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <ChevronLeft className="w-3 h-3" />
                Lane {currentLane - 1}
              </div>
              {problems.left ? (
                <>
                  <div className="text-xl font-mono font-semibold text-center mb-2">
                    {problems.left.a} {problems.left.operation} {problems.left.b}
                  </div>
                  <div className="flex gap-1">
                    <Input
                      ref={leftRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={answers.left}
                      onChange={e => setAnswers(prev => ({ ...prev, left: e.target.value }))}
                      onKeyDown={handleKeyDown("left")}
                      placeholder="?"
                      className="h-9 text-center font-mono"
                      disabled={isStunned || isOnCooldown}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">
                  Edge
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Forward */}
        <Card className="border-2 border-primary/50 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-center gap-1 text-xs text-primary font-medium mb-2">
              <ArrowUp className="w-3 h-3" />
              Forward +1m
            </div>
            <div className="text-2xl font-mono font-bold text-center mb-2">
              {problems.forward.a} {problems.forward.operation} {problems.forward.b}
            </div>
            <div className="flex gap-1">
              <Input
                ref={forwardRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                value={answers.forward}
                onChange={e => setAnswers(prev => ({ ...prev, forward: e.target.value }))}
                onKeyDown={handleKeyDown("forward")}
                placeholder="?"
                className="h-10 text-center font-mono text-lg"
                disabled={isStunned || isOnCooldown}
                autoFocus
              />
            </div>
          </CardContent>
        </Card>

        {/* Right lane change */}
        <div className={`${!canGoRight ? "opacity-40 pointer-events-none" : ""}`}>
          <Card className="h-full border-dashed">
            <CardContent className="p-3">
              <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground mb-2">
                Lane {currentLane + 1}
                <ChevronRight className="w-3 h-3" />
              </div>
              {problems.right ? (
                <>
                  <div className="text-xl font-mono font-semibold text-center mb-2">
                    {problems.right.a} {problems.right.operation} {problems.right.b}
                  </div>
                  <div className="flex gap-1">
                    <Input
                      ref={rightRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={answers.right}
                      onChange={e => setAnswers(prev => ({ ...prev, right: e.target.value }))}
                      onKeyDown={handleKeyDown("right")}
                      placeholder="?"
                      className="h-9 text-center font-mono"
                      disabled={isStunned || isOnCooldown}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">
                  Edge
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Boost problem */}
      <Card className="border-amber-500/50 bg-linear-to-r from-amber-500/10 to-orange-500/10">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/20">
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  BOOST +3m (Harder)
                </div>
                <div className="text-2xl font-mono font-bold">
                  {problems.boost.a} {problems.boost.operation} {problems.boost.b}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                ref={boostRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={answers.boost}
                onChange={e => setAnswers(prev => ({ ...prev, boost: e.target.value }))}
                onKeyDown={handleKeyDown("boost")}
                placeholder="?"
                className="h-10 w-24 text-center font-mono text-lg"
                disabled={isStunned || isOnCooldown}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard hints */}
      <div className="text-center text-xs text-muted-foreground">
        Type answer and press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">Enter</kbd> to submit
      </div>
    </div>
  );
}

// ============================================
// RESULTS SCREEN
// ============================================

interface ResultsProps {
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
  myPlayerId: string;
  onPlayAgain: () => void;
  onLeave: () => void;
}

function ResultsScreen({ results, myRatingChange, myPlayerId, onPlayAgain, onLeave }: ResultsProps) {
  const myResult = results.find(r => r.playerId === myPlayerId);
  const isWinner = myResult?.position === 1;

  const formatTime = (ms: number | null) => {
    if (ms === null) return "DNF";
    const seconds = ms / 1000;
    return `${seconds.toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Winner banner */}
      <div className={`text-center p-6 rounded-xl ${
        isWinner 
          ? "bg-linear-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30" 
          : "bg-secondary/50"
      }`}>
        <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
          isWinner ? "bg-amber-500/30" : "bg-secondary"
        }`}>
          {isWinner ? (
            <Trophy className="w-10 h-10 text-amber-500" />
          ) : myResult?.position === 2 ? (
            <span className="text-3xl">🥈</span>
          ) : myResult?.position === 3 ? (
            <span className="text-3xl">🥉</span>
          ) : (
            <span className="text-3xl font-bold text-muted-foreground">#{myResult?.position}</span>
          )}
        </div>
        <h2 className="text-2xl font-bold mb-1">
          {isWinner ? "Victory!" : `${getOrdinal(myResult?.position || 0)} Place`}
        </h2>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
          myRatingChange >= 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
        }`}>
          {myRatingChange >= 0 ? "+" : ""}{myRatingChange} Rating
        </div>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Race Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {results.map((result, i) => {
              const isMe = result.playerId === myPlayerId;
              return (
                <div
                  key={result.playerId}
                  className={`flex items-center gap-4 p-3 rounded-lg ${
                    isMe ? "bg-primary/10 border border-primary/30" : "bg-secondary/30"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold">
                    {result.position === 1 ? "🥇" : result.position === 2 ? "🥈" : result.position === 3 ? "🥉" : `#${result.position}`}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {result.username}
                        {isMe && <span className="text-muted-foreground ml-1">(You)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(result.time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {result.stats.problemsSolved} solved
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        {result.stats.bumpsGiven} bumps
                      </span>
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${
                    result.ratingChange >= 0 ? "text-success" : "text-destructive"
                  }`}>
                    {result.ratingChange >= 0 ? "+" : ""}{result.ratingChange}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Button onClick={onPlayAgain} size="lg">
          <Play className="w-4 h-4 mr-2" />
          Race Again
        </Button>
        <Button variant="outline" onClick={onLeave} size="lg">
          Back to Lobby
        </Button>
      </div>
    </div>
  );
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ============================================
// RACING MODE COMPONENT
// ============================================

export function RacingMode() {
  const { data: session, status } = useSession();
  const {
    isConnected,
    queue,
    lobby,
    race,
    result,
    error,
    isOnCooldown,
    cooldownRemaining,
    joinQueue,
    leaveQueue,
    submitAnswer,
    forfeit,
    leaveRace,
    resetAllState,
    getMyPlayer,
    myPlayerId,
  } = useRaceSocket();

  const myPlayer = myPlayerId ? getMyPlayer(myPlayerId) : null;
  const hasFinished = race.myFinishPosition !== null;

  // Auth loading
  if (status === "loading") {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not signed in
  if (!session?.user) {
    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="border-b border-border">
          <div className="px-6 py-4">
            <h1 className="text-lg font-semibold">Math Racers</h1>
            <p className="text-sm text-muted-foreground">
              Race against other players!
            </p>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Flag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
              <p className="text-muted-foreground mb-6">
                You need to be signed in to play Math Racers.
              </p>
              <Link href="/auth/signin">
                <Button>Sign In to Race</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Results screen
  if (result) {
    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="border-b border-border">
          <div className="px-6 py-4">
            <h1 className="text-lg font-semibold">Race Complete</h1>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            <ResultsScreen
              results={result.results}
              myRatingChange={result.myRatingChange}
              myPlayerId={session.user.id || ""}
              onPlayAgain={() => {
                resetAllState();
                joinQueue(session.user!.id!, session.user!.name || "Player");
              }}
              onLeave={resetAllState}
            />
          </div>
        </div>
      </div>
    );
  }

  // Racing screen
  if (race.inRace && race.status === "racing") {
    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="border-b border-border">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">
                {hasFinished ? `You Finished #${race.myFinishPosition}!` : "Race in Progress"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {race.config?.trackLength}m track • {race.players.length} racers
                {hasFinished && " • Waiting for others to finish..."}
              </p>
            </div>
            {!hasFinished && (
              <Button variant="ghost" size="sm" onClick={forfeit}>
                <X className="w-4 h-4 mr-2" />
                Forfeit
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Track visualization */}
            <RaceTrack3D
              players={race.players}
              trackLength={race.config?.trackLength || 250}
              myPlayerId={myPlayerId || session.user.id || ""}
              finishOrder={race.finishOrder}
              obstacles={race.obstacles || []}
              drops={race.drops || []}
              myPosition={myPlayer?.position || 0}
            />

            {/* Show finished state or problem panel */}
            {hasFinished ? (
              <Card className="border-success/50 bg-success/5">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-success" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    You Finished #{race.myFinishPosition}!
                  </h2>
                  <p className="text-muted-foreground">
                    Waiting for other players to finish...
                  </p>
                  <div className="mt-4 flex justify-center gap-4">
                    {race.finishOrder.map((finish, i) => (
                      <div key={finish.playerId} className="text-center">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-1 font-bold">
                          {finish.position === 1 ? "🥇" : finish.position === 2 ? "🥈" : finish.position === 3 ? "🥉" : `#${finish.position}`}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {race.players.find(p => p.id === finish.playerId)?.username || "Player"}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ProblemPanel
                problems={race.myProblems}
                onSubmit={submitAnswer}
                isStunned={myPlayer?.isStunned || false}
                currentLane={myPlayer?.lane || 3}
                isOnCooldown={isOnCooldown}
                cooldownRemaining={cooldownRemaining}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Countdown screen
  if (race.inRace && race.status === "countdown") {
    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="border-b border-border">
          <div className="px-6 py-4">
            <h1 className="text-lg font-semibold">Get Ready!</h1>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-4">Race starting in...</p>
                <div className="text-8xl font-mono font-bold animate-pulse">
                  {race.countdown}
                </div>
                <div className="mt-8 flex justify-center gap-4">
                  {race.players.map((player, i) => (
                    <div key={player.id} className="text-center">
                      <Avatar className="h-12 w-12 mx-auto mb-2">
                        <AvatarFallback>
                          {player.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">
                        {player.id === session.user.id ? "You" : player.username}
                      </p>
                      <p className="text-xs text-muted-foreground">Lane {player.lane}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Lobby screen - Fortnite-style 3D showcase
  if (lobby.inLobby) {
    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            <RaceLobby3D
              players={lobby.players}
              maxPlayers={5}
              startingIn={lobby.startingIn}
              currentUserId={session.user.id || ""}
              onLeave={leaveQueue}
            />
          </div>
        </div>
      </div>
    );
  }

  // Queue screen
  if (queue.inQueue) {
    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="border-b border-border">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Finding Race</h1>
              <p className="text-sm text-muted-foreground">
                Looking for opponents...
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
            <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-border border-t-primary animate-spin" />
            <h2 className="text-lg font-semibold mb-2">Finding a race...</h2>
            <p className="text-sm text-muted-foreground mb-2">
              Matching you with other players
            </p>
            <p className="text-xs text-muted-foreground mb-8">
              {queue.playersInQueue} players in queue
            </p>
            <Button variant="outline" onClick={leaveQueue}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default lobby screen
  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="border-b border-border">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Math Racers</h1>
            <p className="text-sm text-muted-foreground">
              Race to the finish by solving math problems!
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
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Quick Race Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                  <Flag className="w-7 h-7 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">Quick Race</h2>
                  <p className="text-sm text-muted-foreground">
                    Race against 2-5 players. Solve problems to move forward, bump into opponents!
                  </p>
                </div>
                <Button
                  onClick={() => joinQueue(session.user!.id!, session.user!.name || "Player")}
                  disabled={!isConnected}
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Find Race
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">How Math Racers Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold">1</span>
                  </div>
                <div>
                  <p className="font-medium text-sm">Solve to Move</p>
                  <p className="text-xs text-muted-foreground">
                    Solve the forward problem to advance 1 meter
                  </p>
                </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Change Lanes</p>
                    <p className="text-xs text-muted-foreground">
                      Solve left/right problems to switch lanes
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Bump Opponents</p>
                    <p className="text-xs text-muted-foreground">
                      Lane change into opponents to stun them & push back
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold">4</span>
                  </div>
                <div>
                  <p className="font-medium text-sm">Boost!</p>
                  <p className="text-xs text-muted-foreground">
                    Solve harder boost problems to move 3 meters
                  </p>
                </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Race Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Flag className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-mono font-bold">250m</p>
                <p className="text-xs text-muted-foreground">Track Length</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-mono font-bold">2-5</p>
                <p className="text-xs text-muted-foreground">Players</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Zap className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-mono font-bold">2s</p>
                <p className="text-xs text-muted-foreground">Stun Duration</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="w-5 h-5 mx-auto mb-2 text-rose-500" />
                <p className="text-2xl font-mono font-bold">2m</p>
                <p className="text-xs text-muted-foreground">Bump Pushback</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
