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
        // On mobile, always use collapsed margin since sidebar is collapsed by default
        // On desktop, respect the isCollapsed state
        isMobile || isCollapsed ? "ml-[60px]" : "ml-[240px]"
      )}
    >
      {children}
    </main>
  );
}

