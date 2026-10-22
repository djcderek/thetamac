"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { GoogleIcon } from "@/components/auth/google-icon";
import { useGoogleSignIn } from "@/hooks/use-google-sign-in";
import { useEffect } from "react";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";

export function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const error = searchParams.get("error");
  const { isGoogleLoading, googleSignInError, startGoogleSignIn } =
    useGoogleSignIn();

  useEffect(() => {
    if (!error) return;
    captureAnalyticsEvent(ANALYTICS_EVENTS.authFailed, {
      auth_provider: "google",
      auth_intent: "sign_in",
      surface: "sign_in",
      failure_stage: "callback",
      error_code: error,
    });
  }, [error]);

  const getErrorMessage = (error: string) => {
    switch (error) {
      // Auth.js v5 codes ("Signin", "OAuthCallbackError") plus the v4 names they replaced.
      case "Signin":
      case "OAuthSignin":
        return "Google sign-in couldn't start. Please try again.";
      case "OAuthCallbackError":
      case "OAuthCallback":
        return "Google sign-in didn't finish. Please try again.";
      case "OAuthCreateAccount":
        return "Could not create OAuth account";
      case "EmailCreateAccount":
        return "Could not create email account";
      case "Callback":
        return "Error during authentication callback";
      case "OAuthAccountNotLinked":
        return "This email is already associated with another account";
      case "SessionRequired":
        return "Please sign in to access this page";
      default:
        return "An error occurred during sign in";
    }
  };

  return (
    <Card className="ph-no-capture mx-auto w-full max-w-sm bg-transparent">
      <CardHeader className="space-y-1 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <LogoMark size={32} textured={false} />
        </div>
        <CardTitle className="text-[32px] font-semibold leading-tight tracking-[-0.04em]">Welcome back</CardTitle>
        <CardDescription className="text-[15px]">Sign in to your thetamac account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(error || googleSignInError) && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-2xl">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{googleSignInError || getErrorMessage(error!)}</span>
          </div>
        )}

        {/* Google Sign In */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() =>
            startGoogleSignIn(callbackUrl, { intent: "sign_in", surface: "sign_in" })
          }
          disabled={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2 h-4 w-4" />
          )}
          Continue with Google
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          We now sign in exclusively with Google for faster, safer access.
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
