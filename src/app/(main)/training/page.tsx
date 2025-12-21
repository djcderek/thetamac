import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Training",
  description:
    "Practice mental math with customizable training sessions. Choose difficulty, operations, and timer settings to improve your speed and accuracy.",
  openGraph: {
    title: "Training | thetamac",
    description:
      "Practice mental math with customizable training sessions. Improve your speed and accuracy.",
  },
};

export default function TrainingRedirectPage() {
  redirect("/");
}


