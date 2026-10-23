/**
 * Figures for quant walkthroughs, as data. Builders describe what to draw; the components in
 * src/components/quant/visuals draw it. Each walkthrough step can carry its own figure, so the
 * picture changes as the working goes on (a step without one keeps the previous figure).
 */

/**
 * How a marked thing is coloured:
 * - hit: what the question asks for (brand orange)
 * - alt: a second group, e.g. the other set in "A or B" (blue)
 * - both: the overlap of hit and alt (ink)
 * - known: what you've been told, the space you're now inside (soft ink wash)
 * - win / lose: outcomes that pay or cost
 * - muted: present but not counted
 */
export type Tone = "hit" | "alt" | "both" | "known" | "win" | "lose" | "muted";

/** "13H" = king of hearts. Ranks 1 (ace) to 13 (king); suits S, H, D, C. */
export type CardId = `${number}${"S" | "H" | "D" | "C"}`;

export type TreeNode = {
  /** Text at the node: "Bag A", "Red", "HT". */
  label: string;
  /** Text on the branch leading into this node: "1/2". */
  edge?: string;
  tone?: Tone;
  children?: TreeNode[];
};

export type QuantVisual =
  /** Every outcome of two dice as a grid: row = first die, column = second. Cells are [first, second], 1-based. */
  | { type: "dice-grid"; sides: number; marks: { cells: [number, number][]; tone: Tone }[]; caption?: string }
  /** The faces of one die in a row. */
  | { type: "die-faces"; sides: number; marks: { faces: number[]; tone: Tone }[]; caption?: string }
  /** A whole deck as 4 suit rows × 13 ranks. */
  | { type: "cards"; marks: { cards: CardId[]; tone: Tone }[]; caption?: string }
  /** A row of coin flips; "?" is a flip not yet made. */
  | { type: "coins"; flips: ("H" | "T" | "?")[]; tones?: Tone[]; caption?: string }
  /** Marbles in a bag, by group; `taken` lists marbles already drawn, in order. */
  | { type: "marbles"; groups: { count: number; tone: Tone; label: string }[]; taken?: Tone[]; caption?: string }
  /** An icon array of people (Bayes, rates). `each` people per icon when the group is large. */
  | { type: "people"; groups: { count: number; tone: Tone; label: string }[]; each?: number; caption?: string }
  /** Two overlapping sets; highlight picks which regions are coloured. */
  | {
      type: "venn";
      a: { label: string; count: string };
      b: { label: string; count: string };
      both: string;
      outside?: string;
      highlight: ("a" | "b" | "both" | "outside")[];
      caption?: string;
    }
  /** Boxes for choices made in steps: "5 shirts × 3 trousers × 2 shoes". */
  | { type: "slots"; slots: { label: string; value: string; tone?: Tone }[]; op: "×" | "+"; result?: string; caption?: string }
  /** Identical items split by dividers: ★★|★|★★★. */
  | { type: "stars-bars"; stars: number; bars: number; caption?: string }
  /** A grid walk from bottom-left to top-right, `across` steps right and `up` steps up. */
  | { type: "grid-path"; across: number; up: number; caption?: string }
  /** A probability tree drawn left to right. */
  | { type: "tree"; root: TreeNode; caption?: string }
  /** A bar chart: a distribution, payouts, ways per value. */
  | { type: "bars"; bars: { label: string; value: number; tone: Tone; text?: string }[]; caption?: string }
  /** A bell curve over −3 to 3 standard deviations, with shaded bands. */
  | {
      type: "normal";
      shade: { from: number; to: number; tone: Tone; text?: string }[];
      ticks: { at: number; label: string }[];
      caption?: string;
    }
  /** The unit square of two random numbers; regions are polygons in 0–1 coordinates. */
  | {
      type: "square";
      xLabel: string;
      yLabel: string;
      /** Axis end label, e.g. "60 min" or "1". */
      max: string;
      regions: { points: [number, number][]; tone: Tone; text?: string }[];
      caption?: string;
    }
  /** A number line with shaded ranges and points. */
  | {
      type: "number-line";
      min: number;
      max: number;
      ticks?: number[];
      shade: { from: number; to: number; tone: Tone; text?: string }[];
      points?: { at: number; label: string; tone: Tone }[];
      caption?: string;
    }
  /** States in a line, left to right, with labelled arrows (forward, back or to itself). */
  | {
      type: "states";
      nodes: { id: string; label: string; tone?: Tone }[];
      edges: { from: string; to: string; label: string }[];
      caption?: string;
    };

/** An icon beside a walkthrough step, saying what kind of move it is. */
export type StepIcon =
  | "count"
  | "multiply"
  | "add"
  | "subtract"
  | "divide"
  | "split"
  | "filter"
  | "repeat"
  | "flip"
  | "target"
  | "check"
  | "idea";
