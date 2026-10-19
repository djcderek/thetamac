import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  INTERVIEW_MATH_GUIDES,
  getInterviewMathGuideBySlug,
} from "@/content/interview-math/guides";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";

type GuidePageProps = {
  params: Promise<{ slug: string }>;
};

function buildGuideUrl(slug: string) {
  return `${siteUrl}/interview-math/${slug}`;
}

// Unknown slugs 404 at routing time. Calling notFound() during render came after the
// root loading.tsx had started streaming, so those pages answered 200 (a soft 404).
export const dynamicParams = false;

export function generateStaticParams() {
  return INTERVIEW_MATH_GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getInterviewMathGuideBySlug(slug);

  if (!guide) {
    return {
      title: "Guide Not Found",
      robots: { index: false, follow: false },
    };
  }

  const url = buildGuideUrl(slug);
  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical: `/interview-math/${guide.slug}`,
    },
    keywords: guide.primaryKeyword ? [guide.primaryKeyword, "interview math practice"] : undefined,
    openGraph: {
      title: `${guide.title} | thetamac`,
      description: guide.description,
      url,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: `${guide.title} | thetamac`,
      description: guide.description,
    },
  };
}

export default async function InterviewMathGuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getInterviewMathGuideBySlug(slug);

  if (!guide) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    dateModified: guide.lastReviewed ?? "2026-03-04",
    author: {
      "@type": "Organization",
      name: "thetamac",
    },
    publisher: {
      "@type": "Organization",
      name: "thetamac",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": buildGuideUrl(guide.slug),
    },
    url: buildGuideUrl(guide.slug),
    inLanguage: "en-US",
  };

  const relatedGuides = guide.relatedGuides
    .map((relatedSlug) => getInterviewMathGuideBySlug(relatedSlug))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <header className="mb-8">
        <Link
          href="/interview-math"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Interview Math Hub
        </Link>
        <h1 className="font-semibold text-4xl sm:text-5xl tracking-tight mt-3 mb-3">
          {guide.title}
        </h1>
        <p className="text-lg text-muted-foreground">{guide.description}</p>
        {guide.lastReviewed ? (
          <p className="text-xs text-muted-foreground mt-3">Last reviewed: {guide.lastReviewed}</p>
        ) : null}
      </header>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2">Quick Answer</h2>
        <p className="text-sm text-muted-foreground">{guide.quickAnswer}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Why It Matters in Interviews</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          {guide.whyItMatters.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Practice Drill Plan</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
          {guide.drillPlan.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Common Mistakes</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          {guide.commonMistakes.map((mistake) => (
            <li key={mistake}>{mistake}</li>
          ))}
        </ul>
      </section>

      {guide.workedExample ? (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-2">Worked Example: {guide.workedExample.title}</h2>
          <p className="text-sm text-muted-foreground mb-4">{guide.workedExample.prompt}</p>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            {guide.workedExample.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-4 text-sm font-medium">Answer: {guide.workedExample.answer}</p>
          <p className="mt-2 text-sm text-muted-foreground">{guide.workedExample.takeaway}</p>
        </section>
      ) : null}

      {guide.practicePrompts?.length ? (
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">Try These Practice Prompts</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            {guide.practicePrompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2">Practice Now</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Use these drills in short sessions and track your score/accuracy trend each week.
        </p>
        <div className="flex flex-wrap gap-3">
          {guide.slug === "mental-math-speed-test" ? (
            <Link
              href="/arithmetic-speed-test"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Take Arithmetic Speed Test
            </Link>
          ) : null}
          <Link
            href="/"
            className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              guide.slug === "mental-math-speed-test"
                ? "border border-border hover:bg-secondary/50"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            Start Training
          </Link>
          <Link
            href="/training/focused"
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary/50 transition-colors"
          >
            Focused Training
          </Link>
        </div>
      </section>

      {relatedGuides.length > 0 ? (
        <section>
          <h2 className="text-xl font-semibold mb-3">Related Guides</h2>
          <ul className="space-y-2">
            {relatedGuides.map((related) => (
              <li key={related.slug}>
                <Link
                  href={`/interview-math/${related.slug}`}
                  className="text-sm text-primary hover:underline"
                >
                  {related.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
