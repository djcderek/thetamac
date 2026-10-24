import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getQuantLesson } from "@/lib/quant/lessons";
import { QuantList } from "@/components/quant/quant-list";

export const metadata: Metadata = {
  title: "Probability and Expected Value Practice",
  description:
    "A step-by-step course in the probability and expected value that quant and trading interviews ask: counting, conditional probability, expected value, distributions, betting, random walks and more, with worked walkthroughs.",
  alternates: { canonical: "/quant" },
  openGraph: {
    title: "Probability and Expected Value Practice | thetamac",
    description: "28 lessons from counting to continuous probability, each with practice and step-by-step walkthroughs.",
  },
};

export default async function QuantPage({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  // Older links opened a lesson with ?lesson=; lessons now have their own pages.
  const lesson = getQuantLesson((await searchParams).lesson ?? "");
  if (lesson) redirect(`/quant/${lesson.id}`);
  return <QuantList />;
}
