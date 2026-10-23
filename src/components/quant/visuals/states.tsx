"use client";

import { useId } from "react";
import type { QuantVisual, Tone } from "@/lib/quant/visual";
import { TONE_FILL, TONE_INK } from "@/components/quant/visuals/tones";

type States = Extract<QuantVisual, { type: "states" }>;

const FADE = { transition: "fill 250ms ease, opacity 250ms ease" };
const EDGE_FONT = 11;
const nodeInk = (tone: Tone) => (tone === "muted" ? "var(--foreground)" : TONE_INK[tone]);
const textWidth = (text: string, size: number) => text.length * size * 0.56;

/** Rounded to 0.01, so server and client render identical coordinates (Math.cos can differ in the last digit). */
const f = (n: number) => Math.round(n * 100) / 100;

/** A point on a quadratic curve. */
const quad = (p0: number, p1: number, p2: number, t: number) => (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;

/**
 * States in a row, left to right. Forward arrows arc above, backward arrows arc below,
 * and an arrow back to the same state is a small loop above it.
 */
export function StatesFigure({ visual }: { visual: States }) {
  const markerId = `states-arrow-${useId().replace(/:/g, "")}`;
  const n = visual.nodes.length;
  const width = 360;
  const side = 26;
  const spacing = n > 1 ? (width - side * 2) / (n - 1) : 0;
  const r = Math.min(22, Math.max(13, spacing * 0.32));
  const index = new Map(visual.nodes.map((node, i) => [node.id, i]));
  const xOf = (id: string) => side + (index.get(id) ?? 0) * spacing;

  // Arc heights grow with how many states an arrow skips, so long arrows clear short ones.
  const arcs = visual.edges.map((edge) => {
    const from = index.get(edge.from) ?? 0;
    const to = index.get(edge.to) ?? 0;
    const span = Math.abs(to - from);
    const kind = from === to ? "self" : to > from ? "forward" : "back";
    const lift = kind === "self" ? r * 1.9 : Math.min(18 + span * 14, 74);
    return { edge, from, to, kind, lift };
  });
  const above = Math.max(r, ...arcs.filter((a) => a.kind !== "back").map((a) => a.lift + (a.kind === "self" ? r * 0.75 + 20 : 16)));
  const below = Math.max(r, ...arcs.filter((a) => a.kind === "back").map((a) => a.lift + 16));
  const cy = above + 8;
  const height = cy + below + 8;

  const nodeFont = (label: string) => Math.max(9, Math.min(12, ((r * 2 - 6) / Math.max(1, label.length)) / 0.56));

  return (
    <figure className="mx-auto w-full max-w-[560px]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`States ${visual.nodes.map((node) => node.label).join(", ")}. ${visual.edges
          .map((e) => `${e.from} to ${e.to}: ${e.label}`)
          .join("; ")}`}
        className="block"
        style={{ width: "100%", height: "auto", maxHeight: 280, fontFamily: "inherit" }}
      >
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 Z" fill="var(--muted-foreground)" />
          </marker>
        </defs>
        {arcs.map(({ edge, kind, lift }, i) => {
          const x0 = xOf(edge.from);
          const x1 = xOf(edge.to);
          let d: string;
          let lx: number;
          let ly: number;
          if (kind === "self") {
            // Leave from the upper left of the node, loop above, come back to the upper right.
            const a = (-120 * Math.PI) / 180;
            const b = (-60 * Math.PI) / 180;
            const sx = x0 + r * Math.cos(a);
            const sy = cy + r * Math.sin(a);
            const ex = x0 + r * Math.cos(b);
            const ey = cy + r * Math.sin(b);
            d = `M ${f(sx)} ${f(sy)} C ${f(x0 - r * 1.3)} ${f(cy - lift - r)}, ${f(x0 + r * 1.3)} ${f(cy - lift - r)}, ${f(ex)} ${f(ey)}`;
            // Label above the top of the loop, clear of neighbouring arcs' labels.
            lx = f(x0);
            ly = f(cy - lift - r * 0.75 - 10);
          } else {
            const up = kind === "forward" ? -1 : 1;
            const dir = x1 > x0 ? 1 : -1;
            const angle = (55 * Math.PI) / 180;
            const sx = x0 + dir * r * Math.cos(angle);
            const sy = cy + up * r * Math.sin(angle);
            const ex = x1 - dir * r * Math.cos(angle);
            const ey = cy + up * r * Math.sin(angle);
            const mx = (sx + ex) / 2;
            const my = cy + up * (lift * 2 - r * Math.sin(angle));
            d = `M ${f(sx)} ${f(sy)} Q ${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}`;
            lx = f(quad(sx, mx, ex, 0.5));
            ly = f(quad(sy, my, ey, 0.5));
          }
          const chipW = textWidth(edge.label, EDGE_FONT) + 8;
          return (
            <g key={`edge-${i}-${edge.from}-${edge.to}`}>
              <path
                d={d}
                fill="none"
                stroke="var(--muted-foreground)"
                strokeOpacity={0.55}
                strokeWidth={1.25}
                markerEnd={`url(#${markerId})`}
              />
              <rect x={lx - chipW / 2} y={ly - 8} width={chipW} height={16} rx={5} fill="var(--background)" />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={EDGE_FONT}
                fill="var(--muted-foreground)"
                className="tabular-nums"
              >
                {edge.label}
              </text>
            </g>
          );
        })}
        {visual.nodes.map((node) => {
          const tone = node.tone ?? "muted";
          return (
            <g key={`node-${node.id}`}>
              <circle cx={xOf(node.id)} cy={cy} r={r} fill={TONE_FILL[tone]} style={FADE} />
              <text
                x={xOf(node.id)}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={nodeFont(node.label)}
                fontWeight={600}
                fill={nodeInk(tone)}
                style={FADE}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
      {visual.caption && <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">{visual.caption}</figcaption>}
    </figure>
  );
}
