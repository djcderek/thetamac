import { redirect } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUserPremiumStatus } from "@/lib/subscription";
import { WeakPointsDashboard } from "./weak-points-dashboard";

export const dynamic = "force-dynamic";

export default async function WeakPointsPage() {
  const { userId, isPremium } = await getCurrentUserPremiumStatus();

  // Not logged in - show sign in prompt
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <LogIn className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sign in to analyze your weak points and get personalized training.
            </p>
            <Link href="/auth/signin?callbackUrl=/training/weak-points">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not premium - redirect to upgrade page
  if (!isPremium) {
    redirect("/upgrade?feature=analytics&source=weak-points");
  }

  // Premium user - show dashboard
  return <WeakPointsDashboard />;
}


