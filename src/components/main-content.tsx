"use client";

import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-provider";
import { useMobileTopBarPinning } from "@/components/mobile-top-bar-pinning";
import { ReactNode } from "react";

export function MainContent({ children }: { children: ReactNode }) {
  const { isCollapsed, isMobile } = useSidebar();
  const { isPinned } = useMobileTopBarPinning();

  return (
    <main
      className={cn(
        "flex-1 transition-all duration-300",
        // On mobile: full width with top padding for the fixed top bar
        // On desktop: left margin for the sidebar
        isMobile 
          ? cn("ml-0", isPinned ? "pt-14" : "pt-0")
          : isCollapsed 
            ? "ml-[60px]" 
            : "ml-[240px]"
      )}
    >
      {children}
    </main>
  );
}

