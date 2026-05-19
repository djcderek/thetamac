"use client";

import Link from "next/link";
import { TrainingCta } from "@/components/marketing/training-cta";
import type { TrainingPresetId } from "@/lib/training-presets";

export function BlogPracticeCta({
  sourcePage,
  body,
  primaryHref,
  primaryPreset,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  sourcePage: string;
  body: string;
  primaryHref: string;
  primaryPreset: TrainingPresetId;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="my-6 rounded-lg border border-border bg-secondary/25 p-5">
      <p className="mb-3 text-sm text-muted-foreground">{body}</p>
      <div className="flex flex-wrap gap-3">
        <TrainingCta
          href={primaryHref}
          preset={primaryPreset}
          sourcePage={sourcePage}
          label={primaryLabel}
          pageType="blog"
        />
        {secondaryHref && secondaryLabel ? (
          <Link
            href={secondaryHref}
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/50"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
