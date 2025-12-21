import type { MDXComponents } from "mdx/types";
import Link from "next/link";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Wrapper for all MDX content
    wrapper: ({ children }) => (
      <article className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        {children}
      </article>
    ),
    // Headings
    h1: ({ children }) => (
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4 mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-12 mb-4 pb-2 border-b border-border">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-3">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg font-semibold text-foreground mt-6 mb-2">
        {children}
      </h4>
    ),
    // Paragraphs
    p: ({ children }) => (
      <p className="text-base leading-7 text-muted-foreground mb-4 [&:not(:first-child)]:mt-4">
        {children}
      </p>
    ),
    // Links
    a: ({ href, children }) => {
      const isExternal = href?.startsWith("http");
      if (isExternal) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium underline underline-offset-4 hover:text-primary/80 transition-colors"
          >
            {children}
          </a>
        );
      }
      return (
        <Link
          href={href || "#"}
          className="text-primary font-medium underline underline-offset-4 hover:text-primary/80 transition-colors"
        >
          {children}
        </Link>
      );
    },
    // Lists
    ul: ({ children }) => (
      <ul className="my-4 ml-6 list-disc space-y-2 text-muted-foreground [&>li]:pl-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-4 ml-6 list-decimal space-y-2 text-muted-foreground [&>li]:pl-1">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-7">{children}</li>
    ),
    // Strong/Bold
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    // Emphasis/Italic
    em: ({ children }) => (
      <em className="italic">{children}</em>
    ),
    // Code blocks
    pre: ({ children }) => (
      <pre className="my-6 overflow-x-auto rounded-lg bg-muted/50 border border-border p-4">
        {children}
      </pre>
    ),
    code: ({ children }) => (
      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm text-foreground">
        {children}
      </code>
    ),
    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-4 border-primary/50 pl-4 italic text-muted-foreground">
        {children}
      </blockquote>
    ),
    // Horizontal rules
    hr: () => (
      <hr className="my-8 border-border" />
    ),
    // Tables
    table: ({ children }) => (
      <div className="my-6 w-full overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted/50">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-border">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-border last:border-0">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-3 text-left font-semibold text-foreground">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-muted-foreground">{children}</td>
    ),
    // Images
    img: (props) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        {...props}
        alt={props.alt || ""}
        className="my-6 rounded-lg border border-border"
      />
    ),
    ...components,
  };
}
