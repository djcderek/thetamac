"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/auth/user-menu";
import { FeatureRequestDialog } from "@/components/feature-request-dialog";
import { LogoMark } from "@/components/brand/logo-mark";

// Kurb-style top bar: wordmark left, pill navigation centered, account on the right.
// It replaces the dashboard-template left sidebar on desktop; phones keep MobileTopBar.
export const primaryNavigation = [
  { name: "Train", href: "/" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Multiplayer", href: "/multiplayer" },
  { name: "Leaderboard", href: "/leaderboard" },
];

export function isNavItemActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/training");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader() {
  const pathname = usePathname();

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
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.name}
              </Link>
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
