import type { Metadata } from "next";
import { Suspense } from "react";
import TrainingPage from "@/components/training/training-page";
import { TrainingSeoSection } from "@/components/marketing/training-seo-section";
import { TRAINING_SEO_FAQ } from "@/content/training-faq";

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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: TRAINING_SEO_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

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
        // Keep JSON-LD in sync with visible on-page content.
        dangerouslySetInnerHTML={{ __html: JSON.stringify([faqJsonLd, webAppJsonLd]) }}
      />
      <Suspense fallback={null}>
        <TrainingPage />
      </Suspense>
      <TrainingSeoSection />
    </>
  );
}
