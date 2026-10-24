import type { Metadata } from "next";
import { QuantPuzzles } from "@/components/quant/quant-puzzles";

export const metadata: Metadata = {
  title: "Quant Interview Puzzles",
  description:
    "Classic probability puzzles from quant and trading interviews, from Monty Hall to the broken stick, each with a step-by-step solution.",
  alternates: { canonical: "/quant/puzzles" },
};

export default function QuantPuzzlesPage() {
  return <QuantPuzzles />;
}
