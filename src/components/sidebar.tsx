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
  Info,
  Zap,
} from "lucide-react";
import { useSidebar } from "@/components/sidebar-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserMenu } from "@/components/auth/user-menu";
import { FeatureRequestDialog } from "@/components/feature-request-dialog";
import { LogoMark } from "@/components/brand/logo-mark";

const navigation = [
  { name: "Training", href: "/", icon: Brain },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Multiplayer", href: "/multiplayer", icon: Swords },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

const secondaryNav = [
  { name: "Upgrade", href: "/upgrade", icon: Zap, accent: true },
  { name: "About", href: "/about", icon: Info, accent: false },
  { name: "Settings", href: "/settings", icon: Settings, accent: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggle } = useSidebar();

  // On desktop, showExpanded is based on isCollapsed state
  const showExpanded = !isCollapsed;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen overflow-hidden border-r border-sidebar-border bg-sidebar flex-col transition-all duration-300 z-50",
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
            <LogoMark size={26} textured={false} />
            <span className="font-semibold tracking-[-0.03em]">thetamac</span>
          </Link>
        )}
        <button
          onClick={toggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          className={cn(
            "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors",
            !showExpanded && "p-2"
          )}
        >
          {isCollapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname.startsWith("/training")
                : pathname === item.href || pathname.startsWith(item.href + "/");
            const linkContent = (
              <Link
                key={item.name}
                href={item.href}
                // Collapsed links show only an icon, so they need a name of their own.
                aria-label={showExpanded ? undefined : item.name}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex min-h-10 items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-brand/12 text-foreground font-semibold ring-1 ring-inset ring-brand/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  !showExpanded && "justify-center px-2"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
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
        <div className="mt-3 border-t border-dashed border-border pt-3">
          {showExpanded ? (
            <FeatureRequestDialog
              triggerVariant="default"
              triggerSize="sm"
              triggerClassName="w-full justify-start"
            />
          ) : (
            <FeatureRequestDialog
              triggerVariant="default"
              triggerSize="icon-sm"
              iconOnly
              triggerClassName="w-full"
            />
          )}
        </div>
      </nav>

      {/* Secondary Nav */}
      <div className="p-2 border-t border-dashed border-border">
        {secondaryNav.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" || pathname.startsWith("/training") : pathname === item.href;
          const linkContent = (
            <Link
              key={item.name}
              href={item.href}
              aria-label={showExpanded ? undefined : item.name}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                !showExpanded && "justify-center px-2"
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", item.accent && "text-brand")} />
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
      <div className="p-2 border-t border-dashed border-border bg-secondary/20">
        <UserMenu collapsed={!showExpanded} />
      </div>
    </aside>
  );
}
