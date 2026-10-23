import type { QuantVisual } from "@/lib/quant/visual";
import { TONE_FILL, TONE_INK } from "@/components/quant/visuals/tones";

type Square = Extract<QuantVisual, { type: "square" }>;

const FADE = { transition: "fill 250ms ease, opacity 250ms ease" };

/** The centroid of a polygon (falls back to the average of its points if it has no area). */
function centroid(points: [number, number][]) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (Math.abs(area) < 1e-9) {
    return [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
  }
  return [cx / (3 * area), cy / (3 * area)];
}

/** Two random numbers as a point in a square; shaded regions are where the condition holds. */
export function SquareFigure({ visual }: { visual: Square }) {
  const size = 200;
  const left = 44;
  const top = 12;
  const bottom = 40;
  const right = 18;
  const width = left + size + right;
  const height = top + size + bottom;
  const toX = (x: number) => left + x * size;
  const toY = (y: number) => top + (1 - y) * size;

  return (
    <figure className="mx-auto w-full max-w-[340px]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`A square of ${visual.xLabel} against ${visual.yLabel}, from 0 to ${visual.max}${visual.regions
          .filter((r) => r.text)
          .map((r) => `, a region marked ${r.text}`)
          .join("")}`}
        className="block"
        style={{ width: "100%", height: "auto", maxHeight: 280, fontFamily: "inherit" }}
      >
        <rect x={left} y={top} width={size} height={size} fill={TONE_FILL.muted} />
        {visual.regions.map((region, i) => (
          <polygon
            key={`region-${i}`}
            points={region.points.map(([x, y]) => `${toX(x)},${toY(y)}`).join(" ")}
            fill={TONE_FILL[region.tone]}
            style={FADE}
          />
        ))}
        <rect x={left} y={top} width={size} height={size} fill="none" stroke="var(--border)" strokeWidth={1.5} />
        {visual.regions.map((region, i) => {
          if (!region.text) return null;
          const [cx, cy] = centroid(region.points);
          return (
            <text
              key={`text-${i}`}
              x={toX(cx)}
              y={toY(cy)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fontWeight={600}
              fill={TONE_INK[region.tone]}
              className="tabular-nums"
              style={FADE}
            >
              {region.text}
            </text>
          );
        })}
        {/* Axis ends: 0 at the corner, the maximum at the end of each axis. */}
        <text x={left - 6} y={top + size + 14} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
          0
        </text>
        <text x={toX(1)} y={top + size + 15} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)" className="tabular-nums">
          {visual.max}
        </text>
        <text x={left - 6} y={toY(1) + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)" className="tabular-nums">
          {visual.max}
        </text>
        <text x={left + size / 2} y={top + size + 32} textAnchor="middle" fontSize={12} fill="var(--foreground)">
          {visual.xLabel}
        </text>
        <text
          x={14}
          y={top + size / 2}
          textAnchor="middle"
          fontSize={12}
          fill="var(--foreground)"
          transform={`rotate(-90 14 ${top + size / 2})`}
        >
          {visual.yLabel}
        </text>
      </svg>
      {visual.caption && <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">{visual.caption}</figcaption>}
    </figure>
  );
}
