import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Check, ArrowLeft } from "lucide-react";

import { getCurrentUserPremiumStatus } from "@/lib/subscription";
import { getUpgradeUrl, type UpgradeFeature } from "@/lib/upgrade";

import { SubscribeButton } from "@/components/billing/subscribe-button";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { AsciiMorph } from "@/components/ui/ascii-morph";

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
  title: "Pricing",
  description:
    "Start for free and upgrade to unlock advanced analytics, weak point training, and premium cosmetics. Plans from $0.99/month.",
  openGraph: {
    title: "Pricing | thetamac",
    description:
      "Start for free and upgrade to Pro for advanced analytics, weak point training, and premium cosmetics.",
  },
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
    <div className="min-h-screen bg-background">
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
        <AsciiMorph
          shapes={["theta", "trophy"]}
          accent
          className="mx-auto mb-6 w-36"
        />
        <h1 className="font-serif text-5xl font-normal tracking-tight text-foreground mb-4 md:text-6xl">
          Pricing
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Start for free and upgrade to unlock more features.
        </p>
      </div>

      {/* Plans */}
      <div className="px-4 md:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid items-stretch gap-10 md:grid-cols-2 md:gap-0">
            {/* Free plan — open ruled column */}
            <div className="flex flex-col border-t-2 border-foreground/80 pt-5 md:mr-10">
              <div className="flex items-baseline justify-between">
                <h2 className="editorial-label">Free</h2>
                <p className="text-xs text-muted-foreground">Get started</p>
              </div>

              <div className="mt-5 mb-8">
                <span className="font-mono text-5xl font-semibold tracking-tight text-foreground">$0</span>
                <span className="text-muted-foreground ml-2">/ month</span>
              </div>

              <ul>
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 border-t border-border py-3">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-8">
                {userId ? (
                  <Link href="/dashboard">
                    <button className="w-full rounded-full border border-border px-4 py-3 font-medium text-foreground transition-colors hover:bg-secondary">
                      Current Plan
                    </button>
                  </Link>
                ) : (
                  <Link href="/auth/signup">
                    <button className="w-full rounded-full border border-border px-4 py-3 font-medium text-foreground transition-colors hover:bg-secondary">
                      Get Started
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* Pro plan — ink plate */}
            <div className="ink-panel relative flex flex-col rounded-[3px] p-8">
              <div className="pointer-events-none absolute inset-0 opacity-30">
                <div
                  className="dot-field h-full w-full"
                  style={{ "--dot": "color-mix(in oklab, var(--background) 35%, transparent)" } as CSSProperties}
                />
              </div>
              <div className="relative flex items-baseline justify-between">
                <h2 className="editorial-label text-brand">Pro</h2>
                <p className="text-xs text-background/70">Everything in thetamac</p>
              </div>

              <div className="relative mt-5 mb-1">
                <span className="font-mono text-5xl font-semibold tracking-tight text-brand">$0.99</span>
                <span className="ml-2 text-background/70">/ month</span>
              </div>
              <p className="relative mb-6 text-xs text-background/70">or $5.99/year (save 50%)</p>

              <ul className="relative">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 border-t border-background/20 py-3">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
                    <span className="text-sm text-background/85">{feature}</span>
                  </li>
                ))}
              </ul>

              <p className="relative mt-5 font-mono text-xs text-background/70">
                + 7-day free trial included +
              </p>

              <div className="relative mt-5 space-y-3">
                {!userId ? (
                  <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(upgradeUrl)}`}>
                    <button className="w-full rounded-full bg-brand px-4 py-3 font-semibold text-brand-foreground transition-colors hover:bg-brand/85">
                      Start Free Trial
                    </button>
                  </Link>
                ) : isPremium ? (
                  <ManageBillingButton
                    returnUrl={upgradeUrl}
                    className="w-full rounded-full bg-background px-4 py-3 font-medium text-foreground transition-colors hover:bg-background/85"
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
                      className="w-full rounded-full bg-brand px-4 py-3 font-semibold text-brand-foreground transition-colors hover:bg-brand/85"
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
                      className="w-full rounded-full border border-background/30 bg-background px-4 py-3 font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-20 max-w-2xl mx-auto">
            <h2 className="mb-8 text-center font-serif text-3xl font-normal tracking-tight">
              Frequently asked questions
            </h2>
            <dl>
              <div className="border-t border-border py-5">
                <dt className="font-semibold text-foreground">What&apos;s included in the free trial?</dt>
                <dd className="mt-2 text-sm leading-6 text-muted-foreground">
                  You get full access to all Pro features for 7 days. No charge until the trial ends, and you can cancel anytime.
                </dd>
              </div>
              <div className="border-t border-border py-5">
                <dt className="font-semibold text-foreground">Can I cancel anytime?</dt>
                <dd className="mt-2 text-sm leading-6 text-muted-foreground">
                  Yes. Your subscription renews automatically and you can cancel from the billing portal at any time.
                </dd>
              </div>
              <div className="border-y border-border py-5">
                <dt className="font-semibold text-foreground">What happens if I downgrade?</dt>
                <dd className="mt-2 text-sm leading-6 text-muted-foreground">
                  You&apos;ll keep your account and history, but Pro-only analytics, weak point training, and shop perks will be locked.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <UpgradeTelemetry feature={activeFeature} source={source} />
      <UpgradeAutoScroll feature={activeFeature} />
    </div>
  );
}
