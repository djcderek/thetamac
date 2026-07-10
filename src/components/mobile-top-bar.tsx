"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/sidebar-provider";
import { UserMenu } from "@/components/auth/user-menu";
import { useMobileTopBarPinning } from "@/components/mobile-top-bar-pinning";
import { LogoMark } from "@/components/brand/logo-mark";
import { FeatureRequestDialog } from "@/components/feature-request-dialog";

export function MobileTopBar() {
  const { toggle } = useSidebar();
  const { isPinned } = useMobileTopBarPinning();

  return (
    <header
      className={[
        "h-14 bg-background/90 border-b border-dashed border-border z-50 flex items-center justify-between px-4 backdrop-blur-xl md:hidden",
        isPinned ? "fixed top-0 left-0 right-0" : "relative",
      ].join(" ")}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <LogoMark size={24} />
        <span className="font-semibold tracking-[-0.03em]">thetamac</span>
      </Link>

      {/* Right side: User menu and hamburger */}
      <div className="flex items-center gap-2">
        <FeatureRequestDialog
          triggerVariant="default"
          triggerSize="icon-sm"
          iconOnly
        />
        <UserMenu collapsed />
        <button
          onClick={toggle}
          className="rounded-full border border-border bg-card p-2 text-muted-foreground transition-colors hover:border-brand/50 hover:text-foreground"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
