import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background/65">
      {/* Header */}
      <header className="sticky top-0 z-40 px-3 pt-3">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 rounded-full border border-border bg-card/90 px-3 backdrop-blur-xl sm:px-5">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
            <LogoMark size={26} />
            <span className="tracking-[-0.03em]">thetamac</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-3 text-sm sm:gap-4">
            <Link
              href="/about"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
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
              className="hidden rounded-full bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-brand hover:text-brand-foreground sm:inline-flex"
            >
              Start Training
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/70 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} thetamac</p>
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            <Link href="/" className="hover:text-foreground transition-colors">
              Training
            </Link>
            <Link href="/about" className="hover:text-foreground transition-colors">
              About
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
