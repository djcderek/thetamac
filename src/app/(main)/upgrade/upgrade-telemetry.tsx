"use client";

import { useEffect, useRef } from "react";
import type { UpgradeFeature } from "@/lib/upgrade";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";
import { ProductSurveyController } from "@/components/analytics/product-survey-controller";
import { shouldCaptureCheckoutCancellation } from "@/lib/product-surveys";

export function UpgradeTelemetry({
  feature,
  source,
  upgraded,
  cancelled,
  authState,
  plan,
}: {
  feature?: UpgradeFeature;
  source?: string;
  upgraded: boolean;
  cancelled: boolean;
  authState: "guest" | "authenticated";
  plan: "free" | "premium";
}) {
  const checkoutCancellationCapturedRef = useRef(false);

  useEffect(() => {
    captureAnalyticsEvent(ANALYTICS_EVENTS.upgradePageViewed, {
      feature,
      entry_source: source ?? "direct",
      surface: "upgrade",
      auth_state: authState,
      plan,
    });

    if (upgraded || cancelled) {
      captureAnalyticsEvent(ANALYTICS_EVENTS.checkoutReturned, {
        feature,
        entry_source: source ?? "direct",
        surface: "upgrade",
        auth_state: authState,
        plan,
        checkout_result: upgraded ? "success" : "cancelled",
      });
    }

    if (
      shouldCaptureCheckoutCancellation(
        cancelled,
        checkoutCancellationCapturedRef.current
      )
    ) {
      checkoutCancellationCapturedRef.current = true;
      captureAnalyticsEvent(ANALYTICS_EVENTS.checkoutCancelled, {
        feature,
        entry_source: source ?? "direct",
        surface: "upgrade",
        auth_state: authState,
        plan,
      });
    }
  }, [authState, cancelled, feature, plan, source, upgraded]);

  return <ProductSurveyController surface="upgrade" enabled />;
}
