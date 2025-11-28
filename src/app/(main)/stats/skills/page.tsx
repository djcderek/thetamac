"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  LineChart,
  Line,
} from "recharts";
import Link from "next/link";

const skillsOverview = [
  { name: "Addition", accuracy: 92, speed: 1.8, problems: 4521, trend: "up" },
  { name: "Subtraction", accuracy: 87, speed: 2.1, problems: 3847, trend: "up" },
  { name: "Multiplication", accuracy: 78, speed: 2.8, problems: 2934, trend: "same" },
  { name: "Division", accuracy: 65, speed: 3.4, problems: 1545, trend: "down" },
];

const radarData = [
  { skill: "Addition", value: 92 },
  { skill: "Subtraction", value: 87 },
  { skill: "Multiplication", value: 78 },
  { skill: "Division", value: 65 },
];

const additionHistory = [
  { week: "W1", accuracy: 85 },
  { week: "W2", accuracy: 87 },
  { week: "W3", accuracy: 89 },
  { week: "W4", accuracy: 92 },
];

const subtractionHistory = [
  { week: "W1", accuracy: 80 },
  { week: "W2", accuracy: 82 },
  { week: "W3", accuracy: 85 },
  { week: "W4", accuracy: 87 },
];

const multiplicationHistory = [
  { week: "W1", accuracy: 75 },
  { week: "W2", accuracy: 76 },
  { week: "W3", accuracy: 77 },
  { week: "W4", accuracy: 78 },
];

const divisionHistory = [
  { week: "W1", accuracy: 70 },
  { week: "W2", accuracy: 68 },
  { week: "W3", accuracy: 66 },
  { week: "W4", accuracy: 65 },
];

const difficultyBreakdown = [
  { name: "Easy (1-12)", addition: 98, subtraction: 95, multiplication: 92, division: 85 },
  { name: "Medium (13-25)", addition: 94, subtraction: 89, multiplication: 78, division: 68 },
  { name: "Hard (26-50)", addition: 88, subtraction: 82, multiplication: 65, division: 52 },
  { name: "Expert (51-100)", addition: 82, subtraction: 75, multiplication: 55, division: 40 },
];

// Digit length breakdowns
const digitLengthData = [
  { type: "1×1 digit", accuracy: 96, speed: 1.2, count: 2450 },
  { type: "2×1 digit", accuracy: 89, speed: 1.9, count: 1890 },
  { type: "2×2 digit", accuracy: 72, speed: 3.1, count: 1245 },
  { type: "3×1 digit", accuracy: 68, speed: 3.8, count: 567 },
];

