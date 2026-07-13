"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileNumpad } from "@/components/ui/mobile-numpad";
import { AsciiMorph, AsciiSpinner } from "@/components/ui/ascii-morph";
import { MedalMark } from "@/components/ui/medal-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricTile, SectionLabel } from "@/components/ui/visual-system";
import {
  Play,
  ArrowLeft,
  Zap,
  Clock,
  Target,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Loader2,
  Flame,
  X,
  Copy,
  Check,
} from "lucide-react";
import { useRaceSocket } from "@/hooks/use-race-socket";
import { useIsMobileDevice } from "@/hooks/use-is-mobile-device";
import Link from "next/link";
import type { ActionType, PlayerProblems } from "@/lib/racing/types";
import RaceTrack3D from "@/components/racing/race-track-3d";
import RaceLobby3D from "@/components/racing/race-lobby-3d";
import { useMobileTopBarPinning } from "@/components/mobile-top-bar-pinning";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";

type RacingStats = {
  rating: number;
  races: number;
  wins: number;
  podiums: number;
  avgFinish: number | null;
  problemsSolved: number;
};

// ============================================
// PROBLEM INPUT PANEL
// ============================================

interface ProblemPanelProps {
  problems: PlayerProblems | null;
  onSubmit: (action: ActionType, answer: number, problemId: string) => boolean;
  isStunned: boolean;
  currentLane: number;
  laneCount: number;
  isOnCooldown: boolean;
  cooldownRemaining: number;
}

