import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowLeft } from "lucide-react";

import { getCurrentUserPremiumStatus, subscriptionNeedsAttention } from "@/lib/subscription";
import { getUpgradeUrl, safeNextPath, type UpgradeFeature } from "@/lib/upgrade";
import { QUANT_LESSONS } from "@/lib/quant/lessons";

import { SubscribeButton } from "@/components/billing/subscribe-button";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { UpgradeAuthLink } from "@/components/billing/upgrade-auth-link";

import { UpgradeAutoScroll } from "./upgrade-auto-scroll";
import { UpgradePendingRefresh } from "./upgrade-pending-refresh";
import { UpgradeReturn } from "./upgrade-return";
import { UpgradeTelemetry } from "./upgrade-telemetry";

function normalizeFeature(feature?: string | string[] | null): UpgradeFeature | undefined {
  if (!feature || Array.isArray(feature)) return undefined;
  if (feature === "analytics" || feature === "coins" || feature === "review" || feature === "lessons" ||
    feature === "daily" || feature === "quant") {
    return feature;
  }
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
  "Timed runs and Practice sets",
  "The first 4 Learning lessons",
  "Quant Foundations: counting and probability basics",
  "Track your progress",
  "Leaderboard access",
  "Multiplayer racing",
  "Standard cosmetics",
];

const proFeatures = [
  "Everything in Free",
  "Today: a daily five minutes built from your own misses and slow spots",
  "Review: your past misses come back until they stick",
  "All 12 Learning lessons",
  `All ${QUANT_LESSONS.length} quant lessons, from counting to continuous probability`,
  "Timed quant mock tests, scored like a first-round interview screen",
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
  // Where the upgrade started, to go back to once Pro is active.
  const next = safeNextPath(normalizeString(resolvedSearchParams.next)) ?? undefined;
  const upgraded = resolvedSearchParams.upgraded === "1";
  const cancelled = resolvedSearchParams.cancelled === "1";

  const { userId, isPremium, subscriptionStatus, trialEligible } =
    await getCurrentUserPremiumStatus();
  // An unpaid, incomplete or paused subscription is fixed in the billing portal, not a new checkout.
  // Back from checkout before the webhook has updated the account: show that the
  // subscription is being confirmed instead of offering checkout again.
  const confirmingUpgrade = upgraded && Boolean(userId) && !isPremium;
  const needsBillingAttention =
    !isPremium && subscriptionNeedsAttention(subscriptionStatus);

  // Kept through sign-in and checkout, so Stripe returns here with `next` still on it.
  const upgradeUrl = getUpgradeUrl({ feature: activeFeature, source, next });
  const returning = upgraded && isPremium && Boolean(next);

  return (
    <div className="min-h-screen bg-background">
      {/* Back button */}
      <div className="px-4 md:px-6 pt-6">
        <div className="max-w-5xl mx-auto">
          <Link
            href={next ?? (userId ? "/dashboard" : "/")}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {next ? "Back" : userId ? "Back to Dashboard" : "Back to Training"}
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="px-4 md:px-6 pt-12 pb-8 text-center">
        <p className="text-[15px] font-medium text-muted-foreground">Pricing</p>
        <h1 className="mx-auto mt-3 max-w-2xl text-[40px] font-semibold leading-[1.04] tracking-[-0.045em] text-balance md:text-[56px]">
          Free to practice. <span className="text-brand">Pro</span> to go deeper.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[17px] leading-7 text-muted-foreground">
          Every drill is free. Pro remembers what you miss and brings it back, plus the analytics and perks.
        </p>
      </div>

      {/* Plans */}
      <div className="px-4 md:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid items-stretch gap-4 md:grid-cols-2">
            {/* Free plan: outlined */}
            <div className="flex flex-col rounded-[26px] border border-border p-7">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[17px] font-semibold tracking-tight">Free</h2>
                <p className="text-xs text-muted-foreground">Get started</p>
              </div>

              <div className="mt-5 mb-8">
                <span className="text-5xl font-semibold tracking-[-0.04em] tabular-nums">$0</span>
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

            {/* Pro plan: the grey grouped surface; orange stays on the subscribe action. */}
            <div className="relative flex flex-col rounded-[26px] bg-secondary p-7">
              <div className="relative flex items-baseline justify-between">
                <h2 className="text-[17px] font-semibold tracking-tight">Pro</h2>
                <p className="text-xs text-muted-foreground">Everything in thetamac</p>
              </div>

              <div className="relative mt-5 mb-1">
                <span className="text-5xl font-semibold tracking-[-0.04em] tabular-nums">$0.99</span>
                <span className="ml-2 text-muted-foreground">/ month</span>
              </div>
              <p className="relative mb-6 text-xs text-muted-foreground">or $5.99/year (save 50%)</p>

              <ul className="relative">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 border-t border-border py-3">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-foreground" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <p className="relative mt-5 font-mono text-xs text-muted-foreground">
                {confirmingUpgrade
                  ? "Payment received. Activating Pro…"
                  : returning
                    ? "You're on Pro. Taking you back…"
                    : upgraded && isPremium
                    ? "You're on Pro"
                    : trialEligible
                  ? "7-day free trial included"
                  : needsBillingAttention
                    ? "Your subscription needs attention. Update payment in billing."
                    : "Billed today. Cancel anytime."}
              </p>

              <div className="relative mt-5 space-y-3">
                {!userId ? (
                  <UpgradeAuthLink
                    href={`/auth/signin?callbackUrl=${encodeURIComponent(upgradeUrl)}`}
                    feature={activeFeature}
                    source={source}
                  >
                    <button className="w-full rounded-full bg-brand px-4 py-3 font-semibold text-brand-foreground transition-colors hover:bg-brand/85">
                      Start Free Trial
                    </button>
                  </UpgradeAuthLink>
                ) : confirmingUpgrade ? (
                  <p role="status" className="rounded-2xl border border-border px-4 py-3 text-sm text-foreground">
                    Confirming your subscription. This usually takes a few seconds. If Pro
                    isn&apos;t active within a minute, refresh this page or contact support.
                  </p>
                ) : isPremium || needsBillingAttention ? (
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
                      label={trialEligible ? "Start Free Trial" : "Go Monthly"}
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
                      className="w-full rounded-full bg-background px-4 py-3 font-medium text-foreground transition-colors hover:bg-accent"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-20 max-w-2xl mx-auto">
            <h2 className="font-semibold mb-8 text-center text-3xl tracking-tight">
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

      <UpgradeTelemetry
        feature={activeFeature}
        source={source}
        upgraded={upgraded}
        cancelled={cancelled}
        authState={userId ? "authenticated" : "guest"}
        plan={isPremium ? "premium" : "free"}
      />
      <UpgradeAutoScroll feature={activeFeature} upgraded={upgraded} />
      {confirmingUpgrade ? <UpgradePendingRefresh /> : null}
      {returning && next ? <UpgradeReturn next={next} /> : null}
    </div>
  );
}
