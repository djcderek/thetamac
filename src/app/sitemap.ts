import type { MetadataRoute } from "next";
import { blogPosts } from "@/content/blog/posts";
import { INTERVIEW_MATH_GUIDES } from "@/content/interview-math/guides";
import { QUANT_LESSON_IDS } from "@/lib/quant/ids";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";
const siteLastUpdated = new Date("2026-03-04");

const staticRouteUpdatedAt: Record<string, string> = {
  "/": "2026-07-10",
  "/about": "2026-05-19",
  "/leaderboard": "2026-03-04",
  "/quant": "2026-10-23",
  "/multiplayer": "2026-03-04",
  "/training/focused": "2026-03-04",
  "/upgrade": "2026-03-04",
  "/blog": "2026-03-04",
  "/arithmetic-speed-test": "2026-07-10",
  "/mental-math-practice": "2026-07-10",
  "/case-interview-math-practice": "2026-05-18",
  "/zetamac-alternative": "2026-07-10",
  "/practice/addition": "2026-05-18",
  "/practice/subtraction": "2026-05-18",
  "/practice/multiplication": "2026-05-18",
  "/practice/division": "2026-05-18",
  "/interview-math": "2026-03-04",
  "/interview-math/insights": "2026-03-04",
  "/terms": "2025-01-15",
  "/privacy": "2025-01-15",
};

function getRouteLastModified(path: string): Date {
  const value = staticRouteUpdatedAt[path];
  return value ? new Date(value) : siteLastUpdated;
}

export default function sitemap(): MetadataRoute.Sitemap {
  // Public pages that should be indexed
  const publicRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: getRouteLastModified("/"),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: getRouteLastModified("/about"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/leaderboard`,
      lastModified: getRouteLastModified("/leaderboard"),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/quant`,
      lastModified: getRouteLastModified("/quant"),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/multiplayer`,
      lastModified: getRouteLastModified("/multiplayer"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // /training redirects to / so omitted from sitemap
    {
      url: `${siteUrl}/training/focused`,
      lastModified: getRouteLastModified("/training/focused"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/arithmetic-speed-test`,
      lastModified: getRouteLastModified("/arithmetic-speed-test"),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/mental-math-practice`,
      lastModified: getRouteLastModified("/mental-math-practice"),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/case-interview-math-practice`,
      lastModified: getRouteLastModified("/case-interview-math-practice"),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/zetamac-alternative`,
      lastModified: getRouteLastModified("/zetamac-alternative"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...["addition", "subtraction", "multiplication", "division"].map((operation) => ({
      url: `${siteUrl}/practice/${operation}`,
      lastModified: getRouteLastModified(`/practice/${operation}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    {
      url: `${siteUrl}/upgrade`,
      lastModified: getRouteLastModified("/upgrade"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: getRouteLastModified("/blog"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/interview-math`,
      lastModified: getRouteLastModified("/interview-math"),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/interview-math/insights`,
      lastModified: getRouteLastModified("/interview-math/insights"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: getRouteLastModified("/terms"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: getRouteLastModified("/privacy"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Blog posts
  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.lastReviewed ?? post.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const interviewRoutes: MetadataRoute.Sitemap = INTERVIEW_MATH_GUIDES.map((guide) => ({
    url: `${siteUrl}/interview-math/${guide.slug}`,
    lastModified: new Date(guide.lastReviewed ?? "2026-03-04"),
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  const quantRoutes: MetadataRoute.Sitemap = QUANT_LESSON_IDS.map((lesson) => ({
    url: `${siteUrl}/quant/${lesson}`,
    lastModified: getRouteLastModified("/quant"),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...publicRoutes, ...blogRoutes, ...interviewRoutes, ...quantRoutes];
}
