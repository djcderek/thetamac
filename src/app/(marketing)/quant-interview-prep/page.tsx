import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ListChecks, Play, Puzzle, RotateCcw, Timer } from "lucide-react";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { TrainingCta } from "@/components/marketing/training-cta";
import { QuantSampleQuestion } from "@/components/marketing/quant-sample-question";
import { FREE_QUANT_LESSON_IDS, QUANT_LESSONS, QUANT_PUZZLES, QUANT_TOPICS, getQuantPuzzle } from "@/lib/quant/lessons";
import { MOCK_MINUTES, MOCK_QUESTIONS } from "@/lib/quant/mock";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";
const pagePath = "/quant-interview-prep";
const pageUrl = `${siteUrl}${pagePath}`;

const FIRST_LESSON = QUANT_LESSONS[0];
const SAMPLE_PUZZLE = "knockout-meeting";
// Well-known interview questions, each solved in the lesson whose method it uses.
const CLASSICS = [
  "monty-hall",
  "bertrands-box",
  "lost-boarding-pass",
  "broken-stick-triangle",
  "polya-urn",
  "ant-on-a-tetrahedron",
  "hundred-switches",
  "rolling-until-a-repeat",
  "two-coin-waits",
  "card-after-first-ace",
].map((id) => getQuantPuzzle(id)!);

const description = `A step-by-step course in the probability and expected value asked in trading and quant interviews: ${QUANT_LESSONS.length} lessons with practice questions, worked solutions, ${QUANT_PUZZLES.length} classic puzzles and a timed mock test.`;

const faqs = [
  {
    q: "What probability do quant interviews ask about?",
    a: "Mostly counting, conditional probability and expected value, asked as short puzzles about dice, coins, cards and games. Harder rounds add waiting times, random walks, betting and continuous problems like breaking a stick. The course covers all of these, in that order.",
  },
  {
    q: "Do I need calculus?",
    a: "Very little. The continuous probability unit works with areas of squares and triangles, and the rest of the course is counting, fractions and short calculations.",
  },
  {
    q: "How does a lesson work?",
    a: "Each lesson teaches one method. You read it a section at a time, with a few quick questions along the way, then practise on 7 questions: the first 2 walk you through the steps and the other 5 are on your own. Every question comes with a worked solution, and the numbers change each time.",
  },
  {
    q: "What’s free?",
    a: `The first two units, Counting and Probability basics: ${FREE_QUANT_LESSON_IDS.length} lessons with their practice, drills and puzzles, plus one mock test. Every lesson in the course is free to read. Pro opens practice for the other ${QUANT_LESSONS.length - FREE_QUANT_LESSON_IDS.length} lessons, unlimited mock tests and review, from $0.99 a month.`,
  },
  {
    q: "Which interviews is this for?",
    a: "Trader, quant researcher and quant developer interviews at trading firms, banks and hedge funds, and the probability questions in data science interviews.",
  },
];

export const metadata: Metadata = {
  title: "Quant Interview Prep: Probability and Expected Value",
  description,
  alternates: { canonical: pagePath },
  openGraph: {
    title: "Quant Interview Prep: Probability and Expected Value | thetamac",
    description,
    url: pageUrl,
  },
};

function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 max-w-2xl">
      {eyebrow && <p className="mb-2 text-[15px] font-medium text-muted-foreground">{eyebrow}</p>}
      <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">{title}</h2>
      {children && <p className="mt-3 text-[17px] leading-7 text-muted-foreground">{children}</p>}
    </div>
  );
}

