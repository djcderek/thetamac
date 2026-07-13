"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";

export function PostHogIdentify() {
  const { data: session, status } = useSession();
  const identifiedUserId = useRef<string | null>(null);
  const identifiedBillingState = useRef<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      const billingState = `${Boolean(session.user.isPremium)}:${session.user.subscriptionPlan ?? "free"}`;
      if (
        identifiedUserId.current === session.user.id &&
        identifiedBillingState.current === billingState
      ) {
        return;
      }
      identifiedUserId.current = session.user.id;
      identifiedBillingState.current = billingState;
      posthog.identify(session.user.id, {
        is_premium: session.user.isPremium,
        subscription_plan: session.user.subscriptionPlan ?? "free",
      });
    }

    if (status === "unauthenticated" && identifiedUserId.current) {
      identifiedUserId.current = null;
      identifiedBillingState.current = null;
      posthog.reset();
    }
  }, [status, session?.user?.id, session?.user?.isPremium, session?.user?.subscriptionPlan]);

  return null;
}
