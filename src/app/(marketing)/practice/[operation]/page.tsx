import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrainingCta } from "@/components/marketing/training-cta";
import type { TrainingPresetId } from "@/lib/training-presets";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";

type OperationSlug = "addition" | "subtraction" | "multiplication" | "division";

const operationPages: Record<
  OperationSlug,
  {
    title: string;
    h1: string;
    description: string;
    preset: TrainingPresetId;
    quick: string;
    mistake: string;
    related: Array<{ href: string; label: string }>;
  }
> = {
  addition: {
    title: "Addition Drills Online",
    h1: "Addition Drills",
    description:
      "Build faster addition with short timed drills, friendly-number strategies, and instant feedback.",
    preset: "addition-drills",
    quick:
      "Practice addition in short timed sets and look for friendly-number patterns like complements of 10 and round-and-adjust.",
    mistake:
      "The common mistake is carrying too late. Add left-to-right so you know the approximate size of the answer early.",
    related: [
      { href: "/arithmetic-speed-test", label: "Arithmetic speed test" },
      { href: "/blog/timed-arithmetic-drills", label: "Timed arithmetic drills" },
    ],
  },
  subtraction: {
    title: "Subtraction Drills Online",
    h1: "Subtraction Drills",
    description:
      "Practice mental subtraction with timed sets, accuracy tracking, and focused difficulty controls.",
    preset: "subtraction-drills",
    quick:
      "Build subtraction speed by splitting the second number into tens and ones or using add-up checks for close numbers.",
    mistake:
      "The common mistake is forcing paper-style borrowing. Use distance and complement thinking when numbers are close.",
    related: [
      { href: "/practice/addition", label: "Addition drills" },
      { href: "/mental-math-practice", label: "Mental math practice" },
    ],
  },
  multiplication: {
    title: "Multiplication Practice Online",
    h1: "Multiplication Practice",
    description:
      "Get faster at multiplication with timed mental math drills and shortcut-focused learning mode.",
    preset: "multiplication-practice",
    quick:
      "Use distributive breakdowns, near-base patterns, and repeated short drills to make multiplication automatic.",
    mistake:
      "The common mistake is using one method for every problem. Pick the shortcut that fits the number shape.",
    related: [
      { href: "/blog/fast-multiplication-techniques", label: "Fast multiplication techniques" },
      { href: "/interview-math/quick-multiplication-patterns", label: "Interview multiplication patterns" },
    ],
  },
  division: {
    title: "Division Practice Online",
    h1: "Division Practice",
    description:
      "Improve mental division speed with focused drills, factor shortcuts, and benchmark tracking.",
    preset: "division-practice",
    quick:
      "Treat division as reverse multiplication, use factor decomposition, and sanity-check quotients before moving on.",
    mistake:
      "The common mistake is starting long division too early. Check for clean factors and reverse multiplication first.",
    related: [
      { href: "/interview-math/division-and-averages", label: "Division and averages for interviews" },
      { href: "/practice/multiplication", label: "Multiplication practice" },
    ],
  },
};

function isOperationSlug(value: string): value is OperationSlug {
  return value in operationPages;
}

// Unknown slugs 404 at routing time. Calling notFound() during render came after the
// root loading.tsx had started streaming, so those pages answered 200 (a soft 404).
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(operationPages).map((operation) => ({ operation }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ operation: string }>;
}): Promise<Metadata> {
  const { operation } = await params;
  if (!isOperationSlug(operation)) {
    return {
      title: "Practice Not Found",
      robots: { index: false, follow: false },
    };
  }

  const page = operationPages[operation];
  const path = `/practice/${operation}`;

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${page.title} | thetamac`,
      description: page.description,
      url: `${siteUrl}${path}`,
    },
  };
}

export default async function OperationPracticePage({
  params,
}: {
  params: Promise<{ operation: string }>;
}) {
  const { operation } = await params;
  if (!isOperationSlug(operation)) notFound();

  const page = operationPages[operation];
  const path = `/practice/${operation}`;
  const ctaHref = `/?preset=${page.preset}&source=seo&page=${encodeURIComponent(path)}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: page.title,
      url: `${siteUrl}${path}`,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description: page.description,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `How should I practice ${operation}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: page.quick,
          },
        },
        {
          "@type": "Question",
          name: "How long should each drill be?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use short two-minute benchmarks and six-to-eight-minute focused practice blocks.",
          },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Mental Math Practice",
          item: `${siteUrl}/mental-math-practice`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: page.h1,
          item: `${siteUrl}${path}`,
        },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Focused Practice</p>
        <h1 className="font-serif text-4xl sm:text-5xl font-normal tracking-tight mb-3">{page.h1}</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">{page.description}</p>
        <div className="mt-5">
          <TrainingCta href={ctaHref} preset={page.preset} sourcePage={path} label={`Start ${page.h1}`} />
        </div>
      </header>

      <section className="mb-10 border-t-2 border-foreground/75 pt-5">
        <h2 className="text-xl font-semibold mb-3">Quick Answer</h2>
        <p className="text-sm text-muted-foreground">{page.quick}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3 mb-10">
        {[
          ["Warm up", "Start with one easy set to get rhythm without rushing."],
          ["Drill", "Run a focused timed block with this operation only."],
          ["Retest", "Return to a mixed arithmetic benchmark and compare speed."],
        ].map(([title, body]) => (
          <div key={title} className="border-t border-border pt-4">
            <h2 className="text-lg font-semibold mb-2">{title}</h2>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-3">Common Mistake</h2>
        <p className="text-sm text-muted-foreground">{page.mistake}</p>
      </section>

      <section className="border-t border-border pt-4">
        <h2 className="text-xl font-semibold mb-3">Related Practice</h2>
        <div className="flex flex-wrap gap-3">
          {page.related.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-primary hover:underline">
              {link.label}
            </Link>
          ))}
          <Link href="/arithmetic-speed-test" className="text-sm text-primary hover:underline">
            Full arithmetic speed test
          </Link>
        </div>
      </section>
    </div>
  );
}
