import Link from "next/link";

function ThetamacMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="50" r="40" />
        <path d="M 12 55 Q 50 25 88 55" />
      </g>
    </svg>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
            <ThetamacMark className="w-5 h-5" />
            <span>thetamac</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-3 text-sm sm:gap-4">
            <Link
              href="/blog"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/interview-math"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Interview Prep
            </Link>
            <Link
              href="/"
              className="hidden rounded-md bg-primary px-3 py-1.5 text-primary-foreground transition-colors hover:bg-primary/90 sm:inline-flex"
            >
              Start Training
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} thetamac</p>
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            <Link href="/" className="hover:text-foreground transition-colors">
              Training
            </Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link href="/interview-math" className="hover:text-foreground transition-colors">
              Interview Prep
            </Link>
            <Link href="/leaderboard" className="hover:text-foreground transition-colors">
              Leaderboard
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
