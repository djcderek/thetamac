"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/sidebar-provider";
import { UserMenu } from "@/components/auth/user-menu";
import { useMobileTopBarPinning } from "@/components/mobile-top-bar-pinning";

export function MobileTopBar() {
  const { toggle } = useSidebar();
  const { isPinned } = useMobileTopBarPinning();

  return (
    <header
      className={[
        "h-14 bg-background border-b border-border z-50 flex items-center justify-between px-4 md:hidden",
        isPinned ? "fixed top-0 left-0 right-0" : "relative",
      ].join(" ")}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center">
          <span className="text-background text-xs font-bold">θ</span>
        </div>
        <span className="font-semibold">thetamac</span>
      </Link>

      {/* Right side: User menu and hamburger */}
      <div className="flex items-center gap-2">
        <UserMenu collapsed />
        <button
          onClick={toggle}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
