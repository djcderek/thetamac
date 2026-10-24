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
  Dices,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSidebar } from "@/components/sidebar-provider";
import { drawerSpring } from "@/lib/motion";
import { LogoMark } from "@/components/brand/logo-mark";
import { dismissQuantNotice, useQuantNotice } from "@/components/quant/quant-new-notice";

const MotionLink = motion.create(Link);

// Mirrors the desktop sidebar ordering exactly
const primaryNavigation = [
  { name: "Training", href: "/", icon: Brain },
  { name: "Quant", href: "/quant", icon: Dices },
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
  const quantNotice = useQuantNotice();
  // The Quant row's "New" tag shows for one opening of the drawer; closing it counts as seen.
  const noticeShown = useRef(false);
  useEffect(() => {
    if (isOpen && quantNotice) noticeShown.current = true;
    if (!isOpen && noticeShown.current) {
      noticeShown.current = false;
      dismissQuantNotice();
    }
  }, [isOpen, quantNotice]);
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
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
            onClick={close}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      {/* A spring, so a quick open-close-open picks up from wherever the drawer is. */}
      <motion.aside
        ref={drawerRef}
        initial={false}
        animate={{ x: isOpen ? 0 : "100%" }}
        transition={drawerSpring}
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal={isOpen}
        aria-label="Navigation menu"
        // Closed, the drawer is only translated off-screen; inert keeps its links out of the
        // tab order and away from screen readers.
        inert={!isOpen}
        className={cn(
          "fixed top-0 right-0 h-full w-[min(320px,calc(100vw-3rem))] overflow-hidden bg-background border-l border-border z-50 md:hidden",
        )}
      >
        {/* Drawer header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <Link href="/" onClick={close} className="flex items-center gap-2">
            <LogoMark size={24} />
            <span className="text-[17px] font-semibold tracking-[-0.03em]">thetamac</span>
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
            {primaryNavigation.map((item, index) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/" || pathname.startsWith("/training")
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <MotionLink
                  key={item.name}
                  href={item.href}
                  onClick={close}
                  initial={false}
                  animate={isOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
                  transition={isOpen ? { ...drawerSpring, delay: 0.05 + index * 0.035 } : { duration: 0.15 }}
                  className={cn(
                    "flex min-h-12 items-center gap-3 px-4 py-3 rounded-2xl text-[15px] transition-colors",
                    isActive
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                  {item.href === "/quant" && quantNotice && (
                    <span className="ml-auto rounded-full bg-brand/15 px-2 py-0.5 text-[12px] font-semibold text-brand">New</span>
                  )}
                </MotionLink>
              );
            })}
          </div>
        </nav>

        {/* Secondary navigation */}
        <nav className="p-4 pt-0">
          <p className="editorial-label mb-3">Explore</p>
          <div className="space-y-1">
            {secondaryNavigation.map((item, index) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <MotionLink
                  key={item.name}
                  href={item.href}
                  onClick={close}
                  initial={false}
                  animate={isOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
                  transition={isOpen ? { ...drawerSpring, delay: 0.05 + (primaryNavigation.length + index) * 0.035 } : { duration: 0.15 }}
                  className={cn(
                    "flex min-h-12 items-center gap-3 px-4 py-3 rounded-2xl text-[15px] transition-colors",
                    isActive
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0", item.accent && "text-brand")} />
                  <span>{item.name}</span>
                </MotionLink>
              );
            })}
          </div>
        </nav>
      </motion.aside>
    </>
  );
}
