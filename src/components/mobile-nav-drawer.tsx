"use client";

import { useEffect, useRef } from "react";
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
  Zap,
} from "lucide-react";
import { useSidebar } from "@/components/sidebar-provider";
import { LogoMark } from "@/components/brand/logo-mark";

// Mirrors the desktop sidebar ordering exactly
const primaryNavigation = [
  { name: "Training", href: "/", icon: Brain },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Multiplayer", href: "/multiplayer", icon: Swords },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

const secondaryNavigation = [
  { name: "Upgrade", href: "/upgrade", icon: Zap, accent: true },
  { name: "About", href: "/about", icon: Info, accent: false },
  { name: "Settings", href: "/settings", icon: Settings, accent: false },
];

export function MobileNavDrawer() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // While open: move focus in, keep Tab inside, close on Escape, and hand focus back to the
  // control that opened the drawer when it closes.
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, [isOpen, close]);

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
        ref={drawerRef}
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal={isOpen}
        aria-label="Navigation menu"
        // Closed, the drawer is only translated off-screen; inert keeps its links out of the
        // tab order and away from screen readers.
        inert={!isOpen}
        className={cn(
          "fixed top-0 right-0 h-full w-[min(320px,calc(100vw-3rem))] overflow-hidden bg-sidebar border-l border-sidebar-border z-50 transform transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <Link href="/" onClick={close} className="flex items-center gap-2">
            <LogoMark size={24} />
            <span className="font-semibold">thetamac</span>
          </Link>
          <button
            ref={closeButtonRef}
            onClick={close}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary navigation */}
        <nav className="p-4">
          <p className="editorial-label mb-3">Play</p>
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
                    "flex min-h-11 items-center gap-3 px-3 py-3 rounded-full text-sm transition-colors",
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
          <p className="editorial-label mb-3">Explore</p>
          <div className="space-y-1">
            {secondaryNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "flex min-h-11 items-center gap-3 px-3 py-3 rounded-full text-sm transition-colors",
                    isActive
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0", item.accent && "text-brand")} />
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
