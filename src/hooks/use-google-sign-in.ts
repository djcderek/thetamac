"use client";

import { useCallback, useRef, useState } from "react";
import { signIn } from "next-auth/react";

import { getSafeCallbackPath } from "@/lib/auth-callback";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";

type AuthIntent = "sign_in" | "sign_up" | "retry";

export function useGoogleSignIn() {
  const signInStartedRef = useRef(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleSignInError, setGoogleSignInError] = useState<string | null>(null);

  const startGoogleSignIn = useCallback(async (
    callbackUrl?: string | null,
    context: { intent?: AuthIntent; surface?: string } = {}
  ) => {
    if (signInStartedRef.current) return;

    signInStartedRef.current = true;
    setIsGoogleLoading(true);
    setGoogleSignInError(null);

    const safeCallbackPath = getSafeCallbackPath(callbackUrl);
    captureAnalyticsEvent(ANALYTICS_EVENTS.authStarted, {
      auth_provider: "google",
      auth_intent: context.intent ?? "sign_in",
      surface: context.surface ?? "auth",
      callback_path: safeCallbackPath,
    });

    try {
      await signIn("google", {
        callbackUrl: safeCallbackPath,
      });
    } catch {
      signInStartedRef.current = false;
      setIsGoogleLoading(false);
      setGoogleSignInError("Failed to start Google sign in. Please try again.");
      captureAnalyticsEvent(ANALYTICS_EVENTS.authFailed, {
        auth_provider: "google",
        auth_intent: context.intent ?? "sign_in",
        surface: context.surface ?? "auth",
        failure_stage: "initiation",
      });
    }
  }, []);

  return { isGoogleLoading, googleSignInError, startGoogleSignIn };
}
