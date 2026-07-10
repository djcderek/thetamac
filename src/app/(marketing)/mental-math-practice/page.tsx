import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { TrainingCta } from "@/components/marketing/training-cta";
import { TRAINING_SEO_FAQ } from "@/content/training-faq";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";
const pagePath = "/mental-math-practice";
const pageUrl = `${siteUrl}${pagePath}`;

export const metadata: Metadata = {
  title: "Mental Math Practice Online",
  description:
    "Practice mental arithmetic online with timed drills, learning mode, leaderboards, and progress tracking.",
  alternates: {
    canonical: pagePath,
  },
  openGraph: {
    title: "Mental Math Practice Online | thetamac",
    description:
      "Practice mental arithmetic with timed drills, learning mode, leaderboards, and progress tracking.",
    url: pageUrl,
  },
};

export default function MentalMathPracticePage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "thetamac mental math practice",
      url: pageUrl,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description:
        "Online mental math practice with timed arithmetic drills, learning mode, leaderboards, and progress tracking.",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: TRAINING_SEO_FAQ.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Practice Online</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Mental Math Practice Online</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Train mental arithmetic with short timed sessions, focused operation drills, and a
          learning mode that shows practical shortcuts after you answer.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <TrainingCta
            href="/?preset=arithmetic-speed-test&source=seo&page=/mental-math-practice"
            preset="arithmetic-speed-test"
            sourcePage={pagePath}
            label="Start Practicing"
          />
          <Link
            href="/arithmetic-speed-test"
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary/50 transition-colors"
          >
            Take Speed Test
          </Link>
        </div>
      </header>

      <section aria-labelledby="practice-features" className="mb-10">
        <h2 id="practice-features" className="mb-4 text-2xl font-semibold">
          Ways to train
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Timed drills", "Build speed with short sprint sessions."],
            ["Learning mode", "Review shortcuts and step-by-step explanations."],
            ["Competitive modes", "Compare scores on leaderboards, race, or join a duel."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-border bg-secondary/25 p-6">
        <h2 className="text-xl font-semibold mb-3">Pick a focus</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/practice/multiplication" className="text-primary hover:underline">
            Multiplication practice
          </Link>
          <Link href="/arithmetic-speed-test" className="text-primary hover:underline">
            Arithmetic speed test
          </Link>
          <Link href="/zetamac-alternative" className="text-primary hover:underline">
            Zetamac alternative
          </Link>
          <Link href="/interview-math" className="text-primary hover:underline">
            Interview math guides
          </Link>
          <Link href="/blog/timed-arithmetic-drills" className="text-primary hover:underline">
            Timed arithmetic drill plan
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">Build a practice routine</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-2 font-semibold">A simple 10-minute session</h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Warm up with medium mixed arithmetic for two minutes.</li>
              <li>Run one focused operation drill for six minutes.</li>
              <li>Finish with a two-minute benchmark and compare accuracy.</li>
            </ol>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-2 font-semibold">Interview prep routine</h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Warm up for two minutes with medium addition and subtraction.</li>
              <li>Practice all operations under time pressure for five minutes.</li>
              <li>Review difficult patterns in Learning mode for three minutes.</li>
            </ol>
          </div>
        </div>
      </section>

      <section aria-labelledby="mental-math-faq">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="mental-math-faq" className="text-2xl font-semibold">
            Frequently asked questions
          </h2>
          <Link
            href="/blog"
            className="shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Read guides →
          </Link>
        </div>
        <div className="space-y-3">
          {TRAINING_SEO_FAQ.map((item) => (
            <details key={item.question} className="group rounded-xl border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-medium marker:content-none">
                {item.question}
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="px-4 pb-4 text-sm leading-6 text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