// Special number patterns
const specialNumbersData = {
  addition: [
    { pattern: "+10", accuracy: 99, speed: 0.6, tip: "Just increase tens digit" },
    { pattern: "+9", accuracy: 96, speed: 0.9, tip: "+10 then -1" },
    { pattern: "+11", accuracy: 95, speed: 1.0, tip: "+10 then +1" },
    { pattern: "doubles", accuracy: 94, speed: 0.8, tip: "Same number twice (6+6)" },
    { pattern: "near doubles", accuracy: 88, speed: 1.2, tip: "Double then adjust (6+7)" },
    { pattern: "make 10", accuracy: 91, speed: 1.1, tip: "Find pairs that sum to 10" },
    { pattern: "+100", accuracy: 98, speed: 0.7, tip: "Increase hundreds digit" },
    { pattern: "bridging 10", accuracy: 82, speed: 1.5, tip: "8+5 = 8+2+3 = 13" },
  ],
  subtraction: [
    { pattern: "−10", accuracy: 98, speed: 0.7, tip: "Decrease tens digit" },
    { pattern: "−9", accuracy: 94, speed: 1.0, tip: "−10 then +1" },
    { pattern: "−11", accuracy: 93, speed: 1.1, tip: "−10 then −1" },
    { pattern: "−100", accuracy: 97, speed: 0.8, tip: "Decrease hundreds digit" },
    { pattern: "from 10", accuracy: 96, speed: 0.9, tip: "10−7=3, memorize complements" },
    { pattern: "from 100", accuracy: 85, speed: 1.4, tip: "Find what adds to 100" },
    { pattern: "borrowing", accuracy: 72, speed: 2.1, tip: "32−17: borrow from tens" },
    { pattern: "counting up", accuracy: 78, speed: 1.8, tip: "43−38: count 38→43" },
  ],
  multiplication: [
    { pattern: "×10", accuracy: 99, speed: 0.8, tip: "Just add a zero!" },
    { pattern: "×5", accuracy: 95, speed: 1.1, tip: "Half of ×10" },
    { pattern: "×2", accuracy: 98, speed: 0.7, tip: "Double the number" },
    { pattern: "×4", accuracy: 92, speed: 1.2, tip: "Double twice" },
    { pattern: "×11", accuracy: 88, speed: 1.5, tip: "Split and add: 11×23=253" },
    { pattern: "×9", accuracy: 82, speed: 1.8, tip: "×10 minus the number" },
    { pattern: "×25", accuracy: 75, speed: 2.4, tip: "÷4 then ×100" },
    { pattern: "×12", accuracy: 78, speed: 2.1, tip: "×10 + ×2" },
    { pattern: "×6", accuracy: 85, speed: 1.6, tip: "×3 then ×2" },
    { pattern: "×7", accuracy: 72, speed: 2.3, tip: "Tricky - memorize tables" },
    { pattern: "×8", accuracy: 76, speed: 2.0, tip: "Double three times" },
    { pattern: "squares", accuracy: 80, speed: 1.9, tip: "n×n - memorize 1-12" },
  ],
  division: [
    { pattern: "÷10", accuracy: 98, speed: 0.9, tip: "Remove a zero" },
    { pattern: "÷5", accuracy: 92, speed: 1.3, tip: "×2 then ÷10" },
    { pattern: "÷2", accuracy: 96, speed: 1.0, tip: "Half the number" },
    { pattern: "÷4", accuracy: 85, speed: 1.6, tip: "Half, then half again" },
    { pattern: "÷3", accuracy: 72, speed: 2.5, tip: "Check if sum of digits ÷3" },
    { pattern: "÷6", accuracy: 68, speed: 2.7, tip: "÷2 then ÷3" },
    { pattern: "÷7", accuracy: 58, speed: 3.2, tip: "Most challenging - memorize!" },
    { pattern: "÷8", accuracy: 65, speed: 2.9, tip: "Half three times" },
    { pattern: "÷9", accuracy: 70, speed: 2.6, tip: "Check digit sum pattern" },
    { pattern: "÷11", accuracy: 62, speed: 3.0, tip: "Alternating digit sums" },
    { pattern: "÷12", accuracy: 60, speed: 3.1, tip: "÷4 then ÷3 or ÷3 then ÷4" },
    { pattern: "÷25", accuracy: 72, speed: 2.8, tip: "×4 then ÷100" },
  ],
};

// Number range performance
const numberRangeData = [
  { range: "1-10", accuracy: 98, problems: 3240 },
  { range: "11-20", accuracy: 94, problems: 2890 },
  { range: "21-50", accuracy: 85, problems: 2156 },
  { range: "51-100", accuracy: 72, problems: 1450 },
  { range: "100+", accuracy: 61, problems: 567 },
];

// Problematic combinations
const troubleSpots = [
  { problem: "7 × 8", yourAnswer: "54", correct: "56", times: 12 },
  { problem: "6 × 7", yourAnswer: "48", correct: "42", times: 8 },
  { problem: "8 × 9", yourAnswer: "63", correct: "72", times: 7 },
  { problem: "56 ÷ 7", yourAnswer: "9", correct: "8", times: 6 },
  { problem: "48 ÷ 6", yourAnswer: "9", correct: "8", times: 5 },
];

