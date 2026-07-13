"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

type UpgradeFeature = "analytics" | "coins";

export function UpgradeAutoScroll({
  feature,
  upgraded = false,
}: {
  feature?: UpgradeFeature;
  upgraded?: boolean;
}) {
  const { update } = useSession();
  const refreshedBillingRef = useRef(false);

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

  useEffect(() => {
    if (!upgraded || refreshedBillingRef.current) return;

    refreshedBillingRef.current = true;
    void update({ refreshBilling: true }).catch(() => {
      refreshedBillingRef.current = false;
    });
  }, [update, upgraded]);

  return null;
}
