import type { Tone } from "@/lib/quant/visual";

/** Fill and text colours for each tone, as CSS colours that follow light and dark themes. */
export const TONE_FILL: Record<Tone, string> = {
  hit: "var(--viz-hit)",
  alt: "var(--viz-alt)",
  both: "var(--foreground)",
  known: "var(--viz-known)",
  win: "var(--success)",
  lose: "var(--destructive)",
  muted: "color-mix(in oklab, var(--foreground) 10%, transparent)",
};

/** Text drawn on top of a filled shape. */
export const TONE_INK: Record<Tone, string> = {
  hit: "#ffffff",
  alt: "#ffffff",
  both: "var(--background)",
  known: "var(--foreground)",
  win: "#ffffff",
  lose: "#ffffff",
  muted: "var(--muted-foreground)",
};

/** The tone of an item from a list of marks: the last mark that includes it wins. */
export function toneOf(marks: { tone: Tone }[], includes: (mark: { tone: Tone }) => boolean, fallback: Tone = "muted"): Tone {
  let tone = fallback;
  for (const mark of marks) if (includes(mark)) tone = mark.tone;
  return tone;
}
