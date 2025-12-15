import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, LineChart, Palette, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { getCurrentUserPremiumStatus } from "@/lib/subscription";
import { getUpgradeUrl, type UpgradeFeature } from "@/lib/upgrade";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";

import { UpgradeAutoScroll } from "./upgrade-auto-scroll";
import { UpgradeTelemetry } from "./upgrade-telemetry";

function normalizeFeature(feature?: string | string[] | null): UpgradeFeature | undefined {
  if (!feature || Array.isArray(feature)) return undefined;
  if (feature === "analytics" || feature === "coins") return feature;
  return undefined;
}

function normalizeString(value?: string | string[] | null): string | undefined {
  if (!value || Array.isArray(value)) return undefined;
  return value;
}

export const metadata: Metadata = {
  title: "Upgrade to Pro | thetamac",
  description: "Upgrade to Theta Pro to unlock advanced analytics and premium cosmetics/coins.",
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const activeFeature = normalizeFeature(resolvedSearchParams.feature);
  const source = normalizeString(resolvedSearchParams.source);

  const { userId, isPremium } = await getCurrentUserPremiumStatus();

  const upgradeUrl = getUpgradeUrl({ feature: activeFeature, source });

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-linear-to-b from-primary/5 to-background">
        <div className="px-4 md:px-6 py-8 md:py-10">
          <div className="max-w-6xl mx-auto space-y-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>

            <div className="flex flex-col gap-2">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Theta Pro
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Everything Pro, in one subscription—advanced analytics to improve faster, plus premium cosmetics/coins to customize your racer.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="secondary" className="w-fit">
                  All features included
                </Badge>
                <Badge variant="outline" className="w-fit">
                  Cancel anytime
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-8">
        <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-2 border-primary/10">
              <CardHeader className="space-y-2">
                <CardTitle>What you get with Pro</CardTitle>
                <CardDescription>
                  One subscription includes everything below, including Weak Point Training and personalized practice packs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div
                    id="analytics"
                    className={cn(
                      "scroll-mt-24 rounded-xl border bg-background p-5",
                      activeFeature === "analytics"
                        ? "border-primary/60 ring-2 ring-primary/20"
                        : "border-border/70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-primary flex items-center gap-2">
                          <LineChart className="w-4 h-4" />
                          Advanced Analytics
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Understand trends, consistency, and breakdowns you can act on.
                        </p>
                      </div>
                      <Badge variant="secondary">Included</Badge>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-primary" />
                        Skill breakdowns and performance trends
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-primary" />
                        Weak Point Training and custom focused training packs
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-primary" />
                        Detailed charts and progress over time
                      </li>
                    </ul>
                  </div>

                  <div
                    id="coins"
                    className={cn(
                      "scroll-mt-24 rounded-xl border bg-background p-5",
                      activeFeature === "coins"
                        ? "border-primary/60 ring-2 ring-primary/20"
                        : "border-border/70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-primary flex items-center gap-2">
                          <Palette className="w-4 h-4" />
                          Cosmetics & Coins
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Unlock Pro-only items and faster progression toward customization.
                        </p>
                      </div>
                      <Badge variant="secondary">Included</Badge>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-primary" />
                        Access to Pro-only shop items
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-primary" />
                        Faster progression toward cosmetics
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-primary" />
                        Premium drops as available
                      </li>
                    </ul>
                  </div>
                </div>

              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>FAQ</CardTitle>
                <CardDescription>Common questions about Pro.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">Can I cancel anytime?</p>
                  <p className="text-sm text-muted-foreground">
                    Yes. Your subscription renews automatically and you can cancel from the billing portal.
                  </p>
                </div>
                <div>
                  <p className="font-medium">What happens if I downgrade?</p>
                  <p className="text-sm text-muted-foreground">
                    You’ll keep your account and history, but Pro-only analytics and shop perks will be locked.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Where can I manage billing?</p>
                  <p className="text-sm text-muted-foreground">
                    In the user menu, choose “Manage billing” once you’re subscribed.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 space-y-4">
              <Card className="border-2 border-primary/10 shadow-sm">
                <CardHeader className="space-y-2">
                  <CardTitle>Upgrade now</CardTitle>
                  <CardDescription>Choose a plan. Everything is included.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!userId ? (
                    <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(upgradeUrl)}`}>
                      <Button className="w-full gap-2">
                        <Sparkles className="w-4 h-4" />
                        Sign in to upgrade
                      </Button>
                    </Link>
                  ) : isPremium ? (
                    <ManageBillingButton
                      returnUrl={upgradeUrl}
                      className="w-full"
                      tracking={{
                        eventName: "upgrade_cta_click",
                        properties: { source, feature: activeFeature },
                      }}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl border bg-secondary/40 p-4">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Monthly</p>
                        <p className="text-3xl font-bold">$2</p>
                        <p className="text-xs text-muted-foreground mb-4">Billed monthly, cancel anytime.</p>
                        <SubscribeButton
                          plan="monthly"
                          label="Go monthly"
                          returnUrl={upgradeUrl}
                          tracking={{
                            eventName: "upgrade_cta_click",
                            properties: { source, feature: activeFeature },
                          }}
                          variant="outline"
                          className="w-full"
                        />
                      </div>

                      <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                        <p className="text-sm font-medium text-primary mb-1">Yearly (best value)</p>
                        <p className="text-3xl font-bold">$12</p>
                        <p className="text-xs text-muted-foreground mb-4">Save 50% when billed annually.</p>
                        <SubscribeButton
                          plan="yearly"
                          label="Go yearly"
                          returnUrl={upgradeUrl}
                          tracking={{
                            eventName: "upgrade_cta_click",
                            properties: { source, feature: activeFeature },
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <UpgradeTelemetry feature={activeFeature} source={source} />
      <UpgradeAutoScroll feature={activeFeature} />
    </div>
  );
}
