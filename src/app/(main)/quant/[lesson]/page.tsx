import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getQuantLesson, type QuantLessonId } from "@/lib/quant/lessons";
import { QuantWorkspace } from "@/components/quant/quant-workspace";

type Params = Promise<{ lesson: string }>;

// Rendered per request: the workspace reads ?step= and ?puzzle=, and a static build would leave
// it to the browser, so search engines got an empty page instead of the lesson.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lesson = getQuantLesson((await params).lesson);
  if (!lesson) return {};
  return {
    title: `${lesson.title}: Quant Interview Practice`,
    description: lesson.summary,
    alternates: { canonical: `/quant/${lesson.id}` },
  };
}

export default async function QuantLessonPage({ params }: { params: Params }) {
  const lesson = getQuantLesson((await params).lesson);
  if (!lesson) notFound();
  return (
    <Suspense>
      {/* Keyed by lesson, so moving to the next lesson starts it fresh. */}
      <QuantWorkspace key={lesson.id} lessonId={lesson.id as QuantLessonId} />
    </Suspense>
  );
}
