import type { QuantVisual, Tone } from "@/lib/quant/visual";
import { TONE_FILL, TONE_INK, toneOf } from "@/components/quant/visuals/tones";

type DiceGrid = Extract<QuantVisual, { type: "dice-grid" }>;
type DieFaces = Extract<QuantVisual, { type: "die-faces" }>;

const FADE = { transition: "fill 250ms ease, opacity 250ms ease, stroke-opacity 250ms ease" };

/** "Known" reads as the space you're inside: its fill plus a quiet outline, so it stands apart from unmarked. */
const knownStroke = (tone: Tone) => ({
  stroke: "var(--muted-foreground)",
  strokeOpacity: tone === "known" ? 0.55 : 0,
  strokeWidth: 1.5,
});

/** Pip positions on a unit face (0–1), for faces 1 to 6. */
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.25], [0.72, 0.25], [0.28, 0.5], [0.72, 0.5], [0.28, 0.75], [0.72, 0.75]],
};

/** A die face at (x, y) of size `size`: pips up to 6 sides, the number above that. */
function Face({ x, y, size, value, sides, tone, pipScale = 0.1 }: {
  x: number;
  y: number;
  size: number;
  value: number;
  sides: number;
  tone: Tone;
  pipScale?: number;
}) {
  const ink = TONE_INK[tone];
  return (
    <g>
      <rect x={x + 0.75} y={y + 0.75} width={size - 1.5} height={size - 1.5} rx={size * 0.2} fill={TONE_FILL[tone]} {...knownStroke(tone)} style={FADE} />
      {sides <= 6 ? (
        PIPS[value].map(([px, py], i) => (
          <circle key={i} cx={x + px * size} cy={y + py * size} r={size * pipScale} fill={ink} style={FADE} />
        ))
      ) : (
        <text
          x={x + size / 2}
          y={y + size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.42}
          fontWeight={600}
          fill={ink}
          style={FADE}
        >
          {value}
        </text>
      )}
    </g>
  );
}

const svgStyle = { width: "100%", height: "auto", maxHeight: 280, fontFamily: "inherit" } as const;

/** Every outcome of two dice: rows are the first die, columns the second. */
export function DiceGridFigure({ visual }: { visual: DiceGrid }) {
  const n = visual.sides;
  const cell = 30;
  const gap = 4;
  const step = cell + gap;
  const header = 24;
  const axis = 18;
  const left = axis + header + 6;
  const top = axis + header + 6;
  const width = left + n * step - gap + 2;
  const height = top + n * step - gap + 2;
  const marks = visual.marks as DiceGrid["marks"];
  const toneAt = (a: number, b: number) =>
    toneOf(marks, (mark) => (mark as DiceGrid["marks"][number]).cells.some(([x, y]) => x === a && y === b));
  const marked = marks.reduce((sum, mark) => sum + mark.cells.length, 0);
  const faces = Array.from({ length: n }, (_, i) => i + 1);

  return (
    // Cells keep about the same size whatever the number of sides.
    <figure className="mx-auto w-full" style={{ maxWidth: Math.min(360, width * 1.15) }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`A grid of all ${n * n} outcomes of two ${n}-sided dice, with ${marked} marked`}
        style={svgStyle}
      >
        <text x={left + (n * step - gap) / 2} y={11} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
          Second die
        </text>
        <text
          x={11}
          y={top + (n * step - gap) / 2}
          textAnchor="middle"
          fontSize={11}
          fill="var(--muted-foreground)"
          transform={`rotate(-90 11 ${top + (n * step - gap) / 2})`}
        >
          First die
        </text>
        {faces.map((face) => (
          <g key={`col-${face}`}>
            <Face x={left + (face - 1) * step + (cell - header) / 2} y={axis} size={header} value={face} sides={n} tone="muted" pipScale={0.09} />
          </g>
        ))}
        {faces.map((face) => (
          <g key={`row-${face}`}>
            <Face x={axis} y={top + (face - 1) * step + (cell - header) / 2} size={header} value={face} sides={n} tone="muted" pipScale={0.09} />
          </g>
        ))}
        {faces.map((a) =>
          faces.map((b) => (
            <rect
              key={`${a}-${b}`}
              x={left + (b - 1) * step + 0.75}
              y={top + (a - 1) * step + 0.75}
              width={cell - 1.5}
              height={cell - 1.5}
              rx={6}
              fill={TONE_FILL[toneAt(a, b)]}
              {...knownStroke(toneAt(a, b))}
              // Cells pop in and recolour along the diagonals, so a change reads as a sweep.
              className="quant-pop"
              style={{
                transition: `fill 300ms ease ${(a + b) * 18}ms, stroke-opacity 300ms ease ${(a + b) * 18}ms`,
                animationDelay: `${(a + b) * 14}ms`,
              }}
            />
          )),
        )}
      </svg>
      {visual.caption && <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">{visual.caption}</figcaption>}
    </figure>
  );
}

/** The faces of one die in a row (two rows above 10 faces). */
export function DieFacesFigure({ visual }: { visual: DieFaces }) {
  const n = visual.sides;
  const perRow = n > 10 ? Math.ceil(n / 2) : n;
  const rows = Math.ceil(n / perRow);
  const size = 40;
  const gap = 8;
  const width = perRow * (size + gap) - gap + 2;
  const height = rows * (size + gap) - gap + 2;
  const marks = visual.marks as DieFaces["marks"];
  const toneAt = (face: number) => toneOf(marks, (mark) => (mark as DieFaces["marks"][number]).faces.includes(face));
  const marked = new Set(marks.flatMap((mark) => mark.faces)).size;

  return (
    <figure className="mx-auto w-full" style={{ maxWidth: Math.min(560, width * 1.15) }}>
      <svg
        viewBox={`-1 -1 ${width} ${height}`}
        role="img"
        aria-label={`The ${n} faces of a die, with ${marked} marked`}
        style={svgStyle}
      >
        {Array.from({ length: n }, (_, i) => i + 1).map((face) => {
          const col = (face - 1) % perRow;
          const row = Math.floor((face - 1) / perRow);
          return (
            <g key={face}>
              <Face x={col * (size + gap)} y={row * (size + gap)} size={size} value={face} sides={n} tone={toneAt(face)} />
            </g>
          );
        })}
      </svg>
      {visual.caption && <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">{visual.caption}</figcaption>}
    </figure>
  );
}
