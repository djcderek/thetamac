import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/dashboard/",
          "/settings",
          "/settings/",
          "/shop",
          "/shop/",
          "/stats",
          "/stats/",
        ],
      },
      {
        userAgent: ["PerplexityBot", "Perplexity-User"],
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/dashboard/",
          "/settings",
          "/settings/",
          "/shop",
          "/shop/",
          "/stats",
          "/stats/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
