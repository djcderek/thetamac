import type { QuantVisual, Tone } from "@/lib/quant/visual";
import { TONE_FILL } from "@/components/quant/visuals/tones";

type People = Extract<QuantVisual, { type: "people" }>;

const FADE = { transition: "fill 250ms ease, opacity 250ms ease" };

/** Icons are small, so "known" needs more ink than the shared wash to stand apart from unmarked. */
const fillOf = (tone: Tone) => (tone === "known" ? "color-mix(in oklab, var(--foreground) 34%, transparent)" : TONE_FILL[tone]);

/** One person: a round head over rounded shoulders, centred at (x, y) in a 16×18 box. */
function Person({ x, y, tone }: { x: number; y: number; tone: Tone }) {
  const fill = fillOf(tone);
  return (
    <g>
      <circle cx={x} cy={y - 4.5} r={3.6} fill={fill} style={FADE} />
      <path d={`M ${x - 6} ${y + 8} a 6 6.5 0 0 1 12 0 z`} fill={fill} style={FADE} />
    </g>
  );
}

/**
 * An icon array: one figure per person (or per `each` people), coloured by group in rows
 * of 10 or 20, with a legend of each group's count.
 */
export function PeopleFigure({ visual }: { visual: People }) {
  const each = visual.each ?? 1;
  const icons = visual.groups.flatMap((group, g) =>
    Array.from({ length: Math.round(group.count / each) }, (_, i) => ({ tone: group.tone, key: `${g}-${i}` })),
  );
  const cols = icons.length > 50 ? 20 : 10;
  const rows = Math.ceil(icons.length / cols);
  const stepX = 17;
  const stepY = 21;
  const gridW = cols * stepX;
  const gridH = rows * stepY;

  const legend = visual.groups.map((group, i) => ({
    key: `legend-${i}`,
    x: 0,
    tone: group.tone,
    text: `${group.count.toLocaleString("en-US")} ${group.label}`,
  }));
  const legendRows: (typeof legend)[] = [];
  // Wrap the legend when it's wider than the grid.
  const maxW = Math.max(gridW, 300);
  let row: typeof legend = [];
  let rowX = 2;
  for (const item of legend) {
    const w = 14 + item.text.length * 6.6 + 16;
    if (row.length && rowX + w > maxW) {
      legendRows.push(row);
      row = [];
      rowX = 2;
    }
    row.push({ ...item, x: rowX });
    rowX += w;
  }
  if (row.length) legendRows.push(row);

  const legendTop = gridH + 14;
  const eachLine = each > 1 ? 1 : 0;
  const width = Math.max(gridW + 4, maxW);
  const height = legendTop + legendRows.length * 18 + eachLine * 18;
  const total = visual.groups.reduce((sum, g) => sum + g.count, 0);

  return (
    <figure className="mx-auto w-full" style={{ maxWidth: Math.min(560, width * 1.4) }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${total.toLocaleString("en-US")} people: ${visual.groups.map((g) => `${g.count} ${g.label}`).join(", ")}`}
        style={{ width: "100%", height: "auto", maxHeight: 280, fontFamily: "inherit" }}
      >
        {icons.map((icon, i) => (
          <Person key={icon.key} x={(width - gridW) / 2 + stepX / 2 + (i % cols) * stepX} y={11 + Math.floor(i / cols) * stepY} tone={icon.tone} />
        ))}
        {legendRows.map((items, r) => (
          <g key={`row-${r}`}>
            {items.map((item) => (
              <g key={item.key}>
                <circle cx={item.x + 5} cy={legendTop + r * 18 + 4} r={5} fill={fillOf(item.tone)} />
                <text x={item.x + 14} y={legendTop + r * 18 + 4} dominantBaseline="central" fontSize={12} fill="var(--muted-foreground)">
                  {item.text}
                </text>
              </g>
            ))}
          </g>
        ))}
        {each > 1 && (
          <text x={2} y={legendTop + legendRows.length * 18 + 4} dominantBaseline="central" fontSize={11} fill="var(--muted-foreground)">
            Each icon is {each.toLocaleString("en-US")} people
          </text>
        )}
      </svg>
      {visual.caption && <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">{visual.caption}</figcaption>}
    </figure>
  );
}
