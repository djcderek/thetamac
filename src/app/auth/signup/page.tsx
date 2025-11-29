import { SignUpForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "Sign Up | ThetaMac",
  description: "Create your ThetaMac account",
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/20">
      <SignUpForm />
    </div>
  );
}



