import type { QuantVisual } from "@/lib/quant/visual";
import { TONE_FILL } from "@/components/quant/visuals/tones";

type NumberLine = Extract<QuantVisual, { type: "number-line" }>;

const FADE = { transition: "fill 250ms ease, opacity 250ms ease" };

/** Evenly spaced "nice" ticks (steps of 1, 2 or 5 × 10ⁿ), always including both ends. */
function autoTicks(min: number, max: number) {
  const span = max - min;
  if (span <= 0) return [min];
  const raw = span / 5;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => span / s <= 6) ?? 10 * power;
  const inner: number[] = [];
  for (let t = Math.ceil(min / step) * step; t < max - 1e-9; t += step) {
    // Skip a step tick that would crowd an end label.
    if (t - min >= step * 0.4 && max - t >= step * 0.4) inner.push(Number(t.toFixed(10)));
  }
  return [min, ...inner, max];
}

const tickText = (n: number) => String(Number(n.toFixed(4)));

/** A number line: shaded ranges as thick bands on the track, labelled points as dots. */
export function NumberLineFigure({ visual }: { visual: NumberLine }) {
  const width = 360;
  const side = 22;
  const bandTextY = 20;
  const pointTextY = 40;
  const trackY = 52;
  const trackH = 14;
  const tickLabelY = trackY + trackH + 20;
  const height = tickLabelY + 8;
  const span = visual.max - visual.min || 1;
  const toX = (v: number) => side + ((v - visual.min) / span) * (width - side * 2);
  const ticks = visual.ticks ?? autoTicks(visual.min, visual.max);
  const points = visual.points ?? [];

  return (
    <figure className="mx-auto w-full max-w-[520px]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Number line from ${visual.min} to ${visual.max}${visual.shade
          .map((b) => `, ${b.from} to ${b.to} shaded${b.text ? ` (${b.text})` : ""}`)
          .join("")}${points.map((p) => `, ${p.label} at ${p.at}`).join("")}`}
        className="block"
        style={{ width: "100%", height: "auto", maxHeight: 200, fontFamily: "inherit" }}
      >
        <rect x={side} y={trackY} width={width - side * 2} height={trackH} rx={trackH / 2} fill={TONE_FILL.muted} />
        {visual.shade.map((band, i) => {
          const x0 = toX(Math.min(band.from, band.to));
          const x1 = toX(Math.max(band.from, band.to));
          return (
            <g key={`band-${i}`}>
              <rect
                x={x0}
                y={trackY}
                width={Math.max(2, x1 - x0)}
                height={trackH}
                rx={Math.min(trackH / 2, (x1 - x0) / 2)}
                fill={TONE_FILL[band.tone]}
                style={FADE}
              />
              {band.text && (
                <text
                  x={(x0 + x1) / 2}
                  y={bandTextY}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--foreground)"
                  className="tabular-nums"
                >
                  {band.text}
                </text>
              )}
            </g>
          );
        })}
        {ticks.map((tick) => (
          <g key={`tick-${tick}`}>
            <line
              x1={toX(tick)}
              x2={toX(tick)}
              y1={trackY + trackH + 3}
              y2={trackY + trackH + 8}
              stroke="var(--muted-foreground)"
              strokeOpacity={0.6}
            />
            <text x={toX(tick)} y={tickLabelY} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)" className="tabular-nums">
              {tickText(tick)}
            </text>
          </g>
        ))}
        {points.map((point, i) => (
          <g key={`point-${i}`}>
            <line
              x1={toX(point.at)}
              x2={toX(point.at)}
              y1={pointTextY + 4}
              y2={trackY + trackH / 2}
              stroke={TONE_FILL[point.tone]}
              strokeWidth={1.5}
              style={FADE}
            />
            <circle
              cx={toX(point.at)}
              cy={trackY + trackH / 2}
              r={6}
              fill={TONE_FILL[point.tone]}
              stroke="var(--background)"
              strokeWidth={2}
              style={FADE}
            />
            <text x={toX(point.at)} y={pointTextY} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--foreground)">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      {visual.caption && <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">{visual.caption}</figcaption>}
    </figure>
  );
}
