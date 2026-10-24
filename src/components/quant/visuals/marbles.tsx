import type { QuantVisual, Tone } from "@/lib/quant/visual";
import { TONE_FILL } from "@/components/quant/visuals/tones";

type Marbles = Extract<QuantVisual, { type: "marbles" }>;

const FADE = { transition: "fill 250ms ease, opacity 250ms ease, stroke 250ms ease" };

/**
 * Marbles in a bag, grouped by tone, with a legend. Marbles in `taken` are drawn in draw
 * order beside the bag, and each leaves a dashed gap where one of its tone was.
 */
export function MarblesFigure({ visual }: { visual: Marbles }) {
  const total = visual.groups.reduce((sum, g) => sum + g.count, 0);
  const taken = visual.taken ?? [];
  const r = 11;
  const step = 28;
  const cols = total <= 8 ? 4 : total <= 18 ? 6 : 8;
  const rows = Math.ceil(total / cols);
  const pad = 16;
  const bagW = cols * step - (step - 2 * r) + pad * 2;
  const bagH = rows * step - (step - 2 * r) + pad * 2;
  const bagTop = 4;

  // Lay marbles out group by group; a taken marble empties the last unused slot of its tone.
  const slots: { tone: Tone; removed: boolean; key: string }[] = visual.groups.flatMap((group, g) =>
    Array.from({ length: group.count }, (_, i) => ({ tone: group.tone, removed: false, key: `${g}-${i}` })),
  );
  for (const tone of taken) {
    for (let i = slots.length - 1; i >= 0; i--) {
      if (slots[i].tone === tone && !slots[i].removed) {
        slots[i].removed = true;
        break;
      }
    }
  }

  const takenLeft = bagW + 30;
  const takenStep = 34;
  const legendY = bagTop + bagH + 20;
  const width = Math.max(takenLeft + (taken.length ? taken.length * takenStep + 6 : 0), bagW + 4, legendWidth(visual) + 4);
  const height = legendY + 12;
  const description = visual.groups.map((g) => `${g.count} ${g.label}`).join(", ");

  return (
    <figure className="mx-auto w-full" style={{ maxWidth: Math.min(560, width * 1.3) }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`A bag with ${description}${taken.length ? `; ${taken.length} drawn so far` : ""}`}
        style={{ width: "100%", height: "auto", maxHeight: 280, fontFamily: "inherit" }}
      >
        <rect x={2} y={bagTop} width={bagW} height={bagH} rx={18} fill="none" stroke="var(--border)" strokeWidth={2} />
        {slots.map((slot, i) => {
          const cx = 2 + pad + r + (i % cols) * step;
          const cy = bagTop + pad + r + Math.floor(i / cols) * step;
          return slot.removed ? (
            <circle key={slot.key} cx={cx} cy={cy} r={r - 1} fill="none" stroke="var(--muted-foreground)" strokeWidth={1.2} strokeDasharray="3 3" opacity={0.55} />
          ) : (
            <circle key={slot.key} cx={cx} cy={cy} r={r} fill={TONE_FILL[slot.tone]} className="quant-pop" style={{ ...FADE, animationDelay: `${Math.min(i * 22, 400)}ms` }} />
          );
        })}

        {taken.length > 0 && (
          <g>
            <path
              d={`M ${bagW + 8} ${bagTop + bagH / 2} h 14 m -5 -5 l 5 5 l -5 5`}
              fill="none"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {taken.map((tone, i) => {
              const cx = takenLeft + r + i * takenStep;
              const cy = bagTop + bagH / 2;
              return (
                <g key={`taken-${i}`}>
                  <text x={cx} y={cy - r - 7} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
                    {ordinal(i + 1)}
                  </text>
                  <circle cx={cx} cy={cy} r={r} fill={TONE_FILL[tone]} style={FADE} />
                </g>
              );
            })}
          </g>
        )}

        <g>
          {legendItems(visual).map((item) => (
            <g key={item.key}>
              <circle cx={item.x + 5} cy={legendY} r={5} fill={TONE_FILL[item.tone]} />
              <text x={item.x + 14} y={legendY} dominantBaseline="central" fontSize={12} fill="var(--muted-foreground)">
                {item.text}
              </text>
            </g>
          ))}
        </g>
      </svg>
      {visual.caption && <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">{visual.caption}</figcaption>}
    </figure>
  );
}

function ordinal(n: number) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}

/** Legend entries laid out left to right, with a rough text width for spacing. */
function legendItems(visual: Marbles) {
  const items: { key: string; x: number; tone: Tone; text: string }[] = [];
  let x = 2;
  for (const [i, group] of visual.groups.entries()) {
    const text = `${group.count} ${group.label}`;
    items.push({ key: `legend-${i}`, x, tone: group.tone, text });
    x += 14 + text.length * 6.6 + 16;
  }
  return items;
}

function legendWidth(visual: Marbles) {
  return visual.groups.reduce((sum, g) => sum + 14 + `${g.count} ${g.label}`.length * 6.6 + 16, 0);
}
