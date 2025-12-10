"use client";

import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-provider";
import { ReactNode } from "react";

export function MainContent({ children }: { children: ReactNode }) {
  const { isCollapsed, isMobile } = useSidebar();

  return (
    <main
      className={cn(
        "flex-1 transition-all duration-300",
        // On mobile: full width with top padding for the fixed top bar
        // On desktop: left margin for the sidebar
        isMobile 
          ? "ml-0 pt-14" // No left margin, padding for 56px (h-14) top bar
          : isCollapsed 
            ? "ml-[60px]" 
            : "ml-[240px]"
      )}
    >
      {children}
    </main>
  );
}

