"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";

type BillingPlan = "monthly" | "yearly";

interface SubscribeButtonProps {
  plan: BillingPlan;
  label: string;
  description?: string;
  returnUrl?: string;
  tracking?: {
    eventName: "upgrade_cta_click";
    properties?: Record<string, unknown>;
  };
  variant?: "default" | "secondary" | "outline";
  className?: string;
}

export function SubscribeButton({
  plan,
  label,
  description,
  returnUrl,
  tracking,
  variant = "default",
  className,
}: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    try {
      setLoading(true);

      captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, {
        ...tracking?.properties,
        plan,
        surface: "upgrade",
        action: "start_checkout",
      });

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan, returnUrl }),
      });

      const data = await response.json();

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Unable to start checkout.");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      captureAnalyticsEvent(ANALYTICS_EVENTS.checkoutFailed, {
        ...tracking?.properties,
        plan,
        surface: "upgrade",
        failure_stage: "client_request",
      });
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleSubscribe}
      disabled={loading}
      variant={variant}
      className={className}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      <span>{label}</span>
      {description && (
        <span className="ml-1 text-xs text-muted-foreground">
          {description}
        </span>
      )}
    </Button>
  );
}

