import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8 max-w-md">
        <div className="relative mx-auto w-fit px-8 py-4">
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-muted-foreground/60">
            404
          </p>
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold text-3xl tracking-tight">Page not found</h2>
          <p className="text-muted-foreground">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been
            moved or doesn&apos;t exist.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="default" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <BackButton />
        </div>
      </div>
    </div>
  );
}
