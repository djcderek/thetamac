"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { snapSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/auth/user-menu";
import { FeatureRequestDialog } from "@/components/feature-request-dialog";
import { LogoMark } from "@/components/brand/logo-mark";
import { dismissQuantNotice, useQuantNotice } from "@/components/quant/quant-new-notice";

// Kurb-style top bar: wordmark left, pill navigation centered, account on the right.
// It replaces the dashboard-template left sidebar on desktop; phones keep MobileTopBar.
export const primaryNavigation = [
  { name: "Train", href: "/" },
  { name: "Quant", href: "/quant" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Multiplayer", href: "/multiplayer" },
  { name: "Leaderboard", href: "/leaderboard" },
];

export function isNavItemActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/training");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The one-time note under the Quant tab: what's new, and a way to close it for good. */
function QuantNotice() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.25, delay: 0.6 } }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      className="absolute left-1/2 top-full z-50 mt-3 w-max -translate-x-1/2"
    >
      <span aria-hidden="true" className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-foreground" />
      <div role="status" className="relative flex items-center gap-1 rounded-2xl bg-foreground py-1.5 pl-3.5 pr-1.5 text-[13px] text-background shadow-lg">
        <Link href="/quant" onClick={dismissQuantNotice} className="font-medium">
          <span className="text-brand">New</span> · A probability course for quant interviews
        </Link>
        <button
          type="button"
          onClick={dismissQuantNotice}
          aria-label="Dismiss"
          className="grid size-7 place-items-center rounded-full text-background/70 transition-colors hover:bg-background/15 hover:text-background"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const quantNotice = useQuantNotice();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-background/90 backdrop-blur-xl md:block">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-8">
        <Link href="/" className="flex items-center gap-2 justify-self-start">
          <LogoMark size={26} textured={false} />
          <span className="text-[17px] font-semibold tracking-[-0.03em]">thetamac</span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1 rounded-full border border-border p-1">
          {primaryNavigation.map((item) => {
            const active = isNavItemActive(item.href, pathname);
            const isQuant = item.href === "/quant";
            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={isQuant ? dismissQuantNotice : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative isolate rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {/* One pill that travels to the active page (the header persists across pages). */}
                {active && (
                  <motion.span
                    layoutId="app-nav-indicator"
                    transition={snapSpring}
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-full bg-secondary"
                  />
                )}
                {item.name}
                {isQuant && quantNotice && (
                  <>
                    <span aria-hidden="true" className="absolute right-1.5 top-1 size-1.5 rounded-full bg-brand" />
                    <span className="sr-only">, new</span>
                  </>
                )}
              </Link>
            );
            return isQuant ? (
              <div key={item.href} className="relative">
                {link}
                <AnimatePresence>{quantNotice && <QuantNotice />}</AnimatePresence>
              </div>
            ) : (
              link
            );
          })}
        </nav>

        <div className="flex items-center gap-2 justify-self-end">
          <Link
            href="/upgrade"
            className="mr-1 inline-flex items-center gap-1 text-sm font-medium text-foreground transition-colors hover:text-brand"
          >
            Upgrade
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
          <FeatureRequestDialog triggerVariant="ghost" triggerSize="icon-sm" iconOnly />
          <UserMenu variant="header" />
        </div>
      </div>
    </header>
  );
}
