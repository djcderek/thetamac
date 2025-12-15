"use client";

import { useEffect } from "react";

type UpgradeFeature = "analytics" | "coins";

export function UpgradeAutoScroll({ feature }: { feature?: UpgradeFeature }) {
  useEffect(() => {
    if (!feature) return;

    // Let layout/paint happen first so scroll position is accurate.
    const id = feature;
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);

    return () => window.clearTimeout(t);
  }, [feature]);

  return null;
}
