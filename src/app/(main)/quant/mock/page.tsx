import type { Metadata } from "next";
import { QuantMock } from "@/components/quant/quant-mock";

export const metadata: Metadata = {
  title: "Quant Mock Test",
  description: "A timed 20-minute probability and expected value test, run like a first-round quant interview screen and scored out of 100.",
  alternates: { canonical: "/quant/mock" },
};

export default function QuantMockPage() {
  return <QuantMock />;
}
