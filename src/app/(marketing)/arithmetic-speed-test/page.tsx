import type { Metadata } from "next";
import Link from "next/link";
import { TrainingCta } from "@/components/marketing/training-cta";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";
const pagePath = "/arithmetic-speed-test";
const pageUrl = `${siteUrl}${pagePath}`;

const faq = [
  {
    question: "What is a good arithmetic speed test score?",
    answer:
      "A good first benchmark is a score you can repeat with at least 90% accuracy. Once accuracy is stable, increase speed or difficulty.",
  },
  {
    question: "How long should the test be?",
    answer:
      "Two minutes is long enough to expose pacing and short enough to repeat weekly without fatigue.",
  },
  {
    question: "Which operations are included?",
    answer:
      "The default benchmark mixes addition, subtraction, multiplication, and division at medium difficulty.",
  },
];

export const metadata: Metadata = {
  title: "Arithmetic Speed Test Online",
  description:
    "Test arithmetic speed with a timed mental math benchmark. Practice addition, subtraction, multiplication, and division with instant scoring.",
  alternates: {
    canonical: pagePath,
  },
  openGraph: {
    title: "Arithmetic Speed Test Online | thetamac",
    description:
      "Run a two-minute arithmetic speed benchmark with instant scoring and leaderboard context.",
    url: pageUrl,
  },
};

export default function ArithmeticSpeedTestPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Arithmetic Speed Test",
      url: pageUrl,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description:
        "A timed mental arithmetic benchmark for addition, subtraction, multiplication, and division.",
    },
    {
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
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Training",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Arithmetic Speed Test",
          item: pageUrl,
        },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Timed Benchmark</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Arithmetic Speed Test</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Measure how many arithmetic problems you can solve in two minutes across addition,
          subtraction, multiplication, and division. Start with accuracy, then push speed.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <TrainingCta
            href="/?preset=arithmetic-speed-test&source=seo&page=/arithmetic-speed-test"
            preset="arithmetic-speed-test"
            sourcePage={pagePath}
            label="Start Speed Test"
          />
          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary/50 transition-colors"
          >
            View Leaderboard
          </Link>
        </div>
      </header>

      <section className="mb-10 rounded-xl border border-border bg-secondary/25 p-6">
        <h2 className="text-xl font-semibold mb-3">Quick Answer</h2>
        <p className="text-sm text-muted-foreground">
          Use the same settings each time: 120 seconds, medium difficulty, and all four operations.
          Track total solved, accuracy, and average time per problem. Retest weekly.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3 mb-10">
        {[
          ["1. Start", "Run the default two-minute mixed arithmetic test."],
          ["2. Review", "Check solved count, accuracy, and average time."],
          ["3. Focus", "Drill the operation that slowed you down, then retest."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold mb-2">{title}</h2>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Improve Your Benchmark</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/practice/addition" className="rounded-xl border border-border p-4 hover:bg-secondary/30 transition-colors">
            Addition drills
          </Link>
          <Link href="/practice/subtraction" className="rounded-xl border border-border p-4 hover:bg-secondary/30 transition-colors">
            Subtraction drills
          </Link>
          <Link href="/practice/multiplication" className="rounded-xl border border-border p-4 hover:bg-secondary/30 transition-colors">
            Multiplication practice
          </Link>
          <Link href="/practice/division" className="rounded-xl border border-border p-4 hover:bg-secondary/30 transition-colors">
            Division practice
          </Link>
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-border bg-card p-6">
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

      <p className="text-sm text-muted-foreground">
        For a full practice framework, read{" "}
        <Link href="/blog/timed-arithmetic-drills" className="text-primary hover:underline">
          Timed Arithmetic Drills
        </Link>
        .
      </p>
    </div>
  );
}
