"use client";

import type { ScoreDistribution } from "@/components/training/training-types";
import { formatPlacement } from "@/lib/placement";
import { MIN_PLAYERS, MIN_RUNS } from "@/lib/run-placement";
import { NormalCurve } from "@/components/training/normal-curve";

export function ScoreDistributionCard({
  data,
  heading,
  scoreLabel,
}: {
  data: ScoreDistribution;
  heading: string;
  scoreLabel: string;
}) {

  return (
    <div className="rounded-[22px] bg-secondary p-5 text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">{heading}</p>
          <p className="mt-0.5 text-[26px] font-semibold tracking-[-0.03em] tabular-nums">
            {formatPlacement(data.percentile)}
          </p>
        </div>
      </div>

      <div className="mt-2 text-sm text-muted-foreground">
        {scoreLabel}{" "}
        <span className="font-mono tabular-nums text-foreground">
          {typeof data.score === "number" ? data.score : "—"}
        </span>{" "}
        {data.bucket && data.bucket.split("-")[0] !== data.bucket.split("-")[1] ? (
          <span className="text-muted-foreground">(bucket {data.bucket})</span>
        ) : null}
      </div>

      {data.percentile !== null ? (
        <div className="mt-4 rounded-2xl bg-background p-3">
          {/* The percentile as area under a bell curve: the shaded part is the share of runs beaten. */}
          <NormalCurve percentile={data.percentile} surface="background" className="mx-auto mb-3 mt-5 max-w-md" />

          <div className="text-xs text-muted-foreground">
            {data.setupLabel
              ? `${data.comparison === "historical" ? "Estimated comparison" : "Full timed runs"} on ${data.setupLabel}`
              : "Scores from every timed run on the default settings"}
          </div>
          {data.comparison === "historical" && (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Includes historical runs matched by recorded duration; their selected timer and number ranges weren’t saved.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-background p-3 text-sm text-muted-foreground">
          {data.setupLabel
            ? `Not enough runs on ${data.setupLabel} yet. Placement shows once ${MIN_RUNS} full runs from ${MIN_PLAYERS} players are in.`
            : "Distribution will appear once enough runs have been recorded."}
        </div>
      )}
    </div>
  );
}


