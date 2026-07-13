"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";
import type { TrainingPresetId } from "@/lib/training-presets";
import { cn } from "@/lib/utils";

type TrainingCtaVariant = "primary" | "secondary";

export function TrainingCta({
  href,
  preset,
  sourcePage,
  label,
  pageType = "seo-landing",
  variant = "primary",
  children,
}: {
  href: string;
  preset?: TrainingPresetId;
  sourcePage: string;
  label: string;
  pageType?: string;
  variant?: TrainingCtaVariant;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        captureAnalyticsEvent(ANALYTICS_EVENTS.seoCtaClicked, {
          landing_path: sourcePage,
          entry_source: "seo",
          surface: pageType,
          preset,
          cta_label: label,
        });
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
        variant === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-border hover:bg-secondary/50"
      )}
    >
      {children ?? label}
    </Link>
  );
}
