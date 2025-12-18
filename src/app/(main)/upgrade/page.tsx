import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowLeft } from "lucide-react";

import { getCurrentUserPremiumStatus } from "@/lib/subscription";
import { getUpgradeUrl, type UpgradeFeature } from "@/lib/upgrade";

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
  title: "Pricing | thetamac",
  description: "Start for free and upgrade to unlock advanced analytics, weak point training, and premium cosmetics.",
};

const freeFeatures = [
  "Basic training modes",
  "Track your progress",
  "Leaderboard access",
  "Multiplayer racing",
  "Standard cosmetics",
];

const proFeatures = [
  "Everything in Free",
  "Advanced analytics & charts",
  "Weak point training",
  "Skill breakdowns & trends",
  "Premium cosmetics access",
  "Bonus coin rewards",
  "Cancel anytime",
];

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
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-background">
      {/* Back button */}
      <div className="px-4 md:px-6 pt-6">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="px-4 md:px-6 pt-12 pb-8 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-4">
          Pricing
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Start for free and upgrade to unlock more features.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="px-4 md:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 items-start">
            {/* Free Plan Card */}
            <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">Free</h2>
                <p className="text-sm text-muted-foreground">Get started with our free plan</p>
              </div>

              <div className="mb-8">
                <span className="text-5xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground ml-1">/ month</span>
              </div>

              <ul className="space-y-4">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {userId ? (
                  <Link href="/dashboard">
                    <button className="w-full py-3 px-4 rounded-xl border border-border bg-secondary/50 text-foreground font-medium hover:bg-secondary transition-colors">
                      Current Plan
                    </button>
                  </Link>
                ) : (
                  <Link href="/auth/signup">
                    <button className="w-full py-3 px-4 rounded-xl border border-border bg-secondary/50 text-foreground font-medium hover:bg-secondary transition-colors">
                      Get Started
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* Pro Plan Card */}
            <div className="bg-card rounded-2xl p-8 shadow-sm border-2 border-[#2563eb] relative">
              {/* Pro Badge */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-[#2563eb] mb-1">Pro</h2>
                <p className="text-sm text-muted-foreground">Get everything out of thetamac.</p>
              </div>

              <div className="mb-2">
                <span className="text-5xl font-bold text-[#2563eb]">$1.99</span>
                <span className="text-muted-foreground ml-1">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                or $11.99/year (save 50%)
              </p>

              <ul className="space-y-4">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#2563eb] mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* 7-day free trial notice */}
              <div className="mt-6 p-3 rounded-xl bg-[#2563eb]/5 border border-[#2563eb]/20">
                <p className="text-sm text-center text-[#2563eb] font-medium">
                  ✨ 7-day free trial included
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {!userId ? (
                  <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(upgradeUrl)}`}>
                    <button className="w-full py-3 px-4 rounded-xl bg-[#2563eb] text-white font-medium hover:bg-[#1d4ed8] transition-colors">
                      Start Free Trial
                    </button>
                  </Link>
                ) : isPremium ? (
                  <ManageBillingButton
                    returnUrl={upgradeUrl}
                    className="w-full py-3 px-4 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
                    tracking={{
                      eventName: "upgrade_cta_click",
                      properties: { source, feature: activeFeature },
                    }}
                  />
                ) : (
                  <>
                    <SubscribeButton
                      plan="monthly"
                      label="Start Free Trial"
                      returnUrl={upgradeUrl}
                      tracking={{
                        eventName: "upgrade_cta_click",
                        properties: { source, feature: activeFeature },
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-[#2563eb] text-white font-medium hover:bg-[#1d4ed8] transition-colors"
                    />
                    <SubscribeButton
                      plan="yearly"
                      label="Go Yearly — Save 50%"
                      returnUrl={upgradeUrl}
                      tracking={{
                        eventName: "upgrade_cta_click",
                        properties: { source, feature: activeFeature },
                      }}
                      variant="outline"
                      className="w-full py-3 px-4 rounded-xl border border-[#2563eb]/30 text-[#2563eb] font-medium hover:bg-[#2563eb]/5 transition-colors"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-2">What's included in the free trial?</h3>
                <p className="text-sm text-muted-foreground">
                  You get full access to all Pro features for 7 days. No charge until the trial ends, and you can cancel anytime.
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-2">Can I cancel anytime?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes. Your subscription renews automatically and you can cancel from the billing portal at any time.
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-2">What happens if I downgrade?</h3>
                <p className="text-sm text-muted-foreground">
                  You'll keep your account and history, but Pro-only analytics, weak point training, and shop perks will be locked.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UpgradeTelemetry feature={activeFeature} source={source} />
      <UpgradeAutoScroll feature={activeFeature} />
    </div>
  );
}
