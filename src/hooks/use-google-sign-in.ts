"use client";

import { useCallback, useRef, useState } from "react";
import { signIn } from "next-auth/react";

import { getSafeCallbackPath } from "@/lib/auth-callback";

export function useGoogleSignIn() {
  const signInStartedRef = useRef(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleSignInError, setGoogleSignInError] = useState<string | null>(null);

  const startGoogleSignIn = useCallback(async (callbackUrl?: string | null) => {
    if (signInStartedRef.current) return;

    signInStartedRef.current = true;
    setIsGoogleLoading(true);
    setGoogleSignInError(null);

    try {
      await signIn("google", {
        callbackUrl: getSafeCallbackPath(callbackUrl),
      });
    } catch {
      signInStartedRef.current = false;
      setIsGoogleLoading(false);
      setGoogleSignInError("Failed to start Google sign in. Please try again.");
    }
  }, []);

  return { isGoogleLoading, googleSignInError, startGoogleSignIn };
}
