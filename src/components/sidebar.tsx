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
  X,
  Menu,
} from "lucide-react";
import { useSidebar } from "@/components/sidebar-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserMenu } from "@/components/auth/user-menu";

const navigation = [
  { name: "Training", href: "/training", icon: Brain },
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Multiplayer", href: "/multiplayer", icon: Swords },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

const secondaryNav = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, isMobile, isOpen, toggle, close } = useSidebar();

  // Determine if sidebar content should be shown expanded
  const showExpanded = isMobile ? isOpen : !isCollapsed;

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen border-r border-border bg-background flex flex-col transition-all duration-300 z-50",
          isMobile
            ? isOpen
              ? "w-[240px] shadow-xl"
              : "w-[60px]"
            : isCollapsed
            ? "w-[60px]"
            : "w-[240px]"
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
            <Link href="/" className="flex items-center gap-2" onClick={close}>
              <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center">
                <span className="text-background text-xs font-bold">θ</span>
              </div>
              <span className="font-semibold">ThetaMac</span>
            </Link>
          )}
          <button
            onClick={toggle}
            className={cn(
              "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors",
              !showExpanded && "p-2"
            )}
          >
            {isMobile ? (
              isOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )
            ) : isCollapsed ? (
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
                  onClick={close}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    !showExpanded && "justify-center px-2"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
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

              if (!showExpanded && !isMobile) {
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
                onClick={close}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  !showExpanded && "justify-center px-2"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
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

            if (!showExpanded && !isMobile) {
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
    </>
  );
}