const SimpleTooltip = ({ 
  active, 
  payload, 
  label,
}: { 
  active?: boolean; 
  payload?: Array<{ value: number; dataKey: string }>; 
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-md shadow-md px-3 py-2">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-mono">
            <span className="font-semibold">{entry.value}%</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function SkillCard({ skill }: { skill: typeof skillsOverview[0] }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold">{skill.name}</h3>
            <p className="text-xs text-muted-foreground">{skill.problems.toLocaleString()} problems solved</p>
          </div>
          {skill.trend === "up" && <TrendingUp className="w-4 h-4 text-success" />}
          {skill.trend === "down" && <TrendingDown className="w-4 h-4 text-destructive" />}
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Accuracy</span>
              <span className="font-mono font-medium">{skill.accuracy}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full"
                style={{ width: `${skill.accuracy}%` }}
              />
            </div>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Avg Speed</span>
            <span className="font-mono font-medium">{skill.speed}s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SkillsPage() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-border">
        <div className="px-4 md:px-6 py-4">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-lg font-semibold">Skills Breakdown</h1>
          <p className="text-sm text-muted-foreground">
            Detailed analysis of your skills by operation type
          </p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Skill Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {skillsOverview.map((skill) => (
            <SkillCard key={skill.name} skill={skill} />
          ))}
        </div>

        {/* Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Skills Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="skill" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Radar
                      name="Accuracy"
                      dataKey="value"
                      stroke="hsl(var(--foreground))"
                      fill="hsl(var(--foreground))"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Accuracy Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillsOverview} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={90} />
                    <Tooltip content={<SimpleTooltip />} cursor={{ fill: "hsl(var(--secondary))", opacity: 0.5 }} />
                    <Bar dataKey="accuracy" fill="currentColor" radius={[0, 4, 4, 0]} className="text-foreground" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trends by Skill */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progress Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="addition">
              <TabsList className="mb-4">
                <TabsTrigger value="addition">Addition</TabsTrigger>
                <TabsTrigger value="subtraction">Subtraction</TabsTrigger>
                <TabsTrigger value="multiplication">Multiplication</TabsTrigger>
                <TabsTrigger value="division">Division</TabsTrigger>
              </TabsList>

              <TabsContent value="addition">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={additionHistory}>
                      <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip content={<SimpleTooltip />} />
                      <Line type="monotone" dataKey="accuracy" stroke="currentColor" strokeWidth={2} className="text-foreground" dot={{ r: 4, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-success" /> +7% improvement this month
                </p>
              </TabsContent>

              <TabsContent value="subtraction">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={subtractionHistory}>
                      <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[75, 95]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip content={<SimpleTooltip />} />
                      <Line type="monotone" dataKey="accuracy" stroke="currentColor" strokeWidth={2} className="text-foreground" dot={{ r: 4, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-success" /> +7% improvement this month
                </p>
              </TabsContent>

              <TabsContent value="multiplication">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={multiplicationHistory}>
                      <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[70, 85]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip content={<SimpleTooltip />} />
                      <Line type="monotone" dataKey="accuracy" stroke="currentColor" strokeWidth={2} className="text-foreground" dot={{ r: 4, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-muted-foreground" /> +3% improvement this month
                </p>
              </TabsContent>

              <TabsContent value="division">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={divisionHistory}>
                      <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[60, 75]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip content={<SimpleTooltip />} />
                      <Line type="monotone" dataKey="accuracy" stroke="currentColor" strokeWidth={2} className="text-foreground" dot={{ r: 4, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-destructive" /> -5% this month - needs practice
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Detailed Breakdown Section */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Detailed Breakdown</h2>
        </div>

        {/* Digit Length Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Performance by Digit Length</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {digitLengthData.map((item) => (
                <div key={item.type} className="p-4 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-3">{item.type}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className="font-mono font-medium">{item.accuracy}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground rounded-full"
                        style={{ width: `${item.accuracy}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span>{item.speed}s avg</span>
                      <span>{item.count.toLocaleString()} solved</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Special Numbers - All Operations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pattern Performance by Operation</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="multiplication">
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                <TabsTrigger value="addition">Addition</TabsTrigger>
                <TabsTrigger value="subtraction">Subtraction</TabsTrigger>
                <TabsTrigger value="multiplication">Multiplication</TabsTrigger>
                <TabsTrigger value="division">Division</TabsTrigger>
              </TabsList>

              <TabsContent value="addition">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {specialNumbersData.addition.map((item) => (
                    <div key={item.pattern} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <div className="w-16 h-8 rounded bg-secondary flex items-center justify-center font-mono text-sm font-medium flex-shrink-0">
                        {item.pattern}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground truncate">{item.tip}</span>
                          <span className="text-xs font-mono font-medium ml-2">{item.accuracy}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-foreground rounded-full" style={{ width: `${item.accuracy}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">{item.speed}s</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="subtraction">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {specialNumbersData.subtraction.map((item) => (
                    <div key={item.pattern} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <div className="w-16 h-8 rounded bg-secondary flex items-center justify-center font-mono text-sm font-medium flex-shrink-0">
                        {item.pattern}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground truncate">{item.tip}</span>
                          <span className="text-xs font-mono font-medium ml-2">{item.accuracy}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-foreground rounded-full" style={{ width: `${item.accuracy}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">{item.speed}s</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="multiplication">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {specialNumbersData.multiplication.map((item) => (
                    <div key={item.pattern} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <div className="w-16 h-8 rounded bg-secondary flex items-center justify-center font-mono text-sm font-medium flex-shrink-0">
                        {item.pattern}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground truncate">{item.tip}</span>
                          <span className="text-xs font-mono font-medium ml-2">{item.accuracy}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-foreground rounded-full" style={{ width: `${item.accuracy}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">{item.speed}s</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="division">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {specialNumbersData.division.map((item) => (
                    <div key={item.pattern} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <div className="w-16 h-8 rounded bg-secondary flex items-center justify-center font-mono text-sm font-medium flex-shrink-0">
                        {item.pattern}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground truncate">{item.tip}</span>
                          <span className="text-xs font-mono font-medium ml-2">{item.accuracy}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-foreground rounded-full" style={{ width: `${item.accuracy}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">{item.speed}s</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Number Range Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Performance by Number Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={numberRangeData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<SimpleTooltip />} cursor={{ fill: "hsl(var(--secondary))", opacity: 0.5 }} />
                  <Bar dataKey="accuracy" fill="currentColor" radius={[4, 4, 0, 0]} className="text-foreground" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground">
              {numberRangeData.map((item) => (
                <div key={item.range} className="text-center">
                  <span className="font-mono text-foreground">{item.problems.toLocaleString()}</span>
                  <span className="block">{item.range}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trouble Spots */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Common Mistakes</CardTitle>
              <p className="text-xs text-muted-foreground">Problems you miss most often</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">Problem</th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">Your Answer</th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">Correct</th>
                    <th className="text-right py-2 text-xs font-medium text-muted-foreground">Times Missed</th>
                  </tr>
                </thead>
                <tbody>
                  {troubleSpots.map((item, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-3 font-mono font-medium">{item.problem}</td>
                      <td className="py-3 font-mono text-destructive">{item.yourAnswer}</td>
                      <td className="py-3 font-mono text-success">{item.correct}</td>
                      <td className="py-3 text-right text-sm text-muted-foreground">{item.times}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Tip: Focus on these specific problems during your next practice session.
            </p>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <Target className="w-4 h-4 mt-0.5 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Focus on Division</p>
                  <p className="text-xs text-muted-foreground">Your division accuracy is 65%. We recommend practicing division for the next few sessions.</p>
                  <Link href="/training">
                    <Button size="sm" className="mt-2">
                      <Zap className="w-3 h-3 mr-1" />
                      Practice Division
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <Clock className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Improve Multiplication Speed</p>
                  <p className="text-xs text-muted-foreground">Your multiplication speed is 2.8s. Try the speed training mode to get under 2s.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <TrendingUp className="w-4 h-4 mt-0.5 text-success" />
                <div>
                  <p className="text-sm font-medium">Great progress on Addition!</p>
                  <p className="text-xs text-muted-foreground">You&apos;ve mastered addition with 92% accuracy. Keep it up!</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

