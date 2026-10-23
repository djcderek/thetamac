import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QUANT_LESSON_IDS, getQuantLesson, type QuantLessonId } from "@/lib/quant/lessons";
import { QuantWorkspace } from "@/components/quant/quant-workspace";

type Params = Promise<{ lesson: string }>;

export function generateStaticParams() {
  return QUANT_LESSON_IDS.map((lesson) => ({ lesson }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lesson = getQuantLesson((await params).lesson);
  if (!lesson) return {};
  return {
    title: `${lesson.title}: Quant Interview Practice`,
    description: `${lesson.benefit}. ${lesson.idea}`,
    alternates: { canonical: `/quant/${lesson.id}` },
  };
}

export default async function QuantLessonPage({ params }: { params: Params }) {
  const lesson = getQuantLesson((await params).lesson);
  if (!lesson) notFound();
  // Keyed by lesson, so moving to the next lesson starts it fresh.
  return <QuantWorkspace key={lesson.id} lessonId={lesson.id as QuantLessonId} />;
}
