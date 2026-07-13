"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useGoogleSignIn } from "@/hooks/use-google-sign-in";
import { useEffect } from "react";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl");
  const { isGoogleLoading, googleSignInError, startGoogleSignIn } =
    useGoogleSignIn();

  useEffect(() => {
    captureAnalyticsEvent(ANALYTICS_EVENTS.authFailed, {
      auth_provider: "google",
      auth_intent: "retry",
      surface: "auth_error",
      failure_stage: "callback",
      error_code: error ?? "unknown",
    });
  }, [error]);

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "Your sign-in attempt could not be completed. Start a fresh sign-in to try again.";
      case "AccessDenied":
        return "Access was denied. You may not have permission to sign in.";
      case "Verification":
        return "The verification link may have expired or already been used.";
      case "OAuthSignin":
        return "Error occurred while starting OAuth sign in.";
      case "OAuthCallback":
        return "Error occurred during OAuth callback.";
      case "OAuthCreateAccount":
        return "Could not create OAuth account.";
      case "EmailCreateAccount":
        return "Could not create email account.";
      case "Callback":
        return "Error occurred during authentication callback.";
      case "OAuthAccountNotLinked":
        return "This email is already associated with another account. Please sign in with your original provider.";
      case "CredentialsSignin":
        return "Sign in failed. Check your email and password.";
      case "SessionRequired":
        return "Please sign in to access this page.";
      default:
        return "An unexpected authentication error occurred.";
    }
  };

  return (
    <Card className="ph-no-capture w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="grid h-14 w-14 place-items-center rounded-[3px] border-2 border-destructive font-mono text-2xl font-semibold text-destructive" aria-hidden="true">
            ≠
          </div>
        </div>
        <CardTitle className="font-serif text-3xl font-normal tracking-tight">Authentication Error</CardTitle>
        <CardDescription>{getErrorMessage(error)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {googleSignInError && (
          <div className="flex items-center gap-2 rounded-[3px] bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{googleSignInError}</span>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() =>
              startGoogleSignIn(callbackUrl, { intent: "retry", surface: "auth_error" })
            }
            disabled={isGoogleLoading}
          >
            {isGoogleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start a Fresh Sign-In
          </Button>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Go Home
            </Button>
          </Link>
        </div>
        {error && (
          <p className="text-xs text-center text-muted-foreground">
            Error code: {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Suspense fallback={<div className="w-full max-w-md h-64 animate-pulse bg-secondary rounded-[3px]" />}>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}


