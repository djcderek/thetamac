"use client";

import { useState } from "react";
import { DuelMode } from "@/components/multiplayer/duel-mode";
import { RacingMode } from "@/components/multiplayer/racing-mode";
import { Swords, Flag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Mode = "duel" | "racing" | null;

export function MultiplayerClient() {
  const [mode, setMode] = useState<Mode>(null);

  if (mode === "duel") {
    return (
      <div className="flex flex-col min-h-screen bg-background animate-in fade-in duration-300">
        <div className="border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10 sm:sticky sm:top-14 md:top-16">
           <div className="container flex h-14 max-w-screen-2xl items-center px-4">
             <Button variant="ghost" size="sm" onClick={() => setMode(null)} className="gap-2 text-muted-foreground hover:text-foreground">
               <ArrowLeft className="w-4 h-4" />
               Back to Modes
             </Button>
           </div>
        </div>
        <div className="flex-1">
          <DuelMode />
        </div>
      </div>
    );
  }

  if (mode === "racing") {
    return (
      <div className="flex flex-col min-h-screen bg-background animate-in fade-in duration-300">
        <div className="border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10 sm:sticky sm:top-14 md:top-16">
           <div className="container flex h-14 max-w-screen-2xl items-center px-4">
             <Button variant="ghost" size="sm" onClick={() => setMode(null)} className="gap-2 text-muted-foreground hover:text-foreground">
               <ArrowLeft className="w-4 h-4" />
               Back to Modes
             </Button>
           </div>
        </div>
        <div className="flex-1">
          <RacingMode />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto">
        <div className="grid items-center gap-8 border-b border-border pb-10 pt-4 md:grid-cols-[minmax(0,1fr)_auto] md:pt-8">
          <div>
            <p className="editorial-label">Head to head</p>
            <h1 className="font-semibold mt-2 text-4xl tracking-tight md:text-5xl">
              Multiplayer Arena
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Challenge other players in real-time. Choose your preferred game mode to start competing.
            </p>
          </div>
          <div className="relative hidden w-fit p-4 md:block">
          </div>
        </div>

        <div className="grid md:grid-cols-2">
          {/* Duel Mode */}
          <button
            type="button"
            onClick={() => setMode("duel")}
            className="group flex h-full flex-col border-b border-border px-1 py-8 text-left transition-colors hover:bg-secondary/40 md:border-b-0 md:border-r md:pr-10"
          >
            <div className="flex items-center gap-3">
              <Swords className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold text-2xl tracking-tight">Duel Mode</h2>
            </div>
            <p className="mt-3 text-muted-foreground">
              Classic 1v1 competition. Solve math problems faster than your opponent to win rounds.
            </p>

            <dl className="mt-auto grid grid-cols-2 gap-x-6 pt-8 font-mono text-xs text-muted-foreground">
              <div className="flex justify-between border-t border-border py-2">
                <dt>Players</dt>
                <dd className="text-foreground">1 vs 1</dd>
              </div>
              <div className="flex justify-between border-t border-border py-2">
                <dt>Format</dt>
                <dd className="text-foreground">Ranked</dd>
              </div>
              <div className="flex justify-between border-t border-border py-2">
                <dt>Pace</dt>
                <dd className="text-foreground">Fast</dd>
              </div>
              <div className="flex justify-between border-t border-border py-2">
                <dt>Matching</dt>
                <dd className="text-foreground">Skill based</dd>
              </div>
            </dl>

            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline decoration-border underline-offset-4 transition-colors group-hover:decoration-foreground">
              Play Duel →
            </span>
          </button>

          {/* Racing Mode */}
          <button
            type="button"
            onClick={() => setMode("racing")}
            className="group flex h-full flex-col px-1 py-8 text-left transition-colors hover:bg-secondary/40 md:pl-10"
          >
            <div className="flex items-center gap-3">
              <Flag className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold text-2xl tracking-tight">Racing Mode</h2>
            </div>
            <p className="mt-3 text-muted-foreground">
              Race against up to 5 players. Solve to move, change lanes, and bump opponents!
            </p>

            <dl className="mt-auto grid grid-cols-2 gap-x-6 pt-8 font-mono text-xs text-muted-foreground">
              <div className="flex justify-between border-t border-border py-2">
                <dt>Players</dt>
                <dd className="text-foreground">2–5</dd>
              </div>
              <div className="flex justify-between border-t border-border py-2">
                <dt>Format</dt>
                <dd className="text-foreground">Podium</dd>
              </div>
              <div className="flex justify-between border-t border-border py-2">
                <dt>Course</dt>
                <dd className="text-foreground">Track race</dd>
              </div>
              <div className="flex justify-between border-t border-border py-2">
                <dt>Extras</dt>
                <dd className="text-foreground">Power-ups</dd>
              </div>
            </dl>

            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline decoration-border underline-offset-4 transition-colors group-hover:decoration-foreground">
              Start Racing →
            </span>
          </button>
        </div>

        <p className="border-t border-border pt-6 text-center font-mono text-xs text-muted-foreground">
          + more game modes coming soon +
        </p>
      </div>
    </div>
  );
}
