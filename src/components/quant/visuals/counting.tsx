import type { QuantVisual } from "@/lib/quant/visual";
import { TONE_FILL, TONE_INK } from "@/components/quant/visuals/tones";

type Slots = Extract<QuantVisual, { type: "slots" }>;
type StarsBars = Extract<QuantVisual, { type: "stars-bars" }>;
type GridPath = Extract<QuantVisual, { type: "grid-path" }>;

const FADE = { transition: "fill 250ms ease, opacity 250ms ease, stroke 250ms ease, stroke-opacity 250ms ease" };
const svgStyle = { width: "100%", height: "auto", maxHeight: 280, fontFamily: "inherit" } as const;
const textWidth = (text: string, size: number) => text.length * size * 0.56;

function Caption({ text }: { text?: string }) {
  return text ? <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">{text}</figcaption> : null;
}

/** Boxes for choices made in steps: a big value in each, its label underneath, joined by × or +. */
export function SlotsFigure({ visual }: { visual: Slots }) {
  // Long rows (a 5-character plate) pack tighter so labels stay readable on a phone.
  const compact = visual.slots.length >= 5;
  const boxH = compact ? 50 : 58;
  const gap = compact ? 20 : 30;
  const valueSize = compact ? 20 : 22;
  const boxes = visual.slots.map((slot) => ({
    ...slot,
    w: Math.max(compact ? 44 : 64, textWidth(slot.value, valueSize) + (compact ? 18 : 28), textWidth(slot.label, 12) + 10),
  }));
  const placed: (typeof boxes[number] & { x: number })[] = [];
  let x = 2;
  for (const box of boxes) {
    placed.push({ ...box, x });
    x += box.w + gap;
  }
  const resultText = visual.result ? `= ${visual.result}` : "";
  const width = x - gap + (resultText ? 14 + textWidth(resultText, valueSize) + 6 : 0) + 2;
  const height = boxH + 26;

  return (
    <figure className="mx-auto w-full" style={{ maxWidth: Math.min(600, width * 1.2) }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${visual.slots.map((s) => `${s.value} ${s.label}`).join(visual.op === "×" ? " times " : visual.op === "+" ? " plus " : ", ")}${
          visual.result ? ` equals ${visual.result}` : ""
        }`}
        style={svgStyle}
      >
        {placed.map((box, i) => {
          const tone = box.tone ?? "muted";
          return (
            <g key={i}>
              <rect
                x={box.x + 0.75}
                y={2.75}
                width={box.w - 1.5}
                height={boxH - 1.5}
                rx={10}
                fill={TONE_FILL[tone]}
                stroke="var(--muted-foreground)"
                strokeOpacity={tone === "known" ? 0.55 : 0}
                strokeWidth={1.5}
                style={FADE}
              />
              <text
                x={box.x + box.w / 2}
                y={2 + boxH / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={valueSize}
                fontWeight={600}
                fill={tone === "muted" || tone === "known" ? "var(--foreground)" : TONE_INK[tone]}
                style={FADE}
              >
                {box.value}
              </text>
              <text x={box.x + box.w / 2} y={boxH + 18} textAnchor="middle" fontSize={12} fill="var(--muted-foreground)">
                {box.label}
              </text>
              {visual.op && i < placed.length - 1 && (
                <text
                  x={box.x + box.w + gap / 2}
                  y={2 + boxH / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={18}
                  fill="var(--muted-foreground)"
                >
                  {visual.op}
                </text>
              )}
            </g>
          );
        })}
        {resultText && (
          <text x={x - gap + 14} y={2 + boxH / 2} dominantBaseline="central" fontSize={valueSize} fontWeight={600} fill="var(--foreground)">
            {resultText}
          </text>
        )}
      </svg>
      <Caption text={visual.caption} />
    </figure>
  );
}

/** A five-point star centred at (cx, cy). */
function starPath(cx: number, cy: number, outer: number, inner: number) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? outer : inner;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  });
  return `M ${points.join(" L ")} Z`;
}

/** Identical items split into groups by dividers, with each group bracketed underneath. */
export function StarsBarsFigure({ visual }: { visual: StarsBars }) {
  const groups = visual.bars + 1;
  // An example split: as even as possible, earlier groups taking the extra.
  const sizes = Array.from({ length: groups }, (_, i) => Math.floor(visual.stars / groups) + (i < visual.stars % groups ? 1 : 0));
  const starStep = 26;
  const barGap = 24;
  // Wide enough for its "child n" label, even with one star or none.
  const minGroupW = 44;
  const layout: { start: number; w: number; size: number }[] = [];
  let x = 4;
  for (const size of sizes) {
    const w = Math.max(size * starStep, minGroupW);
    layout.push({ start: x, w, size });
    x += w + barGap;
  }
  const width = x - barGap + 4;
  const height = 74;
  const cy = 18;

  return (
    <figure className="mx-auto w-full" style={{ maxWidth: Math.min(600, width * 1.3) }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${visual.stars} identical items split by ${visual.bars} dividers into ${groups} groups, for example ${sizes.join(", ")}`}
        style={svgStyle}
      >
        {layout.map((group, g) => (
          <g key={g}>
            {Array.from({ length: group.size }, (_, i) => (
              <path
                key={i}
                d={starPath(group.start + (group.w - group.size * starStep) / 2 + starStep / 2 + i * starStep, cy, 10, 4.4)}
                fill={TONE_FILL.hit}
                style={FADE}
              />
            ))}
            {g < layout.length - 1 && (
              <rect x={group.start + group.w + barGap / 2 - 1.5} y={cy - 15} width={3} height={30} rx={1.5} fill="var(--foreground)" />
            )}
            <path
              d={`M ${group.start + 2} ${cy + 22} v 5 h ${group.w - 4} v -5`}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            <text x={group.start + group.w / 2} y={cy + 42} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
              {`child ${g + 1}`}
            </text>
            <text x={group.start + group.w / 2} y={cy + 55} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--foreground)">
              {group.size}
            </text>
          </g>
        ))}
      </svg>
      <Caption text={visual.caption} />
    </figure>
  );
}

