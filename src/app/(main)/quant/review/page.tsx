import type { Metadata } from "next";
import { QuantReview } from "@/components/quant/quant-review";

export const metadata: Metadata = {
  title: "Quant Review",
  description: "The quant question types you’ve missed, back with new numbers until they stick.",
  robots: { index: false },
};

export default function QuantReviewPage() {
  return <QuantReview />;
}
