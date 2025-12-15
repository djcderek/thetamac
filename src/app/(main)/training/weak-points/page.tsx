import Link from "next/link";
import { ArrowLeft, LogIn, Sparkles, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUserPremiumStatus } from "@/lib/subscription";
import { getUpgradeUrl } from "@/lib/upgrade";
import { WeakPointsDashboard } from "./weak-points-dashboard";

export const dynamic = "force-dynamic";

export default async function WeakPointsPage() {
  const { userId, isPremium } = await getCurrentUserPremiumStatus();

  // Not logged in
  if (!userId) {
    return (
      <div className="min-h-screen">
        <div className="border-b border-border">
          <div className="px-4 md:px-6 py-4">
            <Link
              href="/training"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Training
            </Link>
            <h1 className="text-lg font-semibold">Weak Point Training</h1>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <LogIn className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sign in to analyze your weak points and get personalized training.
              </p>
              <Link href="/auth/signin">
                <Button>Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not premium - show paywall
  if (!isPremium) {
    const upgradeUrl = getUpgradeUrl({
      feature: "analytics",
      source: "training_weak_points",
    });

    return (
      <div className="min-h-screen">
        <div className="border-b border-border">
          <div className="px-4 md:px-6 py-4">
            <Link
              href="/training"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Training
            </Link>
            <h1 className="text-lg font-semibold">Weak Point Training</h1>
            <p className="text-sm text-muted-foreground">
              Unlock personalized training with Theta Pro.
            </p>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <Card className="max-w-2xl mx-auto border-2 border-primary/10">
            <CardContent className="py-10 text-center space-y-5">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Weak Point Training is a Pro feature</h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  Get analysis of your mistakes and a personalized training pack to improve faster.
                </p>
              </div>

              <div className="grid gap-2 text-sm text-muted-foreground max-w-md mx-auto text-left">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 text-primary" />
                  Custom training packs for weak spots
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 text-primary" />
                  Track improvement over time
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 text-primary" />
                  Focus on specific number combinations
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link href={upgradeUrl}>
                  <Button className="gap-2 w-full sm:w-auto">
                    <Sparkles className="w-4 h-4" />
                    Upgrade to Pro
                  </Button>
                </Link>
                <Link href="/training">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Back to Training
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Premium user - show dashboard
  return <WeakPointsDashboard />;
}


