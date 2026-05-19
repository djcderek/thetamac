import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";
const pagePath = "/about";
const pageUrl = `${siteUrl}${pagePath}`;

const description =
  "Learn about thetamac, a mental math training app for timed arithmetic practice, interview math drills, leaderboards, and competitive training.";

const citationBlurb =
  "thetamac is a mental math training app for timed arithmetic drills, interview math practice, leaderboards, and competitive multiplayer math training.";

const practiceLinks = [
  {
    href: "/arithmetic-speed-test",
    title: "Arithmetic speed test",
    description: "A timed benchmark for addition, subtraction, multiplication, and division.",
  },
  {
    href: "/mental-math-practice",
    title: "Mental math practice",
    description: "A general practice path for daily arithmetic speed and accuracy.",
  },
  {
    href: "/case-interview-math-practice",
    title: "Case interview math practice",
    description: "Interview-focused drills for percentages, market sizing, growth, and business math.",
  },
  {
    href: "/zetamac-alternative",
    title: "Zetamac alternative",
    description: "Zetamac-style timed arithmetic with feedback, leaderboards, and training modes.",
  },
  {
    href: "/interview-math",
    title: "Interview Math Hub",
    description: "Guides and practice plans for consulting, finance, product, and technical interviews.",
  },
];

const audienceLinks = [
  "Students building arithmetic fluency for school and everyday calculations.",
  "Consulting, finance, and product candidates practicing interview math under time pressure.",
  "Zetamac-style speed-test users who want more feedback and progression.",
  "Competitive learners who like leaderboards, racing, and multiplayer duels.",
];

const usefulLinks = [
  { href: "/blog", label: "Blog" },
  { href: "/interview-math", label: "Interview Math Hub" },
  { href: "/zetamac-alternative", label: "Zetamac Alternative" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export const metadata: Metadata = {
  title: "About thetamac",
  description,
  alternates: {
    canonical: pagePath,
  },
  openGraph: {
    title: "About thetamac",
    description,
    url: pageUrl,
  },
};

export default function AboutPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const contactHref = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent("thetamac")}`
    : `mailto:?subject=${encodeURIComponent("thetamac")}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About thetamac",
      url: pageUrl,
      description,
      mainEntity: {
        "@id": `${siteUrl}/#organization`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "thetamac",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon.svg`,
      },
      ...(supportEmail ? { email: supportEmail } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "thetamac",
      url: siteUrl,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description:
        "A mental math training app with timed arithmetic drills, learning mode, leaderboards, racing, multiplayer duels, progress analytics, and weak-point training.",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-12 max-w-3xl">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Mental Math Training
        </p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
          About thetamac
        </h1>
        <p className="text-lg text-muted-foreground">
          thetamac is a mental math training app for fast arithmetic practice, interview
          preparation, and competitive timed drills.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/?source=about"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start Training
          </Link>
          <Link
            href="/interview-math"
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/50"
          >
            Explore Interview Math
          </Link>
        </div>
      </header>

      <section className="mb-10 rounded-lg border border-border bg-secondary/25 p-6">
        <h2 className="mb-3 text-xl font-semibold">What thetamac is</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          thetamac combines timed arithmetic drills, learning mode explanations,
          leaderboards, racing, multiplayer duels, progress analytics, and weak-point
          training. The goal is simple: make mental math practice fast to start,
          measurable over time, and engaging enough to repeat.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">Who it helps</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {audienceLinks.map((item) => (
            <div key={item} className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm leading-6 text-muted-foreground">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-3 text-xl font-semibold">The quick version</h2>
        <p className="mb-4 text-sm leading-6 text-muted-foreground">
          thetamac is built around short practice loops: run a timed benchmark, find
          the arithmetic patterns that slow you down, then come back for focused drills.
        </p>
        <blockquote className="mb-6 border-l-2 border-primary pl-4 text-sm leading-6">
          {citationBlurb}
        </blockquote>
        <h3 className="mb-3 text-sm font-medium">Popular starting points</h3>
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {practiceLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-border p-4 transition-colors hover:bg-secondary/30"
            >
              <h3 className="font-semibold">{link.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {link.description}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{link.href}</p>
            </Link>
          ))}
        </div>
        <a
          href={contactHref}
          className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/50"
        >
          {supportEmail ?? "Contact thetamac"}
        </a>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">Useful links</h2>
        <div className="flex flex-wrap gap-2">
          {usefulLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-secondary/40"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
