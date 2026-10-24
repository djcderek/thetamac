"use client";

import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-provider";
import { useMobileTopBarPinning } from "@/components/mobile-top-bar-pinning";
import { ReactNode } from "react";

export function MainContent({ children }: { children: ReactNode }) {
  const { isMobile } = useSidebar();
  const { isPinned } = useMobileTopBarPinning();

  return (
    // Desktop navigation is a sticky top bar, so content needs no sidebar offset. On mobile
    // the top bar is fixed, so content is padded below it.
    <main className={cn("min-w-0 flex-1", isMobile && isPinned ? "pt-14" : "pt-0")}>
      {/* One centered column, aligned with the top bar's content width. It clips sideways
          overflow only: hiding both would make it a scroll box and stop sticky bars sticking. */}
      <div className="mx-auto min-h-screen w-full max-w-6xl overflow-x-clip bg-background">{children}</div>
    </main>
  );
}
