import type { Metadata } from "next";
import Link from "next/link";
import { TrainingCta } from "@/components/marketing/training-cta";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";
const pagePath = "/zetamac-alternative";
const pageUrl = `${siteUrl}${pagePath}`;

const faq = [
  {
    question: "Is thetamac affiliated with Zetamac?",
    answer:
      "No. thetamac is an independent mental math training app. This page is for people searching for Zetamac-style timed arithmetic practice.",
  },
  {
    question: "Can I practice without creating an account?",
    answer:
      "Yes. You can start a timed arithmetic test as a guest. Creating an account is useful if you want saved progress and deeper analytics.",
  },
  {
    question: "What makes thetamac different from a basic timed arithmetic test?",
    answer:
      "thetamac adds learning mode, leaderboards, racing, multiplayer duels, progress analytics, and weak-point training on top of timed arithmetic drills.",
  },
  {
    question: "Are the timed arithmetic settings comparable?",
    answer:
      "The default speed test is a two-minute mixed arithmetic benchmark across addition, subtraction, multiplication, and division, designed for repeatable speed practice.",
  },
];

const features = [
  {
    title: "Timed arithmetic drills",
    description:
      "Run fast mixed-operation benchmarks or isolate addition, subtraction, multiplication, and division.",
  },
  {
    title: "Leaderboards",
    description:
      "Compare default timed runs against other players with consistent benchmark settings.",
  },
  {
    title: "Learning mode",
    description:
      "Slow down and review mental math techniques like round-and-adjust, distributive multiplication, and division shortcuts.",
  },
  {
    title: "Racing and multiplayer",
    description:
      "Turn arithmetic speed into competitive duels and racing sessions when solo drills get stale.",
  },
  {
    title: "Progress analytics",
    description:
      "Track score, accuracy, average time, streaks, and improvement patterns over time.",
  },
  {
    title: "Weak-point training",
    description:
      "Use performance history to identify slower operations and turn them into focused practice.",
  },
];

export const metadata: Metadata = {
  title: "Zetamac Alternative for Timed Arithmetic Practice",
  description:
    "Try a modern Zetamac-style arithmetic speed test with timed drills, leaderboards, learning mode, racing, and progress tracking.",
  alternates: {
    canonical: pagePath,
  },
  openGraph: {
    title: "Zetamac Alternative for Timed Arithmetic Practice | thetamac",
    description:
      "A modern timed arithmetic trainer with leaderboards, learning mode, racing, and progress tracking.",
    url: pageUrl,
  },
};

export default function ZetamacAlternativePage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "thetamac timed arithmetic trainer",
      url: pageUrl,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description:
        "A timed arithmetic trainer with mixed-operation speed tests, leaderboards, learning mode, racing, and progress tracking.",
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
          name: "Zetamac Alternative",
          item: pageUrl,
        },
      ],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Timed Arithmetic Practice
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Zetamac Alternative for Timed Arithmetic Practice
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Looking for Zetamac-style mental math speed practice with more feedback? thetamac gives
          you fast timed arithmetic drills plus learning mode, leaderboards, racing, multiplayer,
          and progress analytics.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <TrainingCta
            href="/?preset=arithmetic-speed-test&source=seo&page=/zetamac-alternative"
            preset="arithmetic-speed-test"
            sourcePage={pagePath}
            label="Start Timed Arithmetic Test"
          />
          <Link
            href="/arithmetic-speed-test"
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary/50 transition-colors"
          >
            View Speed Test Guide
          </Link>
        </div>
      </header>

      <section className="mb-10 rounded-xl border border-border bg-secondary/25 p-6">
        <h2 className="text-xl font-semibold mb-3">Quick Answer</h2>
        <p className="text-sm text-muted-foreground">
          If you like the simplicity of timed arithmetic tests, start with the two-minute mixed
          benchmark. Then use focused drills and learning mode to improve the specific operations
          that are slowing you down.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">How the Practice Experience Compares</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-3 border-b border-border bg-secondary/30 text-sm font-medium">
            <div className="p-3">Need</div>
            <div className="p-3">Zetamac-style practice</div>
            <div className="p-3">thetamac</div>
          </div>
          {[
            ["Timed arithmetic", "Fast mixed-operation sprints", "Two-minute benchmarks and configurable timed drills"],
            ["Feedback", "Score-focused practice", "Score, accuracy, average time, streaks, and technique review"],
            ["Improvement loop", "Repeat the test", "Benchmark, isolate weak operations, drill, then retest"],
            ["Competition", "Speed challenge format", "Leaderboards, racing, and multiplayer duels"],
          ].map(([need, baseline, thetamac]) => (
            <div key={need} className="grid grid-cols-3 border-b border-border last:border-b-0 text-sm">
              <div className="p-3 font-medium">{need}</div>
              <div className="p-3 text-muted-foreground">{baseline}</div>
              <div className="p-3 text-muted-foreground">{thetamac}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {features.map((feature) => (
          <article key={feature.title} className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold mb-2">{feature.title}</h2>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="mb-10 rounded-xl border border-border bg-secondary/25 p-6">
        <h2 className="text-xl font-semibold mb-3">A Better Weekly Practice Loop</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Run the default two-minute mixed arithmetic benchmark.</li>
          <li>Review accuracy, average time, and which operation felt slowest.</li>
          <li>
            Drill one focus area:{" "}
            <Link href="/practice/multiplication" className="text-primary hover:underline">
              multiplication
            </Link>
            ,{" "}
            <Link href="/practice/division" className="text-primary hover:underline">
              division
            </Link>
            , addition, or subtraction.
          </li>
          <li>Retest with the same benchmark so your score trend stays comparable.</li>
        </ol>
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
        New to structured training? Start with{" "}
        <Link href="/mental-math-practice" className="text-primary hover:underline">
          mental math practice online
        </Link>{" "}
        or read the{" "}
        <Link href="/blog/timed-arithmetic-drills" className="text-primary hover:underline">
          timed arithmetic drills guide
        </Link>
        .
      </p>
    </div>
  );
}
