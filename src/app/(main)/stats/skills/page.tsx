import Link from "next/link";
import { ArrowLeft, LogIn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PremiumPaywall } from "@/components/billing/premium-paywall";
import { getCurrentUserPremiumStatus } from "@/lib/subscription";
import { SkillsDashboard } from "./skills-dashboard";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  // Server-side check - always fresh from database
  const { userId, isPremium } = await getCurrentUserPremiumStatus();

  // Not logged in
  if (!userId) {
    return (
      <div className="min-h-screen">
        <div className="border-b border-border">
          <div className="px-4 md:px-6 py-4">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-lg font-semibold">Skills Breakdown</h1>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <LogIn className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sign in to view your detailed skills breakdown and performance analytics.
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
    return (
      <div className="min-h-screen">
        <div className="border-b border-border">
          <div className="px-4 md:px-6 py-4">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-lg font-semibold">Skills Breakdown</h1>
            <p className="text-sm text-muted-foreground">
              Unlock detailed analytics with Theta Pro.
            </p>
          </div>
        </div>
        <PremiumPaywall
          featureName="your skill breakdowns"
          className="px-4 md:px-6"
        />
      </div>
    );
  }

  // Premium user - show dashboard
  return <SkillsDashboard />;
}
