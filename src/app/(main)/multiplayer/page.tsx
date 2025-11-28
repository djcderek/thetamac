"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Swords,
  Users,
  Clock,
  Play,
  Search,
  Circle,
} from "lucide-react";

interface Player {
  id: string;
  name: string;
  avatar: string;
  level: number;
  status: "online" | "in-game" | "offline";
}

const onlinePlayers: Player[] = [
  { id: "1", name: "MathWizard", avatar: "MW", level: 24, status: "online" },
  { id: "2", name: "QuickCalc", avatar: "QC", level: 19, status: "online" },
  { id: "3", name: "NumberNinja", avatar: "NN", level: 31, status: "in-game" },
  { id: "4", name: "BrainStorm", avatar: "BS", level: 22, status: "online" },
  { id: "5", name: "CalcMaster", avatar: "CM", level: 17, status: "online" },
];

const recentMatches = [
  { opponent: "MathWizard", result: "win", score: "7-3", time: "5 min ago" },
  { opponent: "QuickCalc", result: "lose", score: "4-6", time: "23 min ago" },
  { opponent: "BrainStorm", result: "win", score: "8-2", time: "1 hour ago" },
];

export default function MultiplayerPage() {
  const [matchState, setMatchState] = useState<"lobby" | "searching" | "found" | "playing">("lobby");
  const [searchTime, setSearchTime] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [currentProblem, setCurrentProblem] = useState({ a: 47, b: 28, op: "+", answer: 75 });
  const [userAnswer, setUserAnswer] = useState("");
  const [roundTime, setRoundTime] = useState(10);
  const [currentRound, setCurrentRound] = useState(1);

  useEffect(() => {
    if (matchState === "searching") {
      const interval = setInterval(() => {
        setSearchTime((prev) => prev + 1);
      }, 1000);

      const timeout = setTimeout(() => {
        setMatchState("found");
        setTimeout(() => {
          setMatchState("playing");
        }, 2000);
      }, Math.random() * 2000 + 2000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [matchState]);

  useEffect(() => {
    if (matchState === "playing" && roundTime > 0) {
      const timer = setInterval(() => {
        setRoundTime((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [matchState, roundTime]);

  const startSearch = () => {
    setMatchState("searching");
    setSearchTime(0);
  };

  const cancelSearch = () => {
    setMatchState("lobby");
    setSearchTime(0);
  };

  const submitAnswer = () => {
    if (parseInt(userAnswer) === currentProblem.answer) {
      setPlayerScore((prev) => prev + 1);
    } else {
      setOpponentScore((prev) => prev + 1);
    }
    setUserAnswer("");
    setRoundTime(10);
    setCurrentRound((prev) => prev + 1);
    const a = Math.floor(Math.random() * 50) + 10;
    const b = Math.floor(Math.random() * 50) + 10;
    setCurrentProblem({ a, b, op: "+", answer: a + b });
  };

  const exitMatch = () => {
    setMatchState("lobby");
    setPlayerScore(0);
    setOpponentScore(0);
    setCurrentRound(1);
    setRoundTime(10);
  };

  return (
    <div className="min-h-screen">
      <div className="border-b border-border">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Multiplayer</h1>
            <p className="text-sm text-muted-foreground">
              Challenge other players in real-time
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            <Circle className="w-2 h-2 mr-1.5 fill-success text-success" />
            {onlinePlayers.filter((p) => p.status === "online").length} online
          </Badge>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {matchState === "lobby" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              {/* Quick Match */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                      <Swords className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-semibold">Quick Match</h2>
                      <p className="text-sm text-muted-foreground">
                        Get matched with a player of similar skill. First to 10 wins.
                      </p>
                    </div>
                    <Button onClick={startSearch}>
                      <Play className="w-4 h-4 mr-2" />
                      Find Match
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Matches */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Recent Matches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentMatches.map((match, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-3 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {match.opponent.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{match.opponent}</p>
                            <p className="text-xs text-muted-foreground">{match.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm">{match.score}</span>
                          <Badge variant={match.result === "win" ? "default" : "secondary"}>
                            {match.result === "win" ? "Won" : "Lost"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Online Players */}
            <Card className="lg:col-span-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Online Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search..." className="pl-9 h-9" />
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1">
                    {onlinePlayers.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {player.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${
                                player.status === "online"
                                  ? "bg-success"
                                  : player.status === "in-game"
                                  ? "bg-warning"
                                  : "bg-muted"
                              }`}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{player.name}</p>
                            <p className="text-xs text-muted-foreground">Level {player.level}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={player.status === "in-game"}
                        >
                          Challenge
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Searching */}
        {matchState === "searching" && (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-border border-t-foreground animate-spin" />
            <h2 className="text-lg font-semibold mb-2">Finding opponent...</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Matching you with a similar skill level
            </p>
            <p className="text-3xl font-mono mb-8">
              {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, "0")}
            </p>
            <Button variant="outline" onClick={cancelSearch}>
              Cancel
            </Button>
          </div>
        )}

        {/* Match Found */}
        {matchState === "found" && (
          <div className="max-w-lg mx-auto text-center py-20">
            <Badge className="mb-6">Match Found</Badge>
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <Avatar className="h-16 w-16 mx-auto mb-2">
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <p className="font-medium">You</p>
                <p className="text-xs text-muted-foreground">Level 12</p>
              </div>
              <span className="text-2xl font-bold text-muted-foreground">VS</span>
              <div className="text-center">
                <Avatar className="h-16 w-16 mx-auto mb-2">
                  <AvatarFallback>MW</AvatarFallback>
                </Avatar>
                <p className="font-medium">MathWizard</p>
                <p className="text-xs text-muted-foreground">Level 24</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Starting match...</p>
          </div>
        )}

        {/* Playing */}
        {matchState === "playing" && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Score Header */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">You</p>
                      <p className="text-xs text-muted-foreground">Level 12</p>
                    </div>
                    <span className="text-3xl font-mono font-bold ml-4">{playerScore}</span>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Round {currentRound}/10</p>
                    <p className="text-xl font-mono">{roundTime}s</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-mono font-bold mr-4">{opponentScore}</span>
                    <div className="text-right">
                      <p className="font-medium">MathWizard</p>
                      <p className="text-xs text-muted-foreground">Level 24</p>
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>MW</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timer Progress */}
            <Progress value={(roundTime / 10) * 100} className="h-1" />

            {/* Problem */}
            <Card>
              <CardContent className="p-16 text-center">
                <div className="text-6xl font-mono font-semibold tracking-wide mb-8">
                  {currentProblem.a} {currentProblem.op} {currentProblem.b}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitAnswer();
                  }}
                >
                  <Input
                    type="number"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="?"
                    className="h-14 text-center text-2xl font-mono max-w-[200px] mx-auto"
                    autoFocus
                  />
                </form>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button variant="ghost" onClick={exitMatch} className="text-muted-foreground">
                Forfeit
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
