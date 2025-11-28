"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  level: number;
  score: number;
  accuracy: number;
  change: "up" | "down" | "same";
  isYou?: boolean;
}

const leaderboardData: LeaderboardEntry[] = [
  { rank: 1, name: "NumberNinja", avatar: "NN", level: 31, score: 35210, accuracy: 99.2, change: "same" },
  { rank: 2, name: "MathGenius", avatar: "MG", level: 29, score: 32450, accuracy: 98.7, change: "up" },
  { rank: 3, name: "MathWizard", avatar: "MW", level: 24, score: 28470, accuracy: 97.5, change: "down" },
  { rank: 4, name: "CalcKing", avatar: "CK", level: 27, score: 27890, accuracy: 96.8, change: "up" },
  { rank: 5, name: "BrainStorm", avatar: "BS", level: 22, score: 26340, accuracy: 95.4, change: "same" },
  { rank: 6, name: "QuickCalc", avatar: "QC", level: 19, score: 21560, accuracy: 94.2, change: "up" },
  { rank: 7, name: "MathMaster", avatar: "MM", level: 21, score: 20890, accuracy: 93.8, change: "down" },
  { rank: 8, name: "NumNerd", avatar: "ND", level: 18, score: 19450, accuracy: 92.5, change: "up" },
  { rank: 9, name: "CalcPro", avatar: "CP", level: 20, score: 18920, accuracy: 91.9, change: "down" },
  { rank: 10, name: "MathStar", avatar: "MS", level: 17, score: 17650, accuracy: 90.4, change: "same" },
  { rank: 15, name: "You", avatar: "JD", level: 12, score: 12450, accuracy: 98.2, change: "up", isYou: true },
];

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-border">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">
              Global rankings
            </p>
          </div>
          <Badge variant="outline">Your Rank: #15</Badge>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Period Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Time</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="daily">Daily</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Top 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Second */}
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-2xl font-mono text-muted-foreground mb-2">2</div>
                <Avatar className="h-12 w-12 mx-auto mb-2">
                  <AvatarFallback>MG</AvatarFallback>
                </Avatar>
                <p className="font-medium">MathGenius</p>
                <p className="text-sm text-muted-foreground">32,450 pts</p>
              </CardContent>
            </Card>

            {/* First */}
            <Card className="text-center border-foreground/20">
              <CardContent className="pt-6">
                <div className="text-2xl font-mono mb-2">1</div>
                <Avatar className="h-14 w-14 mx-auto mb-2">
                  <AvatarFallback>NN</AvatarFallback>
                </Avatar>
                <p className="font-medium">NumberNinja</p>
                <p className="text-sm text-muted-foreground">35,210 pts</p>
              </CardContent>
            </Card>

            {/* Third */}
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-2xl font-mono text-muted-foreground mb-2">3</div>
                <Avatar className="h-12 w-12 mx-auto mb-2">
                  <AvatarFallback>MW</AvatarFallback>
                </Avatar>
                <p className="font-medium">MathWizard</p>
                <p className="text-sm text-muted-foreground">28,470 pts</p>
              </CardContent>
            </Card>
          </div>

          {/* Rankings Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground w-16">Rank</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Player</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Score</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Accuracy</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground w-16">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.slice(3).map((entry) => (
                    <tr
                      key={entry.rank}
                      className={`border-b border-border last:border-0 ${
                        entry.isYou ? "bg-secondary/50" : ""
                      }`}
                    >
                      <td className="p-4">
                        <span className="font-mono text-muted-foreground">{entry.rank}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{entry.avatar}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {entry.name}
                              {entry.isYou && <span className="text-muted-foreground ml-1">(You)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">Level {entry.level}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-mono text-sm">{entry.score.toLocaleString()}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-mono text-sm">{entry.accuracy}%</span>
                      </td>
                      <td className="p-4 text-right">
                        {entry.change === "up" && <ArrowUp className="w-4 h-4 text-success inline" />}
                        {entry.change === "down" && <ArrowDown className="w-4 h-4 text-destructive inline" />}
                        {entry.change === "same" && <Minus className="w-4 h-4 text-muted-foreground inline" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