/** A lattice with one shortest route from bottom-left to top-right highlighted. */
export function GridPathFigure({ visual }: { visual: GridPath }) {
  const { across, up } = visual;
  const cell = 30;
  const pad = 16;
  const width = across * cell + pad * 2 + 30;
  const height = up * cell + pad * 2 + 8;
  const x0 = pad;
  const y0 = pad + up * cell;
  // One example route: spread the up moves evenly among the right moves.
  const moves: ("R" | "U")[] = [];
  let r = 0;
  let u = 0;
  while (r < across || u < up) {
    if (u < up && (r === across || (u + 1) / up <= (r + 1) / across)) {
      moves.push("U");
      u++;
    } else {
      moves.push("R");
      r++;
    }
  }
  let px = x0;
  let py = y0;
  const path = [`M ${px} ${py}`];
  for (const move of moves) {
    if (move === "R") px += cell;
    else py -= cell;
    path.push(`L ${px} ${py}`);
  }

  return (
    <figure className="mx-auto w-full" style={{ maxWidth: Math.min(420, width * 1.4) }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`A ${across} by ${up} grid with one route of ${across} steps right and ${up} steps up highlighted`}
        style={svgStyle}
      >
        {Array.from({ length: up + 1 }, (_, i) => (
          <line key={`h-${i}`} x1={x0} y1={pad + i * cell} x2={x0 + across * cell} y2={pad + i * cell} stroke="var(--border)" strokeWidth={1.5} />
        ))}
        {Array.from({ length: across + 1 }, (_, i) => (
          <line key={`v-${i}`} x1={x0 + i * cell} y1={pad} x2={x0 + i * cell} y2={y0} stroke="var(--border)" strokeWidth={1.5} />
        ))}
        <path d={path.join(" ")} fill="none" stroke={TONE_FILL.hit} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" style={FADE} />
        <circle cx={x0} cy={y0} r={5} fill="var(--foreground)" />
        <circle cx={x0 + across * cell} cy={pad} r={5} fill={TONE_FILL.hit} />
        <text x={x0 + across * cell + 10} y={pad} dominantBaseline="central" fontSize={11} fill="var(--muted-foreground)">
          End
        </text>
        <text x={x0} y={y0 + 15} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
          Start
        </text>
      </svg>
      <Caption text={visual.caption} />
    </figure>
  );
}
