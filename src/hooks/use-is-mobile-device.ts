"use client";

import { useEffect, useState } from "react";

/**
 * Detects "mobile-like" devices (phones + iPads) using the same heuristics as `duel-mode`.
 * This is intentionally UA-based (not viewport-based) to match real device behavior.
 */
export function useIsMobileDevice() {
  const [isMobileDevice, setIsMobileDevice] = useState(() => {
    if (typeof navigator === "undefined") return false;

    const ua = navigator.userAgent || "";
    const platform = (navigator as unknown as { platform?: string }).platform || "";
    const maxTouchPoints = (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints || 0;

    // iPadOS 13+ often reports as Mac; this heuristic catches it.
    const isIPad = /iPad/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
    const isPhoneLike = /Android|iPhone|iPod|Windows Phone|Mobile/i.test(ua);

    const uaDataMobile =
      "userAgentData" in navigator
        ? !!(navigator as unknown as { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile
        : false;

    return uaDataMobile || isIPad || isPhoneLike;
  });

  useEffect(() => {
    // Keep detection fresh in cases where UA/client hints become available after hydration.
    if (typeof navigator === "undefined") return;
    const t = window.setTimeout(() => {
      setIsMobileDevice((prev) => {
        const ua = navigator.userAgent || "";
        const platform = (navigator as unknown as { platform?: string }).platform || "";
        const maxTouchPoints = (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints || 0;
        const isIPad = /iPad/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
        const isPhoneLike = /Android|iPhone|iPod|Windows Phone|Mobile/i.test(ua);
        const uaDataMobile =
          "userAgentData" in navigator
            ? !!(navigator as unknown as { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile
            : false;
        const next = uaDataMobile || isIPad || isPhoneLike;
        return next === prev ? prev : next;
      });
    }, 0);

    return () => window.clearTimeout(t);
  }, []);

  return isMobileDevice;
}


