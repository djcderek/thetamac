"use client";

import { useEffect } from "react";
import type { UpgradeFeature } from "@/lib/upgrade";

export function UpgradeTelemetry({
  feature,
  source,
}: {
  feature?: UpgradeFeature;
  source?: string;
}) {
  useEffect(() => {
    void fetch("/api/telemetry/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventName: "upgrade_page_view",
        properties: { feature, source },
      }),
    }).catch(() => {});
  }, [feature, source]);

  return null;
}
