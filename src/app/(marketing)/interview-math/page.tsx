import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { TrainingCta } from "@/components/marketing/training-cta";
import { INTERVIEW_MATH_GUIDES } from "@/content/interview-math/guides";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";
const pageUrl = `${siteUrl}/interview-math`;
const reviewedDate = "2026-03-04";

export const metadata: Metadata = {
  title: "Interview Math Practice Hub",
  description:
    "Interview-focused mental math guides for consulting, finance, and product interviews. Build speed and accuracy with actionable drill plans.",
  alternates: {
    canonical: "/interview-math",
  },
  keywords: [
    "mental math for interviews",
    "consulting interview math",
    "finance interview mental math",
    "case interview math practice",
    "mental math drills",
  ],
  openGraph: {
    title: "Interview Math Practice Hub | thetamac",
    description:
      "Interview-focused mental math guides and drill plans to improve speed, confidence, and accuracy.",
    url: pageUrl,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Interview Math Practice Hub | thetamac",
    description:
      "A complete set of interview-focused math guides and practice plans.",
  },
};

const faq = [
  {
    question: "How quickly can I improve interview mental math?",
    answer:
      "Most people see measurable speed and accuracy gains in 2-4 weeks with consistent daily timed practice.",
  },
  {
    question: "Which interview math topics should I start with?",
    answer:
      "Start with percentages, multiplication patterns, division/averages, and rounding-based estimation.",
  },
  {
    question: "Should I prioritize speed or accuracy first?",
    answer:
      "Keep accuracy above 90% while pushing speed gradually. Accuracy collapse is a sign to reduce pace briefly.",
  },
];

const hubJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Interview Math Practice Hub",
  url: pageUrl,
  dateModified: reviewedDate,
  inLanguage: "en-US",
  mainEntity: {
    "@type": "ItemList",
    itemListElement: INTERVIEW_MATH_GUIDES.map((guide, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl}/interview-math/${guide.slug}`,
      name: guide.title,
    })),
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function InterviewMathHubPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([hubJsonLd, faqJsonLd]) }}
      />

      <MarketingHero
        eyebrow="Interview Prep"
        title="Mental Math Interview Practice Hub"
        lede="Quick answer: build interview math skill with short, repeated timed drills and operation-specific practice. This hub gives you structured guides for percentages, estimation, market sizing, unit economics, and speed benchmarks."
        shapes={["theta", "times"]}
      />

      <section className="mb-14">
        <h2 className="text-xl font-semibold mb-3">Start Here (10-Minute Plan)</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Warm up for 2 minutes with easy mixed arithmetic.</li>
          <li>Run one focused drill (percentages, multiplication, or division) for 6 minutes.</li>
          <li>Finish with a 2-minute timed benchmark and log score + accuracy.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start Training
          </Link>
          <TrainingCta
            href="/?preset=interview-math&source=seo&page=/interview-math"
            preset="interview-math"
            sourcePage="/interview-math"
            label="Start Interview Drill"
          />
          <Link
            href="/case-interview-math-practice"
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary/50 transition-colors"
          >
            Case Math Practice
          </Link>
          <Link
            href="/arithmetic-speed-test"
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary/50 transition-colors"
          >
            Arithmetic Speed Test
          </Link>
          <Link
            href="/interview-math/insights"
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary/50 transition-colors"
          >
            View Aggregate Insights
          </Link>
          <Link
            href="/blog/mental-math-interview-drills"
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary/50 transition-colors"
          >
            Read the Daily Routine Guide
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Core Interview Math Guides</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {INTERVIEW_MATH_GUIDES.map((guide) => (
            <article key={guide.slug} className="border-t border-border pt-4">
              <h3 className="text-lg font-semibold leading-tight mb-2">{guide.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{guide.description}</p>
              <Link
                href={`/interview-math/${guide.slug}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Open guide →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border pt-4">
        <h2 className="text-xl font-semibold mb-3">FAQ</h2>
        <div className="space-y-5">
          {faq.map((item) => (
            <div key={item.question}>
              <h3 className="font-medium">{item.question}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
