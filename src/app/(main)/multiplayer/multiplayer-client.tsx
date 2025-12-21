"use client";

import { useState } from "react";
import { DuelMode } from "@/components/multiplayer/duel-mode";
import { RacingMode } from "@/components/multiplayer/racing-mode";
import { Swords, Flag, ArrowLeft, Trophy, Zap, Users, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Mode = "duel" | "racing" | null;

export function MultiplayerClient() {
  const [mode, setMode] = useState<Mode>(null);

  if (mode === "duel") {
    return (
      <div className="flex flex-col min-h-screen bg-background animate-in fade-in duration-300">
        <div className="border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10 sm:sticky sm:top-0">
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
        <div className="border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10 sm:sticky sm:top-0">
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
    <div className="min-h-screen bg-background p-4 md:p-8 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Multiplayer Arena</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Challenge other players in real-time. Choose your preferred game mode to start competing.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Duel Mode Card */}
          <div 
            className="group relative cursor-pointer"
            onClick={() => setMode("duel")}
          >
            <Card className="h-full overflow-hidden border bg-card transition-all duration-300 hover:shadow-lg hover:border-violet-500">
              <CardContent className="p-8 flex flex-col h-full">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-6">
                  <Swords className="w-8 h-8 text-violet-500" />
                </div>
                
                <div className="space-y-2 mb-4">
                  <h2 className="text-2xl font-bold transition-colors">Duel Mode</h2>
                  <p className="text-muted-foreground">
                    Classic 1v1 competition. Solve math problems faster than your opponent to win rounds.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 mt-auto pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>1 vs 1</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trophy className="w-4 h-4" />
                    <span>Ranked</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Fast Paced</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="w-4 h-4" />
                    <span>Skill Based</span>
                  </div>
                </div>

                <Button className="w-full group-hover:bg-violet-600 group-hover:text-white hover:bg-violet-700! transition-all">
                  Play Duel
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Racing Mode Card */}
          <div 
            className="group relative cursor-pointer"
            onClick={() => setMode("racing")}
          >
            <Card className="h-full overflow-hidden border bg-card transition-all duration-300 hover:shadow-lg hover:border-emerald-500">
              <CardContent className="p-8 flex flex-col h-full">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mb-6">
                  <Flag className="w-8 h-8 text-emerald-500" />
                </div>
                
                <div className="space-y-2 mb-4">
                  <h2 className="text-2xl font-bold transition-colors">Racing Mode</h2>
                  <p className="text-muted-foreground">
                    Race against up to 5 players. Solve to move, change lanes, and bump opponents!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 mt-auto pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>2-5 Players</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trophy className="w-4 h-4" />
                    <span>Podium Finish</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Flag className="w-4 h-4" />
                    <span>Track Race</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="w-4 h-4" />
                    <span>Power-ups</span>
                  </div>
                </div>

                <Button className="w-full group-hover:bg-emerald-600 group-hover:text-white hover:bg-emerald-700! transition-all">
                  Start Racing
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="flex justify-center mt-12">
          <Badge variant="outline" className="px-4 py-1 text-muted-foreground">
            More game modes coming soon
          </Badge>
        </div>
      </div>
    </div>
  );
}

