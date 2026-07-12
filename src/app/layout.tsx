import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "@fontsource-variable/stix-two-text";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/auth/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";

const themeScript = `
  (function () {
    try {
      var preference = localStorage.getItem("thetamac-theme");
      if (preference !== "light" && preference !== "dark" && preference !== "system") {
        preference = "system";
      }
      var resolved = preference === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : preference;
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(resolved);
      document.documentElement.dataset.themePreference = preference;
      var tone = localStorage.getItem("thetamac-theme-tone");
      if (tone !== "neutral") tone = "warm";
      document.documentElement.classList.toggle("neutral-tone", tone === "neutral");
      document.documentElement.dataset.colorTone = tone;
    } catch (_) {}
  })();
`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "thetamac — Mental Math Training",
    template: "%s | thetamac",
  },
  description:
    "Train your mental math skills with timed challenges, multiplayer duels, and racing modes. Track your progress and compete on global leaderboards.",
  keywords: [
    "mental math",
    "math training",
    "arithmetic practice",
    "math games",
    "brain training",
    "math speed",
    "multiplication practice",
    "division practice",
  ],
  authors: [{ name: "thetamac" }],
  creator: "thetamac",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "thetamac",
    title: "thetamac — Mental Math Training",
    description:
      "Train your mental math skills with timed challenges, multiplayer duels, and racing modes. Track your progress and compete on global leaderboards.",
  },
  twitter: {
    card: "summary_large_image",
    title: "thetamac — Mental Math Training",
    description:
      "Train your mental math skills with timed challenges, multiplayer duels, and racing modes.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// JSON-LD structured data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "thetamac",
      description:
        "Train your mental math skills with timed challenges, multiplayer duels, and racing modes.",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      inLanguage: "en-US",
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "thetamac",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon.svg`,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <SessionProvider>
          <ThemeProvider defaultTheme="system" storageKey="thetamac-theme">
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
