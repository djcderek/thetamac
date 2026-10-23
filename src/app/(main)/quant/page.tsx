import type { Metadata } from "next";
import { Suspense } from "react";
import { QuantClient } from "@/components/quant/quant-client";

export const metadata: Metadata = {
  title: "Probability and Expected Value Practice",
  description:
    "Practice the probability, expected value and betting maths that quant and trading interviews ask: dice, cards, Bayes, pot odds, house edge and Kelly bet sizing, with worked solutions.",
  alternates: { canonical: "/quant" },
  openGraph: {
    title: "Probability and Expected Value Practice | thetamac",
    description:
      "Quant interview maths, one idea at a time: dice and card probability, expected value, pot odds, house edge and the Kelly rule.",
  },
};

export default function QuantPage() {
  return (
    // The lesson can come from the URL (?lesson=), which needs a Suspense boundary.
    <Suspense>
      <QuantClient />
    </Suspense>
  );
}
