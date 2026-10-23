"use client";

import { Fragment, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { plainToTex } from "@/lib/quant/tex";

/**
 * Typesetting for quant copy, with KaTeX. Copy is plain text with two kinds of markup:
 * - `backticks` hold LaTeX, for formal statements ("For events `A` and `B` with `P(B) > 0`").
 * - {{double braces}} hold a calculation in plain notation ("6/10 × 5/9 = 1/3"), set on its
 *   own line like a displayed equation.
 * Short calculations left in a sentence ("6 × 5 = 30") are typeset inline and kept on one line.
 */

/** LaTeX rendered by KaTeX. Bad input shows as source rather than breaking the page. */
export function Tex({ tex, display = false, wrap = false, className }: { tex: string; display?: boolean; wrap?: boolean; className?: string }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore", output: "htmlAndMathml" }),
    [tex, display],
  );
  const ref = useRef<HTMLSpanElement>(null);

  // A displayed formula wider than its column (a phone) shrinks to fit, down to 60%.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!display || !el) return;
    const fit = () => {
      el.style.fontSize = "";
      const over = el.scrollWidth / el.clientWidth;
      if (over > 1.01) el.style.fontSize = `${Math.max(0.6, 1 / over) * 100}%`;
    };
    fit();
    // Measure again once KaTeX's fonts arrive, and whenever the column or formula resizes.
    document.fonts?.ready.then(fit).catch(() => {});
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [display, html]);

  return (
    <span
      ref={ref}
      className={cn("quant-tex", display ? "quant-tex-display block" : !wrap && "whitespace-nowrap", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * A calculation in plain notation, typeset:
 * - "display": its own centred line, as an equation in a textbook;
 * - "line": a line of working that already sits on its own line, at full size;
 * - "inline": inside a sentence, with fractions kept on the line as a/b.
 */
export function MathExpr({ expr, variant = "line", className }: { expr: string; variant?: "display" | "line" | "inline"; className?: string }) {
  if (variant === "inline") return <Tex tex={plainToTex(expr, { stack: false })} className={className} />;
  const tex = plainToTex(expr);
  // A line of working may break at an operator on a phone; KaTeX allows breaks there.
  return <Tex tex={variant === "line" ? `\\displaystyle ${tex}` : tex} display={variant === "display"} wrap className={className} />;
}

// Short math inside a sentence: operands joined by operators, like "18 + 12 = 30" or "1 − (5/6)⁴".
const OPERAND = "√?\\(?[−$]?[0-9A-Za-z.,!/′⁰¹²³⁴⁵⁶⁷⁸⁹ⁿᵏᴺᵃ⁻]+\\)?[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿᵏᴺ]*%?";
const INLINE = new RegExp(`(?:${OPERAND} [×÷=+−≈<>≤≥] )+${OPERAND}`, "g");

/** Plain words with inline calculations typeset. */
function prose(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const start = match.index!;
    const run = match[0].replace(/[.,]$/, "");
    // Only runs with a number in them are calculations; "A + B" in a sentence stays prose.
    if (!/[0-9]/.test(run)) continue;
    if (start > last) nodes.push(text.slice(last, start));
    nodes.push(<MathExpr key={`${key}-${start}`} expr={run} variant="inline" />);
    last = start + run.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Copy with `inline LaTeX`, {{displayed calculations}} and inline calculations typeset. */
export function MathText({ text }: { text: string }) {
  // Displayed calculations first, then inline LaTeX within the prose between them.
  const blocks = text.split(/\{\{(.+?)\}\}/);
  return (
    <>
      {blocks.map((block, i) => {
        if (i % 2 === 1) return <MathExpr key={i} expr={block.trim()} variant="display" />;
        const body = i > 0 ? block.replace(/^\s+/, "") : block;
        return (
          <Fragment key={i}>
            {body.split(/`([^`]+)`/).map((piece, j) =>
              j % 2 === 1 ? <Tex key={j} tex={piece} /> : <Fragment key={j}>{prose(piece, `${i}-${j}`)}</Fragment>,
            )}
          </Fragment>
        );
      })}
    </>
  );
}
