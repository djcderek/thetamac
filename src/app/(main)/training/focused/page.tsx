import type { Metadata } from "next";
import { FocusedTrainingClient } from "./focused-client";

export const metadata: Metadata = {
  title: "Focused Training",
  description:
    "Practice your weak points with targeted mental math training. Work through personalized problem sets based on your performance analytics.",
  openGraph: {
    title: "Focused Training | thetamac",
    description: "Practice your weak points with targeted mental math training.",
  },
};

export default function FocusedTrainingPage() {
  return <FocusedTrainingClient />;
}
