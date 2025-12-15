"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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

      if (tracking?.eventName) {
        // Best-effort: don't block checkout on telemetry.
        void fetch("/api/telemetry/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: tracking.eventName,
            properties: {
              ...tracking.properties,
              plan,
              returnUrl,
            },
          }),
        }).catch(() => {});
      }

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