export default function QuantInterviewPrepPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        name: "Quant interview probability course",
        description,
        url: pageUrl,
        provider: { "@type": "Organization", name: "thetamac", url: siteUrl },
        hasPart: QUANT_LESSONS.map((lesson) => ({
          "@type": "LearningResource",
          name: lesson.title,
          url: `${siteUrl}/quant/${lesson.id}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <MarketingHero
        eyebrow="Quant interview prep"
        title="Probability for quant interviews"
        lede={`${QUANT_LESSONS.length} short lessons, from counting to continuous probability, on the probability and expected value that trading and quant interviews ask. Every question has a worked solution, and the numbers change each time you practise.`}
      >
        <TrainingCta href={`/quant/${FIRST_LESSON.id}`} sourcePage={pagePath} label="Start the first lesson" />
        <a
          href="#sample"
          className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-[15px] font-semibold transition-colors hover:bg-secondary/50"
        >
          Try a question
        </a>
      </MarketingHero>

      {/* A real question from the course, answerable on the page. */}
      <section id="sample" className="mb-20 scroll-mt-24">
        <div className="mx-auto max-w-2xl">
          <SectionHeading eyebrow="Try one" title="A classic from trading interviews">
            Work it out, type your answer, then open the solution to see it done step by step.
          </SectionHeading>
          <QuantSampleQuestion puzzleId={SAMPLE_PUZZLE} />
        </div>
      </section>

      <section className="mb-20">
        <SectionHeading eyebrow="The course" title={`${QUANT_LESSONS.length} lessons in ${QUANT_TOPICS.length} units`}>
          Each unit builds on the one before, and each lesson teaches one method. The first two units are free.
        </SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUANT_TOPICS.map((topic) => {
            const lessons = QUANT_LESSONS.filter((lesson) => lesson.topic === topic.id);
            return (
              <article key={topic.id} className="rounded-[22px] bg-secondary p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[17px] font-semibold tracking-[-0.01em]">
                    <span className="tabular-nums text-muted-foreground">{topic.number}</span> {topic.title}
                  </h3>
                  <span className="shrink-0 text-[13px] font-medium text-muted-foreground">{topic.stage === "Foundations" ? "Free" : topic.stage}</span>
                </div>
                <p className="mt-1 text-[15px] leading-6 text-muted-foreground">{topic.blurb}</p>
                <ul className="mt-3 divide-y divide-border border-t border-border">
                  {lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link href={`/quant/${lesson.id}`} className="group flex items-center justify-between gap-3 py-2 text-[15px]">
                        <span className="min-w-0">
                          <span className="font-medium group-hover:underline">{lesson.title}</span>
                          <span className="text-muted-foreground"> · {lesson.benefit}</span>
                        </span>
                        <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mb-20">
        <SectionHeading eyebrow="How it works" title="Read it, practise it, drill it" />
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: <BookOpen aria-hidden="true" className="size-5" />,
              title: "Learn",
              body: "A concrete problem first, then the method, stated in plain words and in formal notation, with a worked example and the usual mistake to watch for.",
            },
            {
              icon: <Play aria-hidden="true" className="size-5" />,
              title: "Practise",
              body: "7 questions, the first 2 guided. The rule stays beside the question, and every answer opens a step-by-step solution.",
            },
            {
              icon: <ListChecks aria-hidden="true" className="size-5" />,
              title: "Drill",
              body: "Each kind of question in the lesson on its own, with new numbers every time, until it’s automatic.",
            },
          ].map((step, i) => (
            <li key={step.title} className="rounded-[22px] border border-border p-5">
              <span className="flex items-center gap-2 text-muted-foreground">
                {step.icon}
                <span className="text-[13px] font-medium tabular-nums">Step {i + 1}</span>
              </span>
              <h3 className="mt-3 text-[17px] font-semibold">{step.title}</h3>
              <p className="mt-1 text-[15px] leading-6 text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-20 grid gap-10 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Before the interview" title="Practise under the same pressure" />
          <ul className="space-y-4">
            <li className="flex gap-3">
              <Timer aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <p className="text-[15px] leading-6">
                <span className="font-semibold">Mock tests.</span>{" "}
                <span className="text-muted-foreground">
                  {MOCK_QUESTIONS} questions from across the course, none of them from practice, in {MOCK_MINUTES} minutes, marked at the end and scored out of 100, with a breakdown by topic.
                </span>
              </p>
            </li>
            <li className="flex gap-3">
              <RotateCcw aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <p className="text-[15px] leading-6">
                <span className="font-semibold">Review.</span>{" "}
                <span className="text-muted-foreground">Every kind of question you miss comes back with new numbers, until you’ve got it right on two separate days.</span>
              </p>
            </li>
            <li className="flex gap-3">
              <Puzzle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <p className="text-[15px] leading-6">
                <span className="font-semibold">{QUANT_PUZZLES.length} classic puzzles.</span>{" "}
                <span className="text-muted-foreground">The one-off questions interviewers like, each filed under the lesson whose method solves it.</span>
              </p>
            </li>
          </ul>
        </div>
        <div>
          <SectionHeading eyebrow="Puzzles" title="Questions you’ll recognise" />
          <ul className="divide-y divide-border border-y border-border">
            {CLASSICS.map((puzzle) => (
              <li key={puzzle.id}>
                <Link href={`/quant/${puzzle.lesson}?puzzle=${puzzle.id}`} className="group flex items-center justify-between gap-3 py-2.5 text-[15px]">
                  <span className="font-medium group-hover:underline">{puzzle.title}</span>
                  <span className="shrink-0 text-[13px] text-muted-foreground">{QUANT_LESSONS.find((l) => l.id === puzzle.lesson)!.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/quant/puzzles" className="mt-3 inline-flex items-center gap-1 text-[15px] font-medium underline-offset-4 hover:underline">
            All {QUANT_PUZZLES.length} puzzles
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
      </section>

      <section className="mx-auto mb-20 max-w-2xl">
        <SectionHeading title="Questions" />
        <dl>
          {faqs.map((faq, i) => (
            <div key={faq.q} className={i === faqs.length - 1 ? "border-y border-border py-5" : "border-t border-border py-5"}>
              <dt className="font-semibold">{faq.q}</dt>
              <dd className="mt-2 text-[15px] leading-6 text-muted-foreground">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-2xl rounded-[26px] bg-secondary px-6 py-10 text-center">
        <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.03em]">Start with counting</h2>
        <p className="mx-auto mt-3 max-w-md text-[17px] leading-7 text-muted-foreground">
          {FIRST_LESSON.title} is the first lesson, and the base for everything after it. No account needed to begin.
        </p>
        <ul className="mx-auto mt-5 flex max-w-md flex-wrap justify-center gap-x-5 gap-y-2 text-[15px]">
          {["Free to start", "Worked solutions", "New numbers every time"].map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <Check aria-hidden="true" className="size-4 text-success" strokeWidth={2.5} />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <TrainingCta href={`/quant/${FIRST_LESSON.id}`} sourcePage={pagePath} label={`Start ${FIRST_LESSON.title}`} />
          <TrainingCta href="/quant" sourcePage={pagePath} label="See every lesson" variant="secondary" />
        </div>
      </section>
    </div>
  );
}
