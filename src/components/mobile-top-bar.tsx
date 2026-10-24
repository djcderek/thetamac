"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/sidebar-provider";
import { UserMenu } from "@/components/auth/user-menu";
import { useMobileTopBarPinning } from "@/components/mobile-top-bar-pinning";
import { LogoMark } from "@/components/brand/logo-mark";
import { FeatureRequestDialog } from "@/components/feature-request-dialog";
import { useQuantNotice } from "@/components/quant/quant-new-notice";

export function MobileTopBar() {
  const { toggle, isOpen } = useSidebar();
  const { isPinned } = useMobileTopBarPinning();
  const quantNotice = useQuantNotice();

  return (
    <header
      className={[
        "h-14 bg-background/90 border-b border-border z-50 flex items-center justify-between px-4 backdrop-blur-xl md:hidden",
        isPinned ? "fixed top-0 left-0 right-0" : "relative",
      ].join(" ")}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <LogoMark size={24} />
        <span className="text-[17px] font-semibold tracking-[-0.03em]">thetamac</span>
      </Link>

      {/* Right side: User menu and hamburger */}
      <div className="flex items-center gap-2">
        <FeatureRequestDialog
          triggerVariant="ghost"
          triggerSize="icon-sm"
          iconOnly
        />
        <UserMenu variant="header" />
        <button
          onClick={toggle}
          className="relative rounded-full bg-secondary p-2 text-foreground transition-colors hover:bg-accent"
          aria-label={quantNotice ? "Open navigation menu (new: quant course)" : "Open navigation menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-nav-drawer"
        >
          <Menu className="w-5 h-5" />
          {quantNotice && <span aria-hidden="true" className="absolute right-0.5 top-0.5 size-2 rounded-full border-2 border-secondary bg-brand" />}
        </button>
      </div>
    </header>
  );
}
