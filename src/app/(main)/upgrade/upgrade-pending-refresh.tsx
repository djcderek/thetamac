"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 2000;
const MAX_REFRESHES = 15;

/**
 * After checkout, Stripe's webhook can land a few seconds after the redirect back here.
 * Re-render the page from the server until the subscription shows up (about 30s at most).
 */
export function UpgradePendingRefresh() {
  const router = useRouter();

  useEffect(() => {
    let refreshes = 0;
    const id = window.setInterval(() => {
      refreshes++;
      router.refresh();
      if (refreshes >= MAX_REFRESHES) window.clearInterval(id);
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [router]);

  return null;
}
