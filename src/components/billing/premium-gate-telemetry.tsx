"use client";

import { useEffect } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";

export function PremiumGateTelemetry({ featureName }: { featureName: string }) {
  useEffect(() => {
    captureAnalyticsEvent(ANALYTICS_EVENTS.premiumGateViewed, {
      feature: featureName,
      surface: "premium_paywall",
      auth_state: "authenticated",
      plan: "free",
    });
  }, [featureName]);

  return null;
}
