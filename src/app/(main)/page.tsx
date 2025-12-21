import type { Metadata } from "next";
import TrainingPage from "@/components/training/training-page";

export const metadata: Metadata = {
  title: "thetamac — Mental Math Training",
  description:
    "Sharpen your mental math skills with timed training, multiplayer duels, and racing modes. Track progress and compete on global leaderboards.",
  openGraph: {
    title: "thetamac — Mental Math Training",
    description:
      "Sharpen your mental math skills with timed training, multiplayer duels, and racing modes.",
  },
};

export default function HomePage() {
  return <TrainingPage />;
}
