import type { ReactNode } from "react";

import { AsciiMorph } from "@/components/ui/ascii-morph";
import type { AsciiShapeName } from "@/components/ui/ascii-shapes";
import { CornerBrackets } from "@/components/ui/corner-frame";
import { SectionLabel } from "@/components/ui/visual-system";

// Shared hero for (marketing) landing pages: serif display headline on the
// left, the animated digit-field figure on the right. One per page.
export function MarketingHero({
  eyebrow,
  title,
  lede,
  shapes = ["theta", "times", "bolt", "trophy"],
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  shapes?: AsciiShapeName[];
  children?: ReactNode;
}) {
  return (
    <header className="mb-12 grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(200px,250px)]">
      <div className="max-w-3xl">
        {eyebrow && <SectionLabel className="mb-3 text-brand">{eyebrow}</SectionLabel>}
        <h1 className="mb-4 font-serif text-4xl font-normal tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        {lede && <p className="text-lg leading-8 text-muted-foreground">{lede}</p>}
        {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
      </div>
      <div className="relative hidden self-center p-6 md:block">
        <CornerBrackets />
        <AsciiMorph shapes={shapes} accent className="w-full" />
      </div>
    </header>
  );
}
