import type { CardId, QuantVisual } from "@/lib/quant/visual";
import { TONE_FILL, TONE_INK, toneOf } from "@/components/quant/visuals/tones";

type Cards = Extract<QuantVisual, { type: "cards" }>;

const FADE = { transition: "fill 250ms ease, opacity 250ms ease, stroke-opacity 250ms ease" };
const SUITS = [
  { id: "S", symbol: "♠", red: false },
  { id: "H", symbol: "♥", red: true },
  { id: "D", symbol: "♦", red: true },
  { id: "C", symbol: "♣", red: false },
] as const;
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

/** A whole deck: one row per suit, one column per rank, marked cards filled by tone. */
export function CardsFigure({ visual }: { visual: Cards }) {
  const w = 22;
  const h = 30;
  const gap = 4;
  const left = 22;
  const top = 2;
  const width = left + 13 * (w + gap) - gap + 2;
  const height = top + 4 * (h + gap) - gap + 2;
  const marks = visual.marks as Cards["marks"];
  const toneAt = (id: CardId) => toneOf(marks, (mark) => (mark as Cards["marks"][number]).cards.includes(id));
  const marked = new Set(marks.flatMap((mark) => mark.cards)).size;

  return (
    <figure className="mx-auto w-full max-w-[520px]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`A 52-card deck in four suit rows, with ${marked} cards marked`}
        style={{ width: "100%", height: "auto", maxHeight: 280, fontFamily: "inherit" }}
      >
        {SUITS.map((suit, row) => {
          const y = top + row * (h + gap);
          return (
            <g key={suit.id}>
              <text
                x={left / 2 - 1}
                y={y + h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={14}
                fill={suit.red ? "var(--destructive)" : "var(--foreground)"}
              >
                {suit.symbol}
              </text>
              {RANKS.map((rank, col) => {
                const id = `${col + 1}${suit.id}` as CardId;
                const tone = toneAt(id);
                const x = left + col * (w + gap);
                const ink = tone === "muted" || tone === "known" ? (suit.red ? "var(--destructive)" : "var(--foreground)") : TONE_INK[tone];
                return (
                  <g key={id} className="quant-pop" style={{ animationDelay: `${(col + "SHDC".indexOf(suit.id)) * 16}ms` }}>
                    <rect
                      x={x + 0.75}
                      y={y + 0.75}
                      width={w - 1.5}
                      height={h - 1.5}
                      rx={4}
                      fill={TONE_FILL[tone]}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={tone === "known" ? 0.55 : 0}
                      strokeWidth={1.5}
                      style={FADE}
                    />
                    <text
                      x={x + w / 2}
                      y={y + h / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={rank === "10" ? 9.5 : 11}
                      fontWeight={600}
                      fill={ink}
                      opacity={tone === "muted" ? 0.75 : 1}
                      style={FADE}
                    >
                      {rank}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      {visual.caption && <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">{visual.caption}</figcaption>}
    </figure>
  );
}
