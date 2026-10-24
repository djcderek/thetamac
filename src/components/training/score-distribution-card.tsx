"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ScoreDistribution } from "@/components/training/training-types";
import { formatPlacement } from "@/lib/placement";
import { MIN_PLAYERS, MIN_RUNS } from "@/lib/run-placement";

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
    <div className="rounded-[22px] bg-secondary p-5 text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">{heading}</p>
          <p className="mt-0.5 text-[26px] font-semibold tracking-[-0.03em] tabular-nums">
            {formatPlacement(data.percentile)}
          </p>
        </div>
        {typeof data.total === "number" ? (
          <div className="shrink-0 text-right text-[13px] text-muted-foreground tabular-nums">
            {data.total} {data.total === 1 ? "run" : "runs"}
            {typeof data.players === "number" && (
              <>
                <br />
                {data.players} {data.players === 1 ? "player" : "players"}
              </>
            )}
          </div>
        ) : null}
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

      {hasBuckets ? (
        <div className="mt-4 rounded-2xl bg-background p-3">
          {/* Bars share the width so every bucket, including the player's, is visible; fixed-width
              bars scrolled high scores out of view. */}
          <div className="flex gap-px px-1 pb-2 sm:gap-[3px]">
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
                        "flex min-w-0 max-w-[18px] flex-1 flex-col items-center",
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
                            "mt-2 whitespace-nowrap text-[10px] font-mono tabular-nums leading-none",
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
            {data.setupLabel
              ? `Everyone's full timed runs on ${data.setupLabel}, up to 20 per player`
              : "Scores from every timed run on the default settings"}
          </div>
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


