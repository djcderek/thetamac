import type { Metadata } from "next";
import Link from "next/link";
import { getTrainingDistribution } from "@/lib/training-distribution";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";
const pageUrl = `${siteUrl}/interview-math/insights`;

export const metadata: Metadata = {
  title: "Interview Math Aggregate Insights",
  description:
    "Read-only aggregate insights from timed mental math runs: distribution, median, mean, and spread trends.",
  alternates: {
    canonical: "/interview-math/insights",
  },
  openGraph: {
    title: "Interview Math Aggregate Insights | thetamac",
    description:
      "Read-only aggregate stats to benchmark interview math readiness.",
    url: pageUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function InterviewMathInsightsPage() {
  const distribution = await getTrainingDistribution();
  const nonEmptyBuckets = distribution.buckets.filter((bucket) => bucket.count > 0);
  const topBuckets = [...nonEmptyBuckets]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const modeBucket = nonEmptyBuckets.reduce<(typeof nonEmptyBuckets)[number] | null>(
    (acc, bucket) => {
      if (!acc || bucket.count > acc.count) return bucket;
      return acc;
    },
    null
  );

  const insightsJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "thetamac interview math aggregate distribution",
    description:
      "Anonymized aggregate distribution of timed training scores used for interview math readiness benchmarks.",
    url: pageUrl,
    creator: {
      "@type": "Organization",
      name: "thetamac",
    },
    variableMeasured: ["totalRuns", "medianScore", "meanScore", "stdDev"],
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(insightsJsonLd) }}
      />

      <header className="mb-10">
        <p className="text-xs text-muted-foreground mb-2">
          Read-only Aggregate Data
        </p>
        <h1 className="font-semibold text-4xl sm:text-5xl tracking-tight mb-3">
          Interview Math Aggregate Insights
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Quick answer: use median and spread to benchmark readiness, then train your weakest
          operations with short focused blocks. These stats are anonymized and aggregate-only.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Total timed runs</p>
          <p className="text-2xl font-semibold mt-1">{distribution.total.toLocaleString()}</p>
        </div>
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Median score</p>
          <p className="text-2xl font-semibold mt-1">
            {distribution.median !== null ? distribution.median.toFixed(1) : "—"}
          </p>
        </div>
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Mean score</p>
          <p className="text-2xl font-semibold mt-1">
            {distribution.mean !== null ? distribution.mean.toFixed(1) : "—"}
          </p>
        </div>
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Std dev</p>
          <p className="text-2xl font-semibold mt-1">
            {distribution.stdDev !== null ? distribution.stdDev.toFixed(1) : "—"}
          </p>
        </div>
      </section>

      <section className="mb-14">
        <h2 className="text-xl font-semibold mb-3">How to use these benchmarks</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
          <li>
            If your score is below median, build speed with{" "}
            <Link href="/interview-math/daily-routine" className="text-primary hover:underline">
              short daily routine drills
            </Link>
            .
          </li>
          <li>
            If your score is near mean but inconsistent, focus on{" "}
            <Link
              href="/interview-math/brain-friendly-drill-plan"
              className="text-primary hover:underline"
            >
              consistency and recovery
            </Link>
            .
          </li>
          <li>
            If your score plateaus, isolate weak operations in{" "}
            <Link href="/training/focused" className="text-primary hover:underline">
              focused training
            </Link>{" "}
            and retest weekly.
          </li>
        </ol>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 mb-10">
        <div className="border-t border-border pt-4">
          <h2 className="text-lg font-semibold mb-3">Most common score range</h2>
          <p className="text-sm text-muted-foreground">
            {modeBucket
              ? `${modeBucket.from}–${modeBucket.to} (${modeBucket.count.toLocaleString()} runs)`
              : "No score data available yet."}
          </p>
        </div>
        <div className="border-t border-border pt-4">
          <h2 className="text-lg font-semibold mb-3">Top score ranges</h2>
          {topBuckets.length > 0 ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {topBuckets.map((bucket) => (
                <li key={`${bucket.from}-${bucket.to}`}>
                  {bucket.from}–{bucket.to}: {bucket.count.toLocaleString()} runs
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No distribution data available yet.</p>
          )}
        </div>
      </section>

      <section className="border-t border-border pt-4">
        <h2 className="text-lg font-semibold mb-3">Recommended next action</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Start a 2-minute timed run and compare your trend weekly against these aggregate
          benchmarks.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start Training
          </Link>
          <Link
            href="/interview-math"
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary/50 transition-colors"
          >
            Browse Interview Guides
          </Link>
        </div>
      </section>
    </div>
  );
}
