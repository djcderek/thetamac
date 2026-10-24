"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

/**
 * The one-time "new" notice on the Quant tab. It shows until it's dismissed, the tab is
 * clicked, or a quant page is opened, and then never again in this browser. Anyone who has
 * already used the course here (it leaves progress keys behind) never sees it.
 */

const KEY = "quant-new-seen";
const listeners = new Set<() => void>();

function seen(): boolean {
  try {
    if (localStorage.getItem(KEY) === "1") return true;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("quant-read:") || key?.startsWith("quant-types:") || key === "quant-puzzles") return true;
    }
    return false;
  } catch {
    // Without storage it couldn't stay dismissed, so it isn't shown at all.
    return true;
  }
}

export function dismissQuantNotice() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether to show the notice. Never on the server or a quant page; opening one dismisses it. */
export function useQuantNotice(): boolean {
  const pathname = usePathname();
  const onQuant = pathname === "/quant" || pathname.startsWith("/quant/");
  const unseen = useSyncExternalStore(subscribe, () => !seen(), () => false);

  useEffect(() => {
    if (onQuant && unseen) dismissQuantNotice();
  }, [onQuant, unseen]);

  return unseen && !onQuant;
}
