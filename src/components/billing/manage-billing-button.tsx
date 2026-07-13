"use client";

import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ManageBillingButton({
  returnUrl,
  className,
  variant = "outline",
}: {
  returnUrl?: string;
  className?: string;
  variant?: "default" | "secondary" | "outline";
  tracking?: {
    eventName: "upgrade_cta_click";
    properties?: Record<string, unknown>;
  };
}) {
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ returnUrl }),
      });

      const data = await response.json();
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Unable to open billing portal.");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Failed to open billing portal", error);
      alert(
        error instanceof Error
          ? error.message
          : "Unable to open billing portal."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleManageBilling}
      disabled={loading}
      className={className}
      variant={variant}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      {loading ? "Opening..." : "Manage billing"}
    </Button>
  );
}
