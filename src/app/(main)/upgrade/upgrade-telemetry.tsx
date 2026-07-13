"use client";

import { useEffect } from "react";
import type { UpgradeFeature } from "@/lib/upgrade";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";

export function UpgradeTelemetry({
  feature,
  source,
  upgraded,
  cancelled,
  authState,
}: {
  feature?: UpgradeFeature;
  source?: string;
  upgraded: boolean;
  cancelled: boolean;
  authState: "guest" | "authenticated";
}) {
  useEffect(() => {
    captureAnalyticsEvent(ANALYTICS_EVENTS.upgradePageViewed, {
      feature,
      entry_source: source ?? "direct",
      surface: "upgrade",
      auth_state: authState,
    });

    if (upgraded || cancelled) {
      captureAnalyticsEvent(ANALYTICS_EVENTS.checkoutReturned, {
        feature,
        entry_source: source ?? "direct",
        surface: "upgrade",
        auth_state: authState,
        checkout_result: upgraded ? "success" : "cancelled",
      });
    }
  }, [authState, cancelled, feature, source, upgraded]);

  return null;
}
