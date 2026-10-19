"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { GoogleIcon } from "@/components/auth/google-icon";
import { useGoogleSignIn } from "@/hooks/use-google-sign-in";

export function SignUpForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const { isGoogleLoading, googleSignInError, startGoogleSignIn } =
    useGoogleSignIn();

  return (
    <Card className="ph-no-capture mx-auto w-full max-w-sm bg-transparent">
      <CardHeader className="space-y-1 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <LogoMark size={32} />
        </div>
        <CardTitle className="text-[32px] font-semibold leading-tight tracking-[-0.04em]">Create an account</CardTitle>
        <CardDescription className="text-[15px]">Start your mental math journey today</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {googleSignInError && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-2xl">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{googleSignInError}</span>
          </div>
        )}

        {/* Google Sign In */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() =>
            startGoogleSignIn(callbackUrl, { intent: "sign_up", surface: "sign_up" })
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
          Create your account with Google to get started.
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
