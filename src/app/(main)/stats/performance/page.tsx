import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUserPremiumStatus } from "@/lib/subscription";
import { PerformanceDashboard } from "./performance-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Performance Analytics",
  description: "View detailed performance analytics for your mental math training.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PerformancePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const upgraded = (await searchParams)?.upgraded === "1";
  // Server-side check - always fresh from database
  const { userId, isPremium } = await getCurrentUserPremiumStatus();

  // Not logged in - show sign in prompt
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <LogIn className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Sign in required</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sign in to view your advanced analytics and unlock the premium
              dashboard.
            </p>
            <Link href="/auth/signin?callbackUrl=/stats/performance">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not premium - redirect to upgrade page
  if (!isPremium) {
    // Keep `upgraded` so a player back from checkout sees the confirmation state, not checkout.
    redirect(`/upgrade?feature=analytics&source=performance${upgraded ? "&upgraded=1" : ""}`);
  }

  // Premium user - show dashboard
  return <PerformanceDashboard />;
}
