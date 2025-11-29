"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Custom hook for authentication in client components
 */
export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const user = session?.user;

  const login = useCallback(
    async (provider: string = "credentials", credentials?: { email: string; password: string }) => {
      if (provider === "credentials" && credentials) {
        return signIn("credentials", {
          email: credentials.email,
          password: credentials.password,
          redirect: false,
        });
      }
      return signIn(provider, { callbackUrl: "/" });
    },
    []
  );

  const logout = useCallback(async () => {
    await signOut({ callbackUrl: "/" });
  }, []);

  const requireAuth = useCallback(
    (callbackUrl?: string) => {
      if (!isAuthenticated && !isLoading) {
        router.push(`/auth/signin${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`);
      }
    },
    [isAuthenticated, isLoading, router]
  );

  return {
    user,
    session,
    status,
    isLoading,
    isAuthenticated,
    login,
    logout,
    requireAuth,
    updateSession: update,
  };
}




