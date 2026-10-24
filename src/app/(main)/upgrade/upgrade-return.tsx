"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Back from checkout with Pro active: refresh the session's billing, then return to where the
 * upgrade started (the lesson, the review), so the player carries on from there.
 */
export function UpgradeReturn({ next }: { next: string }) {
  const { update } = useSession();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void update({ refreshBilling: true })
      .catch(() => {})
      .finally(() => window.location.replace(next));
  }, [update, next]);

  return null;
}
