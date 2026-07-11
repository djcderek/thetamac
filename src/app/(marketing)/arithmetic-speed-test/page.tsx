import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHero } from "@/components/marketing/marketing-hero";
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

      <MarketingHero
        eyebrow="Timed Benchmark"
        title="Arithmetic Speed Test"
        lede="Measure how many arithmetic problems you can solve in two minutes across addition, subtraction, multiplication, and division. Start with accuracy, then push speed."
        shapes={["bolt", "trophy"]}
      >
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
      </MarketingHero>

      <section className="mb-10 border-t-2 border-foreground/75 pt-5">
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
          <div key={title} className="border-t border-border pt-4">
            <h2 className="text-lg font-semibold mb-2">{title}</h2>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Improve Your Benchmark</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/practice/addition" className="border-t border-border px-1 py-4 transition-colors hover:bg-secondary/40">
            Addition drills
          </Link>
          <Link href="/practice/subtraction" className="border-t border-border px-1 py-4 transition-colors hover:bg-secondary/40">
            Subtraction drills
          </Link>
          <Link href="/practice/multiplication" className="border-t border-border px-1 py-4 transition-colors hover:bg-secondary/40">
            Multiplication practice
          </Link>
          <Link href="/practice/division" className="border-t border-border px-1 py-4 transition-colors hover:bg-secondary/40">
            Division practice
          </Link>
        </div>
      </section>

      <section className="mb-10 border-t-2 border-foreground/75 pt-5">
        <h2 className="text-xl font-semibold mb-3">Looking for a free Zetamac alternative?</h2>
        <p className="text-sm text-muted-foreground">
          Compare thetamac&apos;s two-minute benchmark, focused drills, and progress tracking with
          the timed-arithmetic practice experience you&apos;re looking for.
        </p>
        <Link
          href="/zetamac-alternative"
          className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Compare thetamac as a free Zetamac alternative
        </Link>
      </section>

      <section className="mb-10 border-t-2 border-foreground/75 pt-5">
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
        </Link>{" "}
        or compare thetamac as a{" "}
        <Link href="/zetamac-alternative" className="text-primary hover:underline">
          Zetamac alternative
        </Link>
        .
      </p>
    </div>
  );
}
