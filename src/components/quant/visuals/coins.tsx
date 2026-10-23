import type { QuantVisual } from "@/lib/quant/visual";
import { TONE_FILL, TONE_INK } from "@/components/quant/visuals/tones";

type Coins = Extract<QuantVisual, { type: "coins" }>;

const FADE = { transition: "fill 250ms ease, opacity 250ms ease, stroke 250ms ease, stroke-opacity 250ms ease" };

/** A row of coin flips; "?" is a flip not made yet, drawn as a dashed outline. */
export function CoinsFigure({ visual }: { visual: Coins }) {
  const r = 18;
  const gap = 10;
  const count = visual.flips.length;
  const width = count * (2 * r + gap) - gap + 4;
  const height = 2 * r + 4;
  const shown = visual.flips.map((f) => (f === "?" ? "not flipped yet" : f === "H" ? "heads" : "tails")).join(", ");

  return (
    <figure className="mx-auto w-full" style={{ maxWidth: Math.min(560, width * 1.4) }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${count} coin flip${count === 1 ? "" : "s"}: ${shown}`}
        style={{ width: "100%", height: "auto", maxHeight: 280, fontFamily: "inherit" }}
      >
        {visual.flips.map((flip, i) => {
          const cx = 2 + r + i * (2 * r + gap);
          const cy = 2 + r;
          if (flip === "?") {
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={14} fill="var(--muted-foreground)">
                  ?
                </text>
              </g>
            );
          }
          const tone = visual.tones?.[i] ?? "muted";
          return (
            <g key={i}>
              <circle
                cx={cx}
                cy={cy}
                r={r - 0.75}
                fill={TONE_FILL[tone]}
                stroke="var(--muted-foreground)"
                strokeOpacity={tone === "known" ? 0.55 : 0}
                strokeWidth={1.5}
                style={FADE}
              />
              <circle cx={cx} cy={cy} r={r - 4} fill="none" stroke={TONE_INK[tone]} strokeOpacity={0.25} strokeWidth={1} style={FADE} />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={15}
                fontWeight={700}
                fill={tone === "muted" || tone === "known" ? "var(--foreground)" : TONE_INK[tone]}
                style={FADE}
              >
                {flip}
              </text>
            </g>
          );
        })}
      </svg>
      {visual.caption && <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">{visual.caption}</figcaption>}
    </figure>
  );
}
