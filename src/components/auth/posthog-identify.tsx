"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";

export function PostHogIdentify() {
  const { data: session, status } = useSession();
  const identified = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id && !identified.current) {
      identified.current = true;
      posthog.identify(session.user.id, {
        name: session.user.name ?? undefined,
        email: session.user.email ?? undefined,
      });
      posthog.capture("user_signed_in");
    }

    if (status === "unauthenticated" && identified.current) {
      identified.current = false;
      posthog.reset();
    }
  }, [status, session]);

  return null;
}
