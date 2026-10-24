import type { QuantVisual, Tone } from "@/lib/quant/visual";
import { TONE_FILL, TONE_INK } from "@/components/quant/visuals/tones";

type Normal = Extract<QuantVisual, { type: "normal" }>;

const FADE = { transition: "fill 250ms ease, opacity 250ms ease" };
const RANGE = 3.5;
/** Rounded to 0.01, so server and client render identical paths (Math.exp can differ in the last digit). */
const f = (n: number) => Math.round(n * 100) / 100;
const pdf = (z: number) => Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI);

/** A bell curve over −3.5 to 3.5 standard deviations, with shaded bands and labelled ticks. */
export function NormalFigure({ visual }: { visual: Normal }) {
  const width = 360;
  const side = 16;
  const top = 26;
  const curveH = 140;
  const height = top + curveH + 30;
  const baseY = top + curveH;
  const peak = pdf(0);
  const toX = (z: number) => f(side + ((z + RANGE) / (RANGE * 2)) * (width - side * 2));
  const toY = (z: number) => f(baseY - (pdf(z) / peak) * curveH);

  /** The area under the curve from a to b, as a closed path. */
  const area = (a: number, b: number) => {
    const from = Math.max(-RANGE, Math.min(a, b));
    const to = Math.min(RANGE, Math.max(a, b));
    const steps = Math.max(2, Math.ceil((to - from) * 30));
    const points = Array.from({ length: steps + 1 }, (_, i) => from + ((to - from) * i) / steps);
    return `M ${toX(from)} ${baseY} ${points.map((z) => `L ${toX(z)} ${toY(z)}`).join(" ")} L ${toX(to)} ${baseY} Z`;
  };
  const curve = Array.from({ length: 141 }, (_, i) => -RANGE + (i * RANGE * 2) / 140)
    .map((z, i) => `${i === 0 ? "M" : "L"} ${toX(z)} ${toY(z)}`)
    .join(" ");

  /** Band text sits inside a band with room, otherwise just above the curve. */
  const label = (band: { from: number; to: number; tone: Tone; text?: string }, i: number) => {
    if (!band.text) return null;
    const from = Math.max(-RANGE, Math.min(band.from, band.to));
    const to = Math.min(RANGE, Math.max(band.from, band.to));
    const mid = (from + to) / 2;
    const bandPx = toX(to) - toX(from);
    const curveTop = toY(mid);
    const inside = baseY - curveTop > 42 && bandPx > 36;
    return (
      <text
        key={`text-${i}`}
        x={toX(mid)}
        y={inside ? (curveTop + baseY) / 2 + 10 : curveTop - 7}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill={inside ? TONE_INK[band.tone] : "var(--foreground)"}
        className="tabular-nums"
        style={FADE}
      >
        {band.text}
      </text>
    );
  };

  return (
    <figure className="mx-auto w-full max-w-[520px]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Normal curve${visual.shade.length ? ` with shaded ${visual.shade
          .map((b) => `${b.from} to ${b.to} SD${b.text ? ` (${b.text})` : ""}`)
          .join(", ")}` : ""}`}
        className="block"
        style={{ width: "100%", height: "auto", maxHeight: 280, fontFamily: "inherit" }}
      >
        <path d={area(-RANGE, RANGE)} fill={TONE_FILL.muted} />
        {visual.shade.map((band, i) => (
          <path key={`band-${i}`} d={area(band.from, band.to)} fill={TONE_FILL[band.tone]} style={FADE} />
        ))}
        <path d={curve} fill="none" stroke="var(--muted-foreground)" strokeOpacity={0.6} strokeWidth={1.5} />
        <line x1={side} x2={width - side} y1={baseY} y2={baseY} stroke="var(--border)" strokeWidth={1.5} />
        {visual.ticks.map((tick) => (
          <g key={`tick-${tick.at}`}>
            <line x1={toX(tick.at)} x2={toX(tick.at)} y1={baseY} y2={baseY + 5} stroke="var(--muted-foreground)" strokeOpacity={0.6} />
            <text x={toX(tick.at)} y={baseY + 19} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)" className="tabular-nums">
              {tick.label}
            </text>
          </g>
        ))}
        {visual.shade.map(label)}
      </svg>
      {visual.caption && <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">{visual.caption}</figcaption>}
    </figure>
  );
}
