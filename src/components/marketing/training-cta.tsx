"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackEvent } from "@/lib/telemetry-client";
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
        trackEvent("seo_cta_click", {
          landingPath: sourcePage,
          source: "seo",
          preset,
          pageType,
          ctaLabel: label,
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
