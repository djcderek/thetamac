import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubscribeButton } from "./subscribe-button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

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
      <Card className="w-full max-w-3xl border-2 border-primary/10 shadow-lg">
        <CardHeader className="space-y-3">
          <Badge variant="secondary" className="w-fit">
            Premium
          </Badge>
          <CardTitle className="text-2xl font-semibold">
            Unlock {featureName}
          </CardTitle>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {description ||
              "Upgrade to Theta Pro to access the full analytics dashboard and multiplayer enhancements."}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-secondary/40 p-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Monthly
              </p>
              <p className="text-3xl font-bold">$2</p>
              <p className="text-xs text-muted-foreground mb-4">
                Billed monthly, cancel anytime.
              </p>
              <SubscribeButton plan="monthly" label="Go monthly" />
            </div>
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
              <p className="text-sm font-medium text-primary mb-1">
                Yearly (best value)
              </p>
              <p className="text-3xl font-bold">$12</p>
              <p className="text-xs text-muted-foreground mb-4">
                Save 50% when billed annually.
              </p>
              <SubscribeButton
                plan="yearly"
                label="Go yearly"
                variant="secondary"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-start gap-2 rounded-lg border border-dashed border-border/70 bg-muted/40 p-3"
              >
                <Check className="h-4 w-4 text-primary mt-0.5" />
                <p className="text-sm text-muted-foreground">{benefit}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Subscriptions auto-renew and can be managed or cancelled at any
            time from the billing portal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


