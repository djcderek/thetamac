import type { ReactNode } from "react";

import type { AsciiShapeName } from "@/components/ui/ascii-shapes";

// Shared hero for (marketing) landing pages, after Kurb's landing: a centered, type-led
// headline with a short lede and the calls to action beneath it. No decorative figure.
export function MarketingHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  /** Kept for existing callers; the hero no longer draws a figure. */
  shapes?: AsciiShapeName[];
  children?: ReactNode;
}) {
  return (
    <header className="mx-auto mb-16 max-w-3xl pt-6 text-center sm:pt-12">
      {eyebrow && <p className="mb-3 text-[15px] font-medium text-muted-foreground">{eyebrow}</p>}
      <h1 className="text-[40px] font-semibold leading-[1.04] tracking-[-0.045em] text-balance sm:text-[56px]">
        {title}
      </h1>
      {lede && (
        <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-8 text-muted-foreground sm:text-lg">{lede}</p>
      )}
      {children && <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>}
    </header>
  );
}
