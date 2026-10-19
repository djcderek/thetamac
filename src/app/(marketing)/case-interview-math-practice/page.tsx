import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { TrainingCta } from "@/components/marketing/training-cta";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";
const pagePath = "/case-interview-math-practice";
const pageUrl = `${siteUrl}${pagePath}`;

const modules = [
  {
    title: "Percentages",
    description: "Use 10%, 5%, and 1% anchors for margins, growth, and conversion rates.",
    href: "/interview-math/percentages-fast",
  },
  {
    title: "Market sizing",
    description: "Translate prompts into population x penetration x frequency x price.",
    href: "/interview-math/market-sizing-math",
  },
  {
    title: "CAGR and growth",
    description: "Estimate growth rates with Rule of 72 and benchmark compounding patterns.",
    href: "/interview-math/growth-rates-and-cagr",
  },
  {
    title: "Breakeven",
    description: "Compute contribution per unit first, then divide fixed cost by contribution.",
    href: "/blog/break-even-contribution-margin-interview-math",
  },
  {
    title: "Unit economics",
    description: "Practice CAC, payback, margin, and LTV-style arithmetic with clear units.",
    href: "/interview-math/unit-economics-math",
  },
  {
    title: "Averages",
    description: "Build speed on division, weighted averages, and reasonableness checks.",
    href: "/interview-math/division-and-averages",
  },
];

export const metadata: Metadata = {
  title: "Case Interview Math Practice",
  description:
    "Practice case interview math drills for percentages, breakeven, CAGR, market sizing, and profitability.",
  alternates: {
    canonical: pagePath,
  },
  openGraph: {
    title: "Case Interview Math Practice | thetamac",
    description:
      "Timed mental math practice for consulting case interviews: percentages, breakeven, CAGR, market sizing, and profitability.",
    url: pageUrl,
  },
};

export default function CaseInterviewMathPracticePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Case Interview Math Practice",
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: modules.map((module, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: module.title,
        url: `${siteUrl}${module.href}`,
      })),
    },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <MarketingHero
        eyebrow="Interview Prep"
        title="Case Interview Math Practice"
        lede="Build the fast, reliable arithmetic used in consulting cases: percentages, growth, breakeven, market sizing, profitability, unit economics, and averages."
        shapes={["times", "trophy"]}
      >
        <TrainingCta
          href="/?preset=interview-math&source=seo&page=/case-interview-math-practice"
          preset="interview-math"
          sourcePage={pagePath}
          label="Start Interview Math Drill"
        />
        <Link
          href="/interview-math"
          className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary/50 transition-colors"
        >
          Browse Guides
        </Link>
      </MarketingHero>

      <section className="mb-14">
        <h2 className="text-xl font-semibold mb-3">Quick Answer</h2>
        <p className="text-sm text-muted-foreground">
          Practice basic arithmetic under time pressure, then layer business prompts on top. Most
          case math mistakes come from rushing setup, dropping units, or losing accuracy on simple
          percentages and division.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {modules.map((module) => (
          <article key={module.title} className="border-t border-border pt-4">
            <h2 className="text-lg font-semibold mb-2">{module.title}</h2>
            <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
            <Link href={module.href} className="text-sm font-medium text-primary hover:underline">
              Open guide
            </Link>
          </article>
        ))}
      </section>

      <section className="border-t border-border pt-4">
        <h2 className="text-xl font-semibold mb-3">Use This 10-Minute Drill</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Two minutes: medium mixed arithmetic warm-up.</li>
          <li>Six minutes: focus on the operation that slows your cases down.</li>
          <li>Two minutes: timed benchmark and note one mistake pattern.</li>
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">
          For worked examples, start with{" "}
          <Link href="/blog/case-interview-math-questions" className="text-primary hover:underline">
            case interview math questions
          </Link>{" "}
          and{" "}
          <Link href="/blog/market-sizing-examples-answers" className="text-primary hover:underline">
            market sizing examples
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
