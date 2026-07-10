"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Brain,
  Swords,
  Settings,
  X,
  LayoutDashboard,
  Trophy,
  Info,
} from "lucide-react";
import { useSidebar } from "@/components/sidebar-provider";
import { LogoMark } from "@/components/brand/logo-mark";

// Primary navigation - prioritized for mobile as per plan
const primaryNavigation = [
  { name: "Multiplayer", href: "/multiplayer", icon: Swords },
  { name: "Training", href: "/", icon: Brain },
  { name: "Settings", href: "/settings", icon: Settings },
];

// Secondary navigation - accessible but lower priority
const secondaryNavigation = [
  { name: "About", href: "/about", icon: Info },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

export function MobileNavDrawer() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed top-2 right-2 h-[calc(100vh-1rem)] w-[min(320px,calc(100vw-1rem))] overflow-hidden rounded-2xl bg-sidebar border border-sidebar-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-dashed border-border">
          <Link href="/" onClick={close} className="flex items-center gap-2">
            <LogoMark size={24} />
            <span className="font-semibold">thetamac</span>
          </Link>
          <button
            onClick={close}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary navigation */}
        <nav className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Play
          </p>
          <div className="space-y-1">
            {primaryNavigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/" || pathname.startsWith("/training")
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "flex min-h-11 items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors",
                    isActive
                      ? "bg-brand/12 text-foreground font-semibold ring-1 ring-inset ring-brand/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Secondary navigation */}
        <nav className="p-4 pt-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Explore
          </p>
          <div className="space-y-1">
            {secondaryNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "flex min-h-11 items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors",
                    isActive
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}
