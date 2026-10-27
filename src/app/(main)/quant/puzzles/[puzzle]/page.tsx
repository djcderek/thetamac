import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QUANT_PUZZLES } from "@/lib/quant/lessons";
import { QuantPuzzlePage } from "@/components/quant/quant-puzzle-page";

type Params = Promise<{ puzzle: string }>;

const findPuzzle = (id: string) => QUANT_PUZZLES.find((puzzle) => puzzle.id === id);

export function generateStaticParams() {
  return QUANT_PUZZLES.map((puzzle) => ({ puzzle: puzzle.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const puzzle = findPuzzle((await params).puzzle);
  if (!puzzle) return {};
  const description = `${puzzle.problem.prompt} With a step-by-step solution.`;
  return {
    title: `${puzzle.title}: Quant Interview Puzzle`,
    description,
    alternates: { canonical: `/quant/puzzles/${puzzle.id}` },
    openGraph: { title: `${puzzle.title}: Quant Interview Puzzle | thetamac`, description },
  };
}

export default async function QuantPuzzleRoute({ params }: { params: Params }) {
  const puzzle = findPuzzle((await params).puzzle);
  if (!puzzle) notFound();
  return <QuantPuzzlePage puzzleId={puzzle.id} />;
}
