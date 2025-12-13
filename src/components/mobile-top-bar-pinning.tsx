"use client";

import { createContext, useContext, useMemo, useState } from "react";

type MobileTopBarPinningContextValue = {
  /** When true, the mobile top bar is fixed and MainContent offsets with padding. */
  isPinned: boolean;
  setPinned: (next: boolean) => void;
};

const MobileTopBarPinningContext = createContext<MobileTopBarPinningContextValue | null>(null);

export function MobileTopBarPinningProvider({ children }: { children: React.ReactNode }) {
  const [isPinned, setPinned] = useState(true);

  const value = useMemo(() => ({ isPinned, setPinned }), [isPinned]);

  return (
    <MobileTopBarPinningContext.Provider value={value}>
      {children}
    </MobileTopBarPinningContext.Provider>
  );
}

export function useMobileTopBarPinning() {
  const ctx = useContext(MobileTopBarPinningContext);
  if (!ctx) {
    throw new Error("useMobileTopBarPinning must be used within MobileTopBarPinningProvider");
  }
  return ctx;
}


