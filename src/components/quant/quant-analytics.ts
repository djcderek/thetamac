"use client";

import { useEffect, useRef } from "react";
import { ANALYTICS_EVENTS, type AnalyticsProperties } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";

/**
 * Analytics for the quant course, so it's clear which parts get used and which locks lead to
 * upgrades. Every event carries `feature: "quant"`; a lock's `surface` matches the `source` on
 * its upgrade link, so a click can be followed through to checkout.
 */

/** Clicking through a quant lock to the pricing page. */
export function trackQuantUpgradeClick(surface: string, properties: AnalyticsProperties = {}) {
  captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, { feature: "quant", surface, action: "open_pricing", ...properties });
}

/** Records a quant lock once, when it's shown. */
export function useQuantGateViewed(surface: string, shown: boolean, signedIn: boolean, properties: AnalyticsProperties = {}) {
  const seen = useRef<string | null>(null);
  const extra = JSON.stringify(properties);
  useEffect(() => {
    if (!shown || seen.current === surface) return;
    seen.current = surface;
    captureAnalyticsEvent(ANALYTICS_EVENTS.premiumGateViewed, {
      feature: "quant",
      surface,
      auth_state: signedIn ? "authenticated" : "guest",
      plan: "free",
      ...(JSON.parse(extra) as AnalyticsProperties),
    });
  }, [shown, surface, signedIn, extra]);
}
