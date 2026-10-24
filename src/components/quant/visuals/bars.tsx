import type { QuantVisual } from "@/lib/quant/visual";
import { TONE_FILL } from "@/components/quant/visuals/tones";

type Bars = Extract<QuantVisual, { type: "bars" }>;

const FADE = { transition: "fill 250ms ease, opacity 250ms ease" };

/** A bar with rounded top corners only, so it sits flat on the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M ${x} ${y + h} V ${y + r} Q ${x} ${y} ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h} Z`;
}

/** A bar chart: heights in proportion to value, the label under each bar and its text above. */
export function BarsFigure({ visual }: { visual: Bars }) {
  const bars = visual.bars;
  const n = bars.length;
  const width = 360;
  const sideX = 10;
  const top = 22;
  const plotH = 140;
  const bottom = 24;
  const height = top + plotH + bottom;
  const slot = (width - sideX * 2) / n;
  const barW = slot * (n > 12 ? 0.74 : n > 6 ? 0.66 : 0.56);
  const max = Math.max(...bars.map((b) => Math.abs(b.value)), 1e-9);
  // Many bars: label every k-th one, and only show texts that have room or matter.
  const labelEvery = Math.ceil(n / 12);
  const labelFont = n > 16 ? 10 : n > 10 ? 11 : 12;
  const textFont = slot < 22 ? 9 : slot < 34 ? 10 : 12;
  const roomyText = slot >= 18;

  return (
    <figure className="mx-auto w-full max-w-[520px]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Bar chart: ${bars.map((b) => `${b.label} ${b.text ?? b.value}`).join(", ")}`}
        className="block"
        style={{ width: "100%", height: "auto", maxHeight: 280, fontFamily: "inherit" }}
      >
        {bars.map((bar, i) => {
          const h = bar.value > 0 ? Math.max(2, (bar.value / max) * plotH) : 0;
          const x = sideX + i * slot + (slot - barW) / 2;
          const y = top + plotH - h;
          const showText = bar.text && (roomyText || bar.tone !== "muted");
          // Every k-th label, ending on the last bar (dropping a k-th label that would crowd it).
          const lastStep = Math.floor((n - 1) / labelEvery) * labelEvery;
          const showLabel = i === n - 1 || (i % labelEvery === 0 && i < lastStep) || (i === lastStep && lastStep === n - 1);
          return (
            <g key={`${i}-${bar.label}`}>
              {h > 0 && <path d={barPath(x, y, barW, h)} fill={TONE_FILL[bar.tone]} style={FADE} />}
              {showText && (
                <text
                  x={x + barW / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize={textFont}
                  fontWeight={bar.tone === "muted" ? 400 : 600}
                  fill={bar.tone === "muted" ? "var(--muted-foreground)" : "var(--foreground)"}
                  className="tabular-nums"
                  style={FADE}
                >
                  {bar.text}
                </text>
              )}
              {showLabel && (
                <text
                  x={x + barW / 2}
                  y={top + plotH + 16}
                  textAnchor="middle"
                  fontSize={labelFont}
                  fill="var(--muted-foreground)"
                  className="tabular-nums"
                >
                  {bar.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={sideX} x2={width - sideX} y1={top + plotH} y2={top + plotH} stroke="var(--border)" strokeWidth={1.5} />
      </svg>
      {visual.caption && <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">{visual.caption}</figcaption>}
    </figure>
  );
}
