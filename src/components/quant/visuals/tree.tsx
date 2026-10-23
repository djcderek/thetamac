import type { QuantVisual, Tone, TreeNode } from "@/lib/quant/visual";
import { TONE_FILL, TONE_INK } from "@/components/quant/visuals/tones";

type Tree = Extract<QuantVisual, { type: "tree" }>;

const FADE = { transition: "fill 250ms ease, opacity 250ms ease" };
const FONT = 12;
const EDGE_FONT = 11;
const PILL_H = 22;
/** Room between columns for the branch and its label. */
const GAP = 58;

/** Unmarked nodes keep full-strength text, so the tree reads before anything is coloured. */
const nodeInk = (tone: Tone) => (tone === "muted" ? "var(--foreground)" : TONE_INK[tone]);
/** A rough text width in the page font, enough to size pills and label chips. */
const textWidth = (text: string, size: number) => text.length * size * 0.56;

type Placed = { node: TreeNode; depth: number; y: number; x: number; width: number; key: string; parent?: Placed };

/** Lays the tree out left to right: leaves on evenly spaced rows, each parent centred on its children. */
function layout(root: TreeNode, rowHeight: number) {
  const placed: Placed[] = [];
  let leafRow = 0;
  const visit = (node: TreeNode, depth: number, key: string, parent?: Placed): Placed => {
    const self: Placed = { node, depth, y: 0, x: 0, width: Math.max(30, textWidth(node.label, FONT) + 18), key, parent };
    placed.push(self);
    const children = (node.children ?? []).map((child, i) => visit(child, depth + 1, `${key}.${i}`, self));
    self.y = children.length ? (children[0].y + children[children.length - 1].y) / 2 : leafRow++ * rowHeight;
    return self;
  };
  visit(root, 0, "0");
  const depths = Math.max(...placed.map((p) => p.depth)) + 1;
  const columnWidth = Array.from({ length: depths }, (_, d) => Math.max(...placed.filter((p) => p.depth === d).map((p) => p.width)));
  const columnX: number[] = [];
  for (let d = 0; d < depths; d++) {
    columnX[d] = d === 0 ? columnWidth[0] / 2 : columnX[d - 1] + columnWidth[d - 1] / 2 + GAP + columnWidth[d] / 2;
  }
  for (const p of placed) p.x = f(columnX[p.depth]);
  for (const p of placed) {
    p.width = f(p.width);
    p.y = f(p.y);
  }
  return { placed, leaves: leafRow, width: f(columnX[depths - 1] + columnWidth[depths - 1] / 2) };
}

/** Rounded to 0.01, so server and client render identical coordinates. */
const f = (n: number) => Math.round(n * 100) / 100;

/** A point along the branch curve from (x0, y0) to (x1, y1), which leaves flat and arrives flat. */
function curvePoint(x0: number, y0: number, x1: number, y1: number, t: number) {
  const xm = (x0 + x1) / 2;
  const u = 1 - t;
  const x = u * u * u * x0 + 3 * u * u * t * xm + 3 * u * t * t * xm + t * t * t * x1;
  const y = u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y1 + t * t * t * y1;
  return { x: f(x), y: f(y) };
}

function describe(node: TreeNode): string {
  const kids = node.children ?? [];
  if (!kids.length) return node.label;
  return `${node.label} branches to ${kids.map((k) => `${k.label}${k.edge ? ` (${k.edge})` : ""}`).join(", ")}`;
}

/** A probability tree, read left to right: each branch carries its chance. */
export function TreeFigure({ visual }: { visual: Tree }) {
  const rowHeight = 30;
  const { placed, leaves, width: treeWidth } = layout(visual.root, rowHeight);
  const pad = 4;
  const width = treeWidth + pad * 2;
  const height = (leaves - 1) * rowHeight + PILL_H + pad * 2;
  const offsetY = pad + PILL_H / 2;
  const all = placed.map((p) => ({ ...p, x: p.x + pad, y: p.y + offsetY }));
  const byKey = new Map(all.map((p) => [p.key, p]));
  // Big trees get taller, so 16 leaves still read at full size.
  const maxHeight = Math.max(280, leaves * 30);

  return (
    <figure className="mx-auto w-full" style={{ maxWidth: Math.max(320, width * 1.35) }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Probability tree. ${all
          .filter((p) => p.node.children?.length)
          .map((p) => describe(p.node))
          .join(". ")}.`}
        className="block"
        style={{ width: "100%", height: "auto", maxHeight, fontFamily: "inherit" }}
      >
        {/* Branches first, so the pills sit on top of their ends. */}
        {all
          .filter((p) => p.parent)
          .map((p) => {
            const parent = byKey.get(p.parent!.key)!;
            const x0 = parent.x + parent.width / 2;
            const x1 = p.x - p.width / 2;
            const xm = (x0 + x1) / 2;
            return (
              <path
                key={`branch-${p.key}`}
                d={`M ${x0} ${parent.y} C ${xm} ${parent.y}, ${xm} ${p.y}, ${x1} ${p.y}`}
                fill="none"
                stroke="var(--muted-foreground)"
                strokeOpacity={0.45}
                strokeWidth={1.25}
              />
            );
          })}
        {all
          .filter((p) => p.parent && p.node.edge)
          .map((p) => {
            const parent = byKey.get(p.parent!.key)!;
            const at = curvePoint(parent.x + parent.width / 2, parent.y, p.x - p.width / 2, p.y, 0.55);
            const text = p.node.edge!;
            const chipW = textWidth(text, EDGE_FONT) + 8;
            return (
              <g key={`edge-${p.key}`}>
                <rect x={at.x - chipW / 2} y={at.y - 8} width={chipW} height={16} rx={5} fill="var(--background)" />
                <text
                  x={at.x}
                  y={at.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={EDGE_FONT}
                  fill="var(--muted-foreground)"
                  className="tabular-nums"
                >
                  {text}
                </text>
              </g>
            );
          })}
        {all.map((p) => {
          const tone = p.node.tone ?? "muted";
          return (
            <g key={`node-${p.key}`}>
              <rect
                x={p.x - p.width / 2}
                y={p.y - PILL_H / 2}
                width={p.width}
                height={PILL_H}
                rx={PILL_H / 2}
                fill={TONE_FILL[tone]}
                style={FADE}
              />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={FONT}
                fontWeight={tone === "muted" ? 500 : 600}
                fill={nodeInk(tone)}
                style={FADE}
              >
                {p.node.label}
              </text>
            </g>
          );
        })}
      </svg>
      {visual.caption && <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">{visual.caption}</figcaption>}
    </figure>
  );
}
