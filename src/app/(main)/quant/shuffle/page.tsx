import type { Metadata } from "next";
import { QuantShuffle } from "@/components/quant/quant-shuffle";

export const metadata: Metadata = {
  title: "Quant Interview Practice: Shuffle",
  description: "Random probability and expected value questions from across the quant course, each with a step-by-step solution.",
  alternates: { canonical: "/quant/shuffle" },
};

export default function QuantShufflePage() {
  return <QuantShuffle />;
}
