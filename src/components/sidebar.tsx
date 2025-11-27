"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Brain,
  Swords,
  Trophy,
  Settings,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Training", href: "/training", icon: Brain },
  { name: "Multiplayer", href: "/multiplayer", icon: Swords },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

const secondaryNav = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] border-r border-border bg-background flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center">
            <span className="text-background text-xs font-bold">θ</span>
          </div>
          <span className="font-semibold">ThetaMac</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Secondary Nav */}
      <div className="p-2 border-t border-border">
        {secondaryNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
