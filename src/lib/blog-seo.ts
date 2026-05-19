export interface BlogFaqItem {
  question: string;
  answer: string;
}

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.thetamac.com";

export function formatBlogDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateString}T00:00:00.000Z`));
}

export function createBlogJsonLd({
  title,
  description,
  slug,
  datePublished,
  dateModified,
  faq,
}: {
  title: string;
  description: string;
  slug: string;
  datePublished: string;
  dateModified: string;
  faq: BlogFaqItem[];
}) {
  const url = `${siteUrl}/blog/${slug}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      datePublished,
      dateModified,
      author: {
        "@type": "Organization",
        name: "thetamac",
      },
      publisher: {
        "@type": "Organization",
        name: "thetamac",
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/icon.svg`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": url,
      },
      url,
      inLanguage: "en-US",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: `${siteUrl}/blog`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: title,
          item: url,
        },
      ],
    },
  ];
}
