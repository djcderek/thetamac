"use client";

import { useId } from "react";
import type { QuantVisual, Tone } from "@/lib/quant/visual";
import { TONE_FILL, TONE_INK } from "@/components/quant/visuals/tones";

type Venn = Extract<QuantVisual, { type: "venn" }>;

const FADE = { transition: "fill 250ms ease, opacity 250ms ease" };

/**
 * Two overlapping sets in a box. Each region (A only, B only, both, outside) is its own
 * shape, so highlighting one never double-tints another.
 */
export function VennFigure({ visual }: { visual: Venn }) {
  const id = useId().replace(/:/g, "");
  const width = 360;
  const height = 210;
  const r = 70;
  const cy = 112;
  const ax = 140;
  const bx = 220;
  const on = (region: Venn["highlight"][number]) => visual.highlight.includes(region);
  const tones: Record<"a" | "b" | "both" | "outside", Tone> = {
    a: on("a") ? "hit" : "muted",
    b: on("b") ? "alt" : "muted",
    both: on("both") ? "both" : "muted",
    outside: on("outside") ? "known" : "muted",
  };
  const ink = (region: keyof typeof tones) => (tones[region] === "muted" ? "var(--foreground)" : TONE_INK[tones[region]]);
  const hasOutside = visual.outside !== undefined;

  return (
    <figure className="mx-auto w-full max-w-[420px]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Two overlapping groups: ${visual.a.label} (${visual.a.count} only), ${visual.b.label} (${visual.b.count} only), ${visual.both} in both${
          hasOutside ? `, ${visual.outside} in neither` : ""
        }`}
        style={{ width: "100%", height: "auto", maxHeight: 280, fontFamily: "inherit" }}
      >
        <defs>
          <clipPath id={`${id}-a`}>
            <circle cx={ax} cy={cy} r={r} />
          </clipPath>
          <mask id={`${id}-a-only`}>
            <rect width={width} height={height} fill="black" />
            <circle cx={ax} cy={cy} r={r} fill="white" />
            <circle cx={bx} cy={cy} r={r} fill="black" />
          </mask>
          <mask id={`${id}-b-only`}>
            <rect width={width} height={height} fill="black" />
            <circle cx={bx} cy={cy} r={r} fill="white" />
            <circle cx={ax} cy={cy} r={r} fill="black" />
          </mask>
          <mask id={`${id}-outside`}>
            <rect width={width} height={height} fill="white" />
            <circle cx={ax} cy={cy} r={r} fill="black" />
            <circle cx={bx} cy={cy} r={r} fill="black" />
          </mask>
        </defs>

        {/* The surrounding box: everyone, with the outside region tinted when highlighted. */}
        <rect
          x={8}
          y={30}
          width={width - 16}
          height={height - 38}
          rx={14}
          fill={hasOutside && tones.outside !== "muted" ? TONE_FILL[tones.outside] : "transparent"}
          mask={`url(#${id}-outside)`}
          style={FADE}
        />
        <rect x={8} y={30} width={width - 16} height={height - 38} rx={14} fill="none" stroke="var(--border)" strokeWidth={1.5} />

        <rect width={width} height={height} fill={TONE_FILL[tones.a]} mask={`url(#${id}-a-only)`} style={FADE} />
        <rect width={width} height={height} fill={TONE_FILL[tones.b]} mask={`url(#${id}-b-only)`} style={FADE} />
        <circle cx={bx} cy={cy} r={r} fill={TONE_FILL[tones.both]} clipPath={`url(#${id}-a)`} style={FADE} />
        <circle cx={ax} cy={cy} r={r} fill="none" stroke="var(--background)" strokeWidth={2} />
        <circle cx={bx} cy={cy} r={r} fill="none" stroke="var(--background)" strokeWidth={2} />

        <text x={ax - 30} y={20} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--foreground)">
          {visual.a.label}
        </text>
        <text x={bx + 30} y={20} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--foreground)">
          {visual.b.label}
        </text>

        <text x={ax - 30} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={600} fill={ink("a")} style={FADE}>
          {visual.a.count}
        </text>
        <text x={(ax + bx) / 2} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={600} fill={ink("both")} style={FADE}>
          {visual.both}
        </text>
        <text x={bx + 30} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={600} fill={ink("b")} style={FADE}>
          {visual.b.count}
        </text>
        {hasOutside && (
          <g>
            <text x={width - 22} y={height - 30} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
              Neither
            </text>
            <text x={width - 22} y={height - 16} textAnchor="end" fontSize={15} fontWeight={600} fill={ink("outside")} style={FADE}>
              {visual.outside}
            </text>
          </g>
        )}
      </svg>
      {visual.caption && <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">{visual.caption}</figcaption>}
    </figure>
  );
}
