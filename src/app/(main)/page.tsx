import type { Metadata } from "next";
import { Suspense } from "react";
import TrainingPage from "@/components/training/training-page";

export const metadata: Metadata = {
  title: "Mental Math Training Online",
  description:
    "Sharpen your mental math skills with timed training, multiplayer duels, and racing modes. Track progress and compete on global leaderboards.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Mental Math Training Online | thetamac",
    description:
      "Sharpen your mental math skills with timed training, multiplayer duels, and racing modes.",
  },
};

export default function HomePage() {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";

  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "thetamac",
    url: siteUrl,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description:
      "Train your mental math skills with timed challenges, learning mode explanations, multiplayer duels, and racing modes.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <Suspense fallback={null}>
        <TrainingPage />
      </Suspense>
    </>
  );
}
