import { Suspense } from "react";
import { SignInForm } from "@/components/auth/signin-form";

export const metadata = {
  title: "Sign In | ThetaMac",
  description: "Sign in to your ThetaMac account",
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




