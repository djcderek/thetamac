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
  PanelLeftClose,
  PanelLeft,
  ShoppingBag,
} from "lucide-react";
import { useSidebar } from "@/components/sidebar-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserMenu } from "@/components/auth/user-menu";

const navigation = [
  { name: "Training", href: "/training", icon: Brain },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Multiplayer", href: "/multiplayer", icon: Swords },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Shop", href: "/shop", icon: ShoppingBag },
];

const secondaryNav = [
  { name: "Settings", href: "/settings", icon: Settings },
];

function ThetamacMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={cn("w-5 h-5 shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="50" r="40" />
        <path d="M 12 55 Q 50 25 88 55" />
      </g>
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggle } = useSidebar();

  // On desktop, showExpanded is based on isCollapsed state
  const showExpanded = !isCollapsed;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen border-r border-border bg-background flex-col transition-all duration-300 z-50",
        "hidden md:flex", // Hide on mobile - MobileTopBar + MobileNavDrawer handle mobile nav
        isCollapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "h-14 flex items-center border-b border-border",
          showExpanded ? "justify-between px-3" : "justify-center px-2"
        )}
      >
        {showExpanded && (
          <Link href="/" className="flex items-center gap-2">
            <ThetamacMark className="text-foreground" />
            <span className="font-semibold">thetamac</span>
          </Link>
        )}
        <button
          onClick={toggle}
          className={cn(
            "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors",
            !showExpanded && "p-2"
          )}
        >
          {isCollapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const linkContent = (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  !showExpanded && "justify-center px-2"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span
                  className={cn(
                    "whitespace-nowrap transition-all duration-300",
                    !showExpanded ? "opacity-0 w-0 hidden" : "opacity-100"
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );

            if (!showExpanded) {
              return (
                <Tooltip key={item.name} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.name}>{linkContent}</div>;
          })}
        </div>
      </nav>

      {/* Secondary Nav */}
      <div className="p-2 border-t border-border">
        {secondaryNav.map((item) => {
          const isActive = pathname === item.href;
          const linkContent = (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                !showExpanded && "justify-center px-2"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span
                className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  !showExpanded ? "opacity-0 w-0 hidden" : "opacity-100"
                )}
              >
                {item.name}
              </span>
            </Link>
          );

          if (!showExpanded) {
            return (
              <Tooltip key={item.name} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {item.name}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.name}>{linkContent}</div>;
        })}
      </div>

      {/* User Menu */}
      <div className="p-2 border-t border-border">
        <UserMenu collapsed={!showExpanded} />
      </div>
    </aside>
  );
}
