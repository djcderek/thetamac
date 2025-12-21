import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/signin-form";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your thetamac account",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/20">
      <Suspense fallback={<div className="w-full max-w-md h-96 animate-pulse bg-secondary rounded-lg" />}>
        <SignInForm />
      </Suspense>
    </div>
  );
}