function ProblemPanel({
  problems,
  onSubmit,
  isStunned,
  currentLane,
  laneCount,
  isOnCooldown,
  cooldownRemaining,
}: ProblemPanelProps) {
  const isMobileDevice = useIsMobileDevice();
  const [answers, setAnswers] = useState<Record<ActionType, string>>({
    left: "",
    forward: "",
    right: "",
    boost: "",
  });

  const [mobileKeypadAction, setMobileKeypadAction] = useState<ActionType>("forward");
  const [isMobileKeypadOpen, setIsMobileKeypadOpen] = useState(() => isMobileDevice);
  
  const leftRef = useRef<HTMLInputElement>(null);
  const forwardRef = useRef<HTMLInputElement>(null);
  const rightRef = useRef<HTMLInputElement>(null);
  const boostRef = useRef<HTMLInputElement>(null);
  const boostCardWrapperRef = useRef<HTMLDivElement>(null);

  // Focus forward input on mount
  useEffect(() => {
    if (isMobileDevice) return;
    forwardRef.current?.focus();
  }, [isMobileDevice]);

  // Focus forward when new forward problem arrives (race start or refresh)
  useEffect(() => {
    if (isMobileDevice) return;
    forwardRef.current?.focus();
    forwardRef.current?.select();
  }, [isMobileDevice, problems?.forward?.id]);

  // When the mobile keypad opens for BOOST, ensure the boost card is scrolled above the keypad
  // so it isn't blocked.
  useEffect(() => {
    if (!isMobileDevice) return;
    if (!isMobileKeypadOpen) return;
    if (mobileKeypadAction !== "boost") return;

    const scrollBoostIntoView = () => {
      const boostEl = boostCardWrapperRef.current;
      if (!boostEl) return;

      const keypadEl = document.getElementById("mobile-numpad");
      const keypadHeight = keypadEl?.getBoundingClientRect().height ?? 320;
      const safeBottomGap = 10;
      const visibleBottom = window.innerHeight - keypadHeight - safeBottomGap;

      const rect = boostEl.getBoundingClientRect();
      if (rect.bottom <= visibleBottom) return;

      const delta = rect.bottom - visibleBottom;
      window.scrollTo({ top: window.scrollY + delta, behavior: "smooth" });
    };

    // Let layout settle (especially with overlap / animations), then adjust scroll.
    requestAnimationFrame(() => requestAnimationFrame(scrollBoostIntoView));
  }, [isMobileDevice, isMobileKeypadOpen, mobileKeypadAction]);

  const handleSubmit = (action: ActionType) => {
    if (!problems || isStunned || isOnCooldown) return;
    
    const problem = action === "left" ? problems.left :
                    action === "right" ? problems.right :
                    action === "boost" ? problems.boost :
                    problems.forward;
    
    if (!problem) return;
    
    const answer = parseInt(answers[action]);
    if (isNaN(answer)) return;
    
    onSubmit(action, answer, problem.id);
    
    // Clear input regardless of success
    setAnswers(prev => ({ ...prev, [action]: "" }));
    
    // Refocus input
    if (isMobileDevice) {
      setMobileKeypadAction(action);
      setIsMobileKeypadOpen(true);
      return;
    }

    const ref =
      action === "left" ? leftRef :
      action === "right" ? rightRef :
      action === "boost" ? boostRef :
      forwardRef;
    ref.current?.focus();
    ref.current?.select();
  };

  const focusInput = (action: ActionType) => {
    if (isMobileDevice) {
      setMobileKeypadAction(action);
      setIsMobileKeypadOpen(true);
      return;
    }
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
      if (currentLane < laneCount && problems?.right) focusInput("right");
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
  const canGoRight = currentLane < laneCount && problems.right;
  const problemInputsDisabled = isStunned || isOnCooldown;

  const openMobileKeypad = (action: ActionType) => {
    if (!isMobileDevice) return;
    if (problemInputsDisabled) return;
    setMobileKeypadAction(action);
    setIsMobileKeypadOpen(true);
  };

  const setMobileKeypadValue: React.Dispatch<React.SetStateAction<string>> = (updater) => {
    setAnswers((prev) => {
      const current = prev[mobileKeypadAction] ?? "";
      const nextValue = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [mobileKeypadAction]: nextValue };
    });
  };

  return (
    <div className={`space-y-1 sm:space-y-4 ${isMobileDevice && isMobileKeypadOpen ? "pb-88" : ""}`}>
      {/* Status bar */}
      {(isStunned || isOnCooldown) && (
        <div className={`flex items-center justify-center gap-2 p-3 rounded-[3px] border ${
          isStunned ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-warning/50 bg-warning/10 text-foreground"
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
      <div className="grid grid-cols-3 gap-1 sm:gap-3">
        {/* Left lane change */}
        <div className={`${!canGoLeft ? "opacity-40 pointer-events-none" : ""}`}>
          <Card
            className={`h-full border-dashed transition-colors ${
              isMobileDevice ? "cursor-pointer select-none" : ""
            } ${
              isMobileDevice && mobileKeypadAction === "left"
                ? "ring-2 ring-primary/40 border-primary/40 bg-primary/5"
                : ""
            }`}
            onPointerDownCapture={
              isMobileDevice ? () => openMobileKeypad("left") : undefined
            }
            onClick={isMobileDevice ? () => openMobileKeypad("left") : undefined}
            onKeyDown={
              isMobileDevice
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openMobileKeypad("left");
                    }
                  }
                : undefined
            }
            role={isMobileDevice ? "button" : undefined}
            tabIndex={isMobileDevice ? 0 : undefined}
            aria-label={isMobileDevice ? "Select left problem" : undefined}
            aria-pressed={isMobileDevice ? mobileKeypadAction === "left" : undefined}
          >
            <CardContent className="px-2 py-0.5 sm:p-3">
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mb-0 sm:mb-2">
                <ChevronLeft className="w-3 h-3" />
                Lane {currentLane - 1}
              </div>
              {problems.left ? (
                <>
                  <div className="text-sm sm:text-xl font-mono font-semibold text-center leading-none mb-0 sm:mb-2">
                    {problems.left.a} {problems.left.operation} {problems.left.b}
                  </div>
                  <div className="flex gap-1">
                    {isMobileDevice ? (
                      <button
                        type="button"
                        onPointerDownCapture={(e) => {
                          e.stopPropagation();
                          openMobileKeypad("left");
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openMobileKeypad("left");
                        }}
                        className={`h-6 sm:h-9 w-full text-center font-mono rounded-md border bg-background px-3 flex items-center justify-center ${
                          mobileKeypadAction === "left" ? "border-primary/60" : "border-input"
                        } ${problemInputsDisabled ? "opacity-50" : ""}`}
                        aria-label="Answer (Left)"
                        aria-disabled={problemInputsDisabled}
                      >
                        {answers.left.length > 0 ? answers.left : "?"}
                      </button>
                    ) : (
                      <Input
                        ref={leftRef}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={answers.left}
                        onChange={e => setAnswers(prev => ({ ...prev, left: e.target.value }))}
                        onKeyDown={handleKeyDown("left")}
                        placeholder="?"
                        className="h-6 sm:h-9 text-center font-mono"
                        disabled={problemInputsDisabled}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground text-xs py-1.5 sm:py-4">
                  Edge
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Forward */}
        <Card
          className={`border-2 transition-colors bg-card ${
            isMobileDevice ? "cursor-pointer select-none" : ""
          } ${
            isMobileDevice && mobileKeypadAction === "forward"
              ? "border-primary/70 ring-2 ring-primary/40"
              : "border-primary/50"
          }`}
          onPointerDownCapture={
            isMobileDevice ? () => openMobileKeypad("forward") : undefined
          }
          onClick={isMobileDevice ? () => openMobileKeypad("forward") : undefined}
          onKeyDown={
            isMobileDevice
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openMobileKeypad("forward");
                  }
                }
              : undefined
          }
          role={isMobileDevice ? "button" : undefined}
          tabIndex={isMobileDevice ? 0 : undefined}
          aria-label={isMobileDevice ? "Select forward problem" : undefined}
          aria-pressed={isMobileDevice ? mobileKeypadAction === "forward" : undefined}
        >
          <CardContent className="px-2 py-0.5 sm:p-3">
            {!isMobileDevice && (
              <div className="flex items-center justify-center gap-1 text-xs text-primary font-medium mb-2">
                <ArrowUp className="w-3 h-3" />
                Forward +1m
              </div>
            )}
            <div className="text-base sm:text-2xl font-mono font-bold text-center leading-none mb-0 sm:mb-2">
              {problems.forward.a} {problems.forward.operation} {problems.forward.b}
            </div>
            <div className="flex gap-1">
              {isMobileDevice ? (
                <button
                  type="button"
                  onPointerDownCapture={(e) => {
                    e.stopPropagation();
                    openMobileKeypad("forward");
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openMobileKeypad("forward");
                  }}
                  className={`h-7 sm:h-10 w-full text-center font-mono text-base sm:text-lg rounded-md border bg-background px-3 flex items-center justify-center ${
                    mobileKeypadAction === "forward" ? "border-primary/70" : "border-input"
                  } ${problemInputsDisabled ? "opacity-50" : ""}`}
                  aria-label="Answer (Forward)"
                  aria-disabled={problemInputsDisabled}
                >
                  {answers.forward.length > 0 ? answers.forward : "?"}
                </button>
              ) : (
                <Input
                  ref={forwardRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={answers.forward}
                  onChange={e => setAnswers(prev => ({ ...prev, forward: e.target.value }))}
                  onKeyDown={handleKeyDown("forward")}
                  placeholder="?"
                  className="h-7 sm:h-10 text-center font-mono text-base sm:text-lg"
                  disabled={problemInputsDisabled}
                  autoFocus
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right lane change */}
        <div className={`${!canGoRight ? "opacity-40 pointer-events-none" : ""}`}>
          <Card
            className={`h-full border-dashed transition-colors ${
              isMobileDevice ? "cursor-pointer select-none" : ""
            } ${
              isMobileDevice && mobileKeypadAction === "right"
                ? "ring-2 ring-primary/40 border-primary/40 bg-primary/5"
                : ""
            }`}
            onPointerDownCapture={
              isMobileDevice ? () => openMobileKeypad("right") : undefined
            }
            onClick={isMobileDevice ? () => openMobileKeypad("right") : undefined}
            onKeyDown={
              isMobileDevice
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openMobileKeypad("right");
                    }
                  }
                : undefined
            }
            role={isMobileDevice ? "button" : undefined}
            tabIndex={isMobileDevice ? 0 : undefined}
            aria-label={isMobileDevice ? "Select right problem" : undefined}
            aria-pressed={isMobileDevice ? mobileKeypadAction === "right" : undefined}
          >
            <CardContent className="px-2 py-0.5 sm:p-3">
              <div className="flex items-center justify-end gap-1 text-[10px] sm:text-xs text-muted-foreground mb-0 sm:mb-2">
                Lane {currentLane + 1}
                <ChevronRight className="w-3 h-3" />
              </div>
              {problems.right ? (
                <>
                  <div className="text-sm sm:text-xl font-mono font-semibold text-center leading-none mb-0 sm:mb-2">
                    {problems.right.a} {problems.right.operation} {problems.right.b}
                  </div>
                  <div className="flex gap-1">
                    {isMobileDevice ? (
                      <button
                        type="button"
                        onPointerDownCapture={(e) => {
                          e.stopPropagation();
                          openMobileKeypad("right");
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openMobileKeypad("right");
                        }}
                        className={`h-6 sm:h-9 w-full text-center font-mono rounded-md border bg-background px-3 flex items-center justify-center ${
                          mobileKeypadAction === "right" ? "border-primary/60" : "border-input"
                        } ${problemInputsDisabled ? "opacity-50" : ""}`}
                        aria-label="Answer (Right)"
                        aria-disabled={problemInputsDisabled}
                      >
                        {answers.right.length > 0 ? answers.right : "?"}
                      </button>
                    ) : (
                      <Input
                        ref={rightRef}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={answers.right}
                        onChange={e => setAnswers(prev => ({ ...prev, right: e.target.value }))}
                        onKeyDown={handleKeyDown("right")}
                        placeholder="?"
                        className="h-6 sm:h-9 text-center font-mono"
                        disabled={problemInputsDisabled}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground text-xs py-1.5 sm:py-4">
                  Edge
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Boost problem */}
      <div ref={boostCardWrapperRef}>
        <Card
          className={`border-brand/60 bg-brand/5 transition-colors ${
            isMobileDevice ? "cursor-pointer select-none" : ""
          } ${
            isMobileDevice && mobileKeypadAction === "boost"
              ? "ring-2 ring-primary/40"
              : ""
          }`}
          onPointerDownCapture={
            isMobileDevice ? () => openMobileKeypad("boost") : undefined
          }
          onClick={isMobileDevice ? () => openMobileKeypad("boost") : undefined}
          onKeyDown={
            isMobileDevice
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openMobileKeypad("boost");
                  }
                }
              : undefined
          }
          role={isMobileDevice ? "button" : undefined}
          tabIndex={isMobileDevice ? 0 : undefined}
          aria-label={isMobileDevice ? "Select boost problem" : undefined}
          aria-pressed={isMobileDevice ? mobileKeypadAction === "boost" : undefined}
        >
          <CardContent className="px-2 py-0.5 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-5 w-5 sm:h-7 sm:w-7 shrink-0 place-items-center rounded-[3px] border border-brand font-mono text-xs sm:text-sm font-semibold text-brand" aria-hidden="true">
                  +
                </div>
                <div>
                  <div className="font-mono text-[10px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                    BOOST +3m (Harder)
                  </div>
                  <div className="text-base sm:text-2xl font-mono font-bold leading-none">
                    {problems.boost.a} {problems.boost.operation} {problems.boost.b}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isMobileDevice ? (
                  <button
                    type="button"
                    onPointerDownCapture={(e) => {
                      e.stopPropagation();
                      openMobileKeypad("boost");
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openMobileKeypad("boost");
                    }}
                    className={`h-7 sm:h-10 w-20 sm:w-24 text-center font-mono text-base sm:text-lg rounded-md border bg-background px-3 flex items-center justify-center ${
                      mobileKeypadAction === "boost" ? "border-primary/60" : "border-input"
                    } ${problemInputsDisabled ? "opacity-50" : ""}`}
                    aria-label="Answer (Boost)"
                    aria-disabled={problemInputsDisabled}
                  >
                    {answers.boost.length > 0 ? answers.boost : "?"}
                  </button>
                ) : (
                  <Input
                    ref={boostRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={answers.boost}
                    onChange={e => setAnswers(prev => ({ ...prev, boost: e.target.value }))}
                    onKeyDown={handleKeyDown("boost")}
                    placeholder="?"
                    className="h-7 sm:h-10 w-20 sm:w-24 text-center font-mono text-base sm:text-lg"
                    disabled={problemInputsDisabled}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keyboard hints */}
      {!isMobileDevice && (
        <div className="text-center text-xs text-muted-foreground">
          Type answer and press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">Enter</kbd> to submit
        </div>
      )}

      {/* Mobile custom keypad */}
      {isMobileDevice && isMobileKeypadOpen && (
        <MobileNumpad
          value={answers[mobileKeypadAction] ?? ""}
          setValue={setMobileKeypadValue}
          variant="compact"
          onDone={() => handleSubmit(mobileKeypadAction)}
          disabled={problemInputsDisabled}
        />
      )}
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
  showRatingChange?: boolean;
}

function ResultsScreen({ results, myRatingChange, myPlayerId, onPlayAgain, onLeave, showRatingChange }: ResultsProps) {
  const myResult = results.find(r => r.playerId === myPlayerId);
  const isWinner = myResult?.position === 1;
  const showRating = showRatingChange ?? myRatingChange !== 0;

  const formatTime = (ms: number | null) => {
    if (ms === null) return "DNF";
    const seconds = ms / 1000;
    return `${seconds.toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Winner banner */}
      {isWinner ? (
        <div className="ink-panel relative overflow-hidden rounded-[3px] border p-6 text-center">
          <div className="dot-field pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative">
            <AsciiMorph shapes={["trophy"]} accent className="mx-auto mb-4 w-28" />
            <h2 className="mb-1 font-serif text-3xl font-normal tracking-tight">Victory</h2>
            {showRating ? (
              <div className="mt-2 font-mono text-xl font-semibold tabular-nums text-brand">
                {myRatingChange >= 0 ? "+" : ""}{myRatingChange} rating
              </div>
            ) : (
              <div className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-background/60">
                Unrated race
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-[3px] border border-border border-t-2 border-t-foreground p-6 text-center">
          <AsciiMorph shapes={["trophy"]} animate={false} className="mx-auto mb-4 w-24 opacity-60" />
          <h2 className="mb-1 font-serif text-3xl font-normal tracking-tight">
            {`${getOrdinal(myResult?.position || 0)} Place`}
          </h2>
          {showRating ? (
            <div className={`mt-2 font-mono text-xl font-semibold tabular-nums ${
              myRatingChange >= 0 ? "text-brand" : "text-muted-foreground"
            }`}>
              {myRatingChange >= 0 ? "+" : ""}{myRatingChange} rating
            </div>
          ) : (
            <div className="mt-2">
              <StatusBadge kind="neutral" label="Unrated race" />
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Race Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {results.map((result) => {
              const isMe = result.playerId === myPlayerId;
              return (
                <div
                  key={result.playerId}
                  className={`flex items-center gap-4 p-3 rounded-[3px] ${
                    isMe ? "border-2 border-foreground bg-secondary/40" : "bg-secondary/30"
                  }`}
                >
                  <MedalMark rank={result.position} />
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
                  {showRating ? (
                    <div className={`text-sm font-medium ${
                      result.ratingChange >= 0 ? "text-success" : "text-destructive"
                    }`}>
                      {result.ratingChange >= 0 ? "+" : ""}{result.ratingChange}
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-muted-foreground">—</div>
                  )}
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

export function RacingMode({ initialPrivateRoomCode }: { initialPrivateRoomCode?: string } = {}) {
  const { data: session } = useSession();
  const isMobileDevice = useIsMobileDevice();
  const trackTopRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);
  const queueTrackedRef = useRef(false);
  const resultTrackedRef = useRef(false);
  const { setPinned } = useMobileTopBarPinning();
  const {
    isConnected,
    identity,
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
    resetAllState,
    getMyPlayer,
    myPlayerId,
    // Private rooms
    privateRoom,
    createPrivateRoom,
    joinPrivateRoom,
    leavePrivateRoom,
    startPrivateRace,
  } = useRaceSocket();

  const isSignedIn = !!session?.user?.id;
  const playerId = session?.user?.id ?? identity?.id ?? null;
  const playerName = (session?.user?.name || identity?.username || "Player") as string;
  const isGuest = !isSignedIn && !!identity?.isGuest;

  const [racingStats, setRacingStats] = useState<RacingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(isSignedIn);

  // Private room local UI state
  const [joinCode, setJoinCode] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Auto-join private room if roomCode is provided via URL
  useEffect(() => {
    if (!initialPrivateRoomCode) return;
    if (!playerId) return;
    if (privateRoom.inRoom) return;
    joinPrivateRoom(playerId, initialPrivateRoomCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrivateRoomCode, playerId]);

  const fetchRacingStats = useCallback(async () => {
    if (!isSignedIn) return;
    setStatsLoading(true);
    try {
      const res = await fetch("/api/user/racing-stats");
      const data = await res.json();
      if (!data.error) {
        setRacingStats({
          rating: data.rating ?? 0,
          races: data.races ?? 0,
          wins: data.wins ?? 0,
          podiums: data.podiums ?? 0,
          avgFinish: data.avgFinish ?? null,
          problemsSolved: data.problemsSolved ?? 0,
        });
      }
    } catch (err) {
      console.error("Failed to fetch racing stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) {
      setRacingStats(null);
      setStatsLoading(false);
      return;
    }
    void fetchRacingStats();
  }, [isSignedIn, fetchRacingStats]);

  useEffect(() => {
    if (!isSignedIn) return;
    if (!result) return;

    const timeout = setTimeout(() => {
      void fetchRacingStats();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [isSignedIn, result, fetchRacingStats]);

  useEffect(() => {
    if (!queue.inQueue) {
      queueTrackedRef.current = false;
      return;
    }
    if (queueTrackedRef.current) return;
    queueTrackedRef.current = true;
    captureAnalyticsEvent(ANALYTICS_EVENTS.multiplayerJoined, {
      multiplayer_mode: "racing",
      auth_state: isGuest ? "guest" : "authenticated",
      surface: "multiplayer_lobby",
    });
  }, [isGuest, queue.inQueue]);

  useEffect(() => {
    if (!result) {
      resultTrackedRef.current = false;
      return;
    }
    if (resultTrackedRef.current) return;
    resultTrackedRef.current = true;

    const ownResult = result.results.find((entry) => entry.playerId === (myPlayerId || playerId));
    captureAnalyticsEvent(ANALYTICS_EVENTS.multiplayerCompleted, {
      multiplayer_mode: "racing",
      auth_state: isGuest ? "guest" : "authenticated",
      surface: "multiplayer_game",
      finish_position: ownResult?.position,
      problems_solved: ownResult?.stats.problemsSolved,
      rating_changed: result.myRatingChange !== 0,
    });
  }, [isGuest, myPlayerId, playerId, result]);

  const myPlayer = (myPlayerId || playerId) ? getMyPlayer((myPlayerId || playerId)!) : null;
  const hasFinished = race.myFinishPosition !== null;
  const laneCount = race.config?.laneCount ?? lobby.config?.laneCount ?? 5;
  const defaultLane = Math.ceil(laneCount / 2);

  // On mobile, allow the global top bar (burger + logo) to scroll away while in Racing Mode.
  useEffect(() => {
    if (!isMobileDevice) return;
    setPinned(false);
    return () => setPinned(true);
  }, [isMobileDevice, setPinned]);

  useEffect(() => {
    if (!isMobileDevice) return;
    const isRacing = race.inRace && race.status === "racing";
    if (!isRacing) {
      hasAutoScrolledRef.current = false;
      return;
    }
    if (hasAutoScrolledRef.current) return;
    hasAutoScrolledRef.current = true;
    requestAnimationFrame(() => {
      const el = trackTopRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 6; // a few px of breathing room
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  }, [isMobileDevice, race.inRace, race.status]);

  // Wait for either a signed-in session or a guest identity.
  if (!playerId) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
              myPlayerId={playerId || ""}
              showRatingChange={!isGuest && result.myRatingChange !== 0}
              onPlayAgain={() => {
                resetAllState();
                joinQueue(playerId, playerName);
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

        <div className="px-3 pt-2 pb-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Track visualization */}
              <div ref={trackTopRef} className="relative z-0">
                <RaceTrack3D
                  players={race.players}
                  trackLength={race.config?.trackLength || 150}
                  laneCount={laneCount}
                  myPlayerId={myPlayerId || playerId || ""}
                  finishOrder={race.finishOrder}
                  obstacles={race.obstacles || []}
                  drops={race.drops || []}
                  myPosition={myPlayer?.position || 0}
                />
              </div>

              {/* Show finished state or problem panel */}
              <div className={hasFinished ? "mt-6" : "relative z-10 -mt-10 sm:mt-6"}>
                {hasFinished ? (
                  <Card className="border-success">
                    <CardContent className="p-8 text-center">
                      <MedalMark rank={race.myFinishPosition ?? 0} size="lg" className="mx-auto mb-4" />
                      <h2 className="text-2xl font-bold mb-2">
                        You Finished #{race.myFinishPosition}!
                      </h2>
                      <p className="text-muted-foreground">
                        Waiting for other players to finish...
                      </p>
                      <div className="mt-4 flex justify-center gap-4">
                        {race.finishOrder.map((finish) => (
                          <div key={finish.playerId} className="text-center">
                            <MedalMark rank={finish.position} className="mx-auto mb-1" />
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
                    currentLane={myPlayer?.lane || defaultLane}
                    laneCount={laneCount}
                    isOnCooldown={isOnCooldown}
                    cooldownRemaining={cooldownRemaining}
                  />
                )}
              </div>
            </div>
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
                  {race.players.map((player) => (
                    <div key={player.id} className="text-center">
                      <Avatar className="h-12 w-12 mx-auto mb-2">
                        <AvatarFallback>
                          {player.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">
                        {player.id === playerId ? "You" : player.username}
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

  // Private room lobby screen
  if (privateRoom.inRoom && privateRoom.room?.roomCode) {
    const isHost = privateRoom.youAreHost;
    const privateJoinUrl = privateRoom.joinUrl ?? (typeof window !== "undefined"
      ? `${window.location.origin}/multiplayer/private/race/${privateRoom.room.roomCode}`
      : "");
    const handleCopyPrivateLink = () => {
      if (privateJoinUrl) {
        navigator.clipboard.writeText(privateJoinUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    };

    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="border-b border-border">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Private Race Lobby</h1>
              <p className="text-sm text-muted-foreground">
                Room Code: <span className="font-mono font-bold">{privateRoom.room?.roomCode}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyPrivateLink}>
                {linkCopied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                {linkCopied ? "Copied!" : "Copy Link"}
              </Button>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {privateRoom.room?.players.length ?? 0} / 8 Players
              </span>
            </div>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            <RaceLobby3D
              players={privateRoom.room?.players ?? []}
              maxPlayers={8}
              startingIn={null}
              currentUserId={playerId || ""}
              onLeave={leavePrivateRoom}
            />
            {/* Host-only start button */}
            {isHost && (privateRoom.room?.players.length ?? 0) >= 2 && (
              <div className="mt-4 flex justify-center">
                <Button size="lg" onClick={startPrivateRace}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Race
                </Button>
              </div>
            )}
            {isHost && (privateRoom.room?.players.length ?? 0) < 2 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Waiting for at least 2 players to start...
              </p>
            )}
            {!isHost && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Waiting for the host to start the race...
              </p>
            )}
            {privateRoom.error && (
              <p className="mt-2 text-center text-sm text-destructive">{privateRoom.error}</p>
            )}
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
              maxPlayers={lobby.config?.maxPlayers ?? 5}
              startingIn={lobby.startingIn}
              currentUserId={playerId || ""}
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
            <StatusBadge
              kind={isConnected ? "connected" : "disconnected"}
              label={isConnected ? "Connected" : "Disconnected"}
            />
          </div>
        </div>
        <div className="p-4 md:p-6">
          <div className="max-w-md mx-auto text-center py-20">
            <AsciiMorph shapes={["bolt"]} animate={false} className="mx-auto mb-4 w-32 opacity-60" />
            <div className="mb-4 flex items-center justify-center gap-2">
              <AsciiSpinner className="h-4 w-4 text-sm" />
              <SectionLabel>Searching for racers</SectionLabel>
            </div>
            <h2 className="text-lg font-semibold mb-2">Finding a race...</h2>
            <p className="text-sm text-muted-foreground mb-8">
              Matching you with other players
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
        {/* Header with title and description */}
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold">Math Racers</h1>
              <p className="text-sm text-muted-foreground">
                Race to the finish by solving math problems!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {isGuest && (
                <>
                  <span className="max-w-[160px] truncate font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {playerName} · Guest · Unrated
                  </span>
                  <Link href={`/auth/signin?callbackUrl=${encodeURIComponent("/multiplayer")}`}>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      Sign in
                    </Button>
                  </Link>
                </>
              )}
              <StatusBadge
                kind={isConnected ? "connected" : "connecting"}
                label={isConnected ? "Connected" : "Connecting"}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-[3px] text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Quick Race Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[3px] border-2 border-foreground font-mono text-2xl" aria-hidden="true">
                  +
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="font-semibold text-lg">Quick Race</h2>
                  <p className="text-sm text-muted-foreground">
                    Race against 2-5 players. Solve problems to move forward, bump into opponents!
                  </p>
                </div>
                <Button
                  onClick={() => joinQueue(playerId, playerName)}
                  disabled={!isConnected}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Find Race
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Private Room Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[3px] border border-border font-mono text-2xl text-muted-foreground" aria-hidden="true">
                  ÷
                </div>
                <div className="flex-1 w-full">
                  <h2 className="font-semibold text-lg">Private Room</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Race with friends! Create a room or join with a code. Up to 8 players.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => createPrivateRoom(playerId)}
                      disabled={!isConnected}
                      className="sm:w-auto"
                    >
                      Create Room
                    </Button>
                    <div className="flex gap-2 flex-1">
                      <Input
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="Paste link or enter code"
                        className="flex-1 font-mono"
                        maxLength={8}
                      />
                      <Button
                        onClick={() => {
                          if (joinCode.trim()) {
                            joinPrivateRoom(playerId, joinCode.trim());
                            setJoinCode("");
                          }
                        }}
                        disabled={!isConnected || !joinCode.trim()}
                      >
                        Join
                      </Button>
                    </div>
                  </div>
                  {privateRoom.error && (
                    <p className="text-sm text-destructive mt-2">{privateRoom.error}</p>
                  )}
                </div>
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
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[3px] border border-border font-mono text-sm font-semibold">
                    <span>1</span>
                  </div>
                <div>
                  <p className="font-medium text-sm">Solve to Move</p>
                  <p className="text-xs text-muted-foreground">
                    Solve the forward problem to advance 1 meter
                  </p>
                </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[3px] border border-border font-mono text-sm font-semibold">
                    <span>2</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Change Lanes</p>
                    <p className="text-xs text-muted-foreground">
                      Solve left/right problems to switch lanes
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[3px] border border-border font-mono text-sm font-semibold">
                    <span>3</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Bump Opponents</p>
                    <p className="text-xs text-muted-foreground">
                      Lane change into opponents to stun them & push back
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[3px] border border-border font-mono text-sm font-semibold">
                    <span>4</span>
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
            <MetricTile label="Track length" value="150m" />
            <MetricTile label="Players" value="2-5" />
            <MetricTile label="Stun duration" value="2s" />
            <MetricTile label="Bump pushback" value="2m" />
          </div>

          {isSignedIn && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricTile label="Rating" value={statsLoading ? "—" : racingStats?.rating ?? "—"} />
              <MetricTile label="Races" value={statsLoading ? "—" : racingStats?.races ?? "—"} />
              <MetricTile label="Wins" value={statsLoading ? "—" : racingStats?.wins ?? "—"} />
              <MetricTile label="Podiums" value={statsLoading ? "—" : racingStats?.podiums ?? "—"} />
              <MetricTile
                label="Avg finish"
                value={
                  statsLoading
                    ? "—"
                    : racingStats?.avgFinish !== null && racingStats?.avgFinish !== undefined
                    ? racingStats.avgFinish
                    : "—"
                }
              />
              <MetricTile label="Problems solved" value={statsLoading ? "—" : racingStats?.problemsSolved ?? "—"} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
