import { SubscribeButton } from "./subscribe-button";
import { SectionLabel } from "@/components/ui/visual-system";
import { cn } from "@/lib/utils";
import { PremiumGateTelemetry } from "@/components/billing/premium-gate-telemetry";

interface PremiumPaywallProps {
  featureName: string;
  description?: string;
  benefits?: string[];
  className?: string;
}

const DEFAULT_BENEFITS = [
  "Priority multiplayer analytics",
  "Detailed skill breakdowns",
  "Downloadable progress reports",
  "Early access to new training modes",
  "500 free credits on signup",
  "Access to pro-only items in the shop",
];

export function PremiumPaywall({
  featureName,
  description,
  benefits = DEFAULT_BENEFITS,
  className,
}: PremiumPaywallProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center py-12 px-4",
        className
      )}
    >
      <div className="w-full max-w-3xl rounded-[26px] bg-secondary p-5">
        <PremiumGateTelemetry featureName={featureName} />
        <div className="space-y-3">
          <SectionLabel>Pro</SectionLabel>
          <h2 className="font-semibold text-3xl tracking-tight">
            Unlock {featureName}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground max-w-2xl">
            {description ||
              "Upgrade to Theta Pro to access the full analytics dashboard and multiplayer enhancements."}
          </p>
        </div>
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border p-4">
              <SectionLabel className="mb-1">Monthly</SectionLabel>
              <p className="font-mono text-3xl font-semibold tracking-tight">$0.99</p>
              <p className="text-xs text-muted-foreground mb-4">
                7-day free trial, then billed monthly. Cancel anytime.
              </p>
              <SubscribeButton plan="monthly" label="Go monthly" variant="outline" />
            </div>
            <div className="ink-panel relative overflow-hidden rounded-2xl border p-4">
              <div className="dot-field pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
              <div className="relative">
                <p className="mb-1 text-[13px] font-medium tracking-[0.14em] text-background/60">
                  Yearly · Best value
                </p>
                <p className="font-mono text-3xl font-semibold tracking-tight">$5.99</p>
                <p className="text-xs text-background/70 mb-4">
                  7-day free trial, then billed annually. Save 50%.
                </p>
                <SubscribeButton
                  plan="yearly"
                  label="Go yearly"
                  className="bg-background text-foreground hover:bg-brand hover:text-brand-foreground"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-x-6 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-start gap-2.5 border-t border-border py-2.5"
              >
                <span className="font-mono text-sm font-semibold text-brand" aria-hidden="true">+</span>
                <p className="text-sm text-muted-foreground">{benefit}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Subscriptions auto-renew and can be managed or cancelled at any
            time from the billing portal.
          </p>
        </div>
      </div>
    </div>
  );
}


