"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ScoreDistribution } from "@/components/training/training-types";

export function ScoreDistributionCard({
  data,
  heading,
  scoreLabel,
}: {
  data: ScoreDistribution;
  heading: string;
  scoreLabel: string;
}) {
  const hasBuckets = data.buckets.length > 0 && data.maxCount > 0;

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4 text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{heading}</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums sm:text-2xl">
            {data.percentile !== null ? `${data.percentile}th percentile` : "Not enough data yet"}
          </p>
        </div>
        {typeof data.total === "number" ? (
          <div className="shrink-0 rounded-md border border-border bg-background/50 px-2 py-1 text-xs font-mono text-muted-foreground">
            n={data.total}
          </div>
        ) : null}
      </div>

      <div className="mt-2 text-sm text-muted-foreground">
        {scoreLabel}{" "}
        <span className="font-mono tabular-nums text-foreground">
          {typeof data.score === "number" ? data.score : "—"}
        </span>{" "}
        {data.bucket ? <span className="text-muted-foreground">(bucket {data.bucket})</span> : null}
      </div>

      {hasBuckets ? (
        <div className="mt-3 rounded-lg border border-border bg-background/40 p-3">
          <div className="flex gap-[3px] overflow-x-auto px-1 pb-2">
            {data.buckets.map((bucket, idx) => {
              const isUserBucket = idx === data.userBucketIndex;
              const heightPctRaw = data.maxCount
                ? Math.round((bucket.count / data.maxCount) * 100)
                : 0;
              const heightPct = bucket.count === 0 && !isUserBucket ? 0 : Math.max(4, heightPctRaw);
              const showTickLabel =
                isUserBucket ||
                idx === 0 ||
                idx === data.buckets.length - 1 ||
                bucket.from % 10 === 0;

              return (
                <Tooltip key={`${bucket.from}-${bucket.to}`}>
                  <TooltipTrigger asChild>
                    <div
                      className={[
                        "flex w-[18px] flex-none flex-col items-center",
                        "cursor-default select-none",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-0",
                      ].join(" ")}
                      tabIndex={0}
                      aria-label={`${bucket.from}–${bucket.to}: ${bucket.count} runs${
                        isUserBucket ? ", you are here" : ""
                      }`}
                    >
                      <div className="flex h-28 w-full items-end sm:h-36">
                        <div
                          className={[
                            "w-full rounded-sm transition-[height,background-color] duration-300",
                            bucket.count === 0 && !isUserBucket ? "min-h-0" : "min-h-[2px]",
                            isUserBucket
                              ? "bg-brand"
                              : "bg-muted-foreground/25 dark:bg-muted-foreground/35",
                          ].join(" ")}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>

                      {showTickLabel ? (
                        <span
                          className={[
                            "mt-2 text-[10px] font-mono tabular-nums leading-none",
                            isUserBucket
                              ? "font-semibold text-brand"
                              : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {bucket.from}
                        </span>
                      ) : (
                        <span className="mt-2 h-[10px]" aria-hidden="true" />
                      )}

                      {isUserBucket ? (
                        <span
                          className="mt-1 h-1 w-1 bg-brand"
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono tabular-nums">
                        {bucket.from}–{bucket.to}
                      </span>
                      <span className="opacity-80">
                        {bucket.count} run{bucket.count === 1 ? "" : "s"}
                      </span>
                      {isUserBucket ? <span className="font-semibold">You</span> : null}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground">
            Distribution of best single-session scores (default timed settings)
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-border bg-background/30 p-3 text-sm text-muted-foreground">
          Distribution will appear once enough runs have been recorded.
        </div>
      )}
    </div>
  );
}


