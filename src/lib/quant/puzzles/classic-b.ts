import { add, div, formatDecimal, formatFraction, mul, pow, q, sub, value, type Rational } from "../rational";
import { choose, problem, type QuantPuzzle } from "../build";
import type { QuantVisual } from "../visual";

/**
 * Classic one-off puzzles, second batch: expected value, waits, birthdays, games and broken
 * sticks. Each is a fixed question with a worked solution; tests in classic-b.test.ts check
 * every answer a different way.
 */

/** A decimal, marked "≈" only when it was rounded. */
const approx = (x: Rational) => (Number.isInteger(Math.round(value(x) * 1e6) / 1e3) ? formatDecimal(x) : `≈ ${formatDecimal(x)}`);

// ─── 1. The last colour standing ───────────────────────────────────────────────────────

const lastColour = (() => {
  const red = 3, blue = 2, green = 2;
  const total = red + blue + green;
  const lastBlue = q(blue, total);
  const greenOutlastsRed = q(green, red + green);
  const oneCase = mul(lastBlue, greenOutlastsRed);
  const answer = add(oneCase, mul(q(green, total), q(blue, red + blue)));
  const bag: QuantVisual = {
    type: "marbles",
    groups: [
      { count: red, tone: "hit", label: "red" },
      { count: blue, tone: "alt", label: "blue" },
      { count: green, tone: "win", label: "green" },
    ],
  };
  const tree: QuantVisual = {
    type: "tree",
    root: {
      label: "Last marble",
      children: [
        { label: "Blue", edge: formatFraction(lastBlue), tone: "alt", children: [{ label: "Green outlasts red", edge: formatFraction(greenOutlastsRed), tone: "hit" }] },
        { label: "Green", edge: formatFraction(q(green, total)), tone: "win", children: [{ label: "Blue outlasts red", edge: formatFraction(q(blue, red + blue)), tone: "hit" }] },
        { label: "Red", edge: formatFraction(q(red, total)), tone: "muted" },
      ],
    },
    caption: "Both orange paths leave a blue and a green behind when the last red comes out.",
  };
  return problem(
    "last-colour-standing",
    `A bag holds ${red} red, ${blue} blue and ${green} green marbles. You take them out one at a time, at random. What’s the chance that when the last red marble comes out, at least one blue and at least one green are still in the bag?`,
    answer,
    "probability",
    [
      {
        label: "The last marble of all is blue",
        work: `${blue} of ${total}`,
        result: formatFraction(lastBlue),
        icon: "split",
        explain: "Blue and green must both outlast red, so the very last marble is blue or green. Split on which one it is.",
        visual: tree,
      },
      {
        label: "Then green outlasts red",
        work: `${green} green of the ${red + green} red and green`,
        result: formatFraction(greenOutlastsRed),
        icon: "filter",
        explain: "The reds and greens still come out in a random order among themselves, so the last of them is green with chance 2/5.",
      },
      {
        label: "Blue last, then green outlasts red",
        work: `${formatFraction(lastBlue)} × ${formatFraction(greenOutlastsRed)}`,
        result: formatFraction(oneCase),
        icon: "multiply",
        explain: "Both things must happen on this path, so multiply. Green last works the same way with the colours swapped.",
      },
      {
        label: "Add both cases",
        work: `${formatFraction(oneCase)} + ${formatFraction(oneCase)}`,
        icon: "add",
        explain: "The last marble can’t be both blue and green, so the two cases don’t overlap. Add them.",
      },
    ],
    { red, blue, green },
    bag,
  );
})();

// ─── 2. The Pólya urn ──────────────────────────────────────────────────────────────────

const polya = (() => {
  const kicks = 10, made = 6;
  const orderChance = q(720 * 24, 39916800); // 6! × 4! ÷ 11!
  const orders = 210; // C(10, 6)
  const answer = mul(q(orders), orderChance);
  const flips: ("H" | "T" | "?")[] = ["H", "T", ...Array<"?">(kicks).fill("?")];
  return problem(
    "polya-urn",
    `You take penalty kicks. You score the first and miss the second. After that, your chance of scoring each kick equals the share of kicks you’ve scored so far (so the third kick goes in with chance 1/2). What’s the chance you score exactly ${made} of the next ${kicks}?`,
    answer,
    "probability",
    [
      {
        label: `One order with ${made} goals and ${kicks - made} misses`,
        work: "(1 × 2 × … × 6) × (1 × 2 × 3 × 4) ÷ (2 × 3 × … × 11)",
        result: formatFraction(orderChance),
        icon: "multiply",
        explain: "Each goal’s chance has the goals so far on top, each miss’s the misses so far, and the bottoms run 2, 3, …, 11 in any order.",
        visual: { type: "coins", flips: ["H", "T", "H", "H", "T", "H", "T", "H", "T", "H", "H", "T"], caption: "H = goal, T = miss. Every order with 6 goals has the same chance." },
      },
      {
        label: `Orders with ${made} goals`,
        work: `C(${kicks}, ${made})`,
        result: String(orders),
        icon: "count",
        explain: "Choose which 6 of the 10 kicks are goals.",
      },
      {
        label: "Chance",
        work: `${orders} × ${formatFraction(orderChance)}`,
        icon: "multiply",
        explain: "Every order has the same chance, so multiply. The answer is 1 ÷ 11 for any number of goals from 0 to 10.",
        visual: {
          type: "bars",
          bars: Array.from({ length: kicks + 1 }, (_, k) => ({ label: String(k), value: 1, tone: k === made ? "hit" : "muted" })),
          caption: "Every number of goals from 0 to 10 is equally likely.",
        },
      },
    ],
    { kicks, made },
    { type: "coins", flips, caption: "Scored the first, missed the second, 10 kicks to go." },
  );
})();

// ─── 3. An ant on a tetrahedron ────────────────────────────────────────────────────────

const ant = (() => {
  const second = q(1), third = div(q(1), q(2, 3)), fourth = div(q(1), q(1, 3)), home = div(q(1), q(1, 3));
  const answer = add(add(second, third), add(fourth, home));
  const chain: QuantVisual = {
    type: "states",
    nodes: [
      { id: "one", label: "1 seen" },
      { id: "two", label: "2 seen" },
      { id: "three", label: "3 seen" },
      { id: "four", label: "All 4" },
      { id: "home", label: "Home", tone: "hit" },
    ],
    edges: [
      { from: "one", to: "two", label: "1" },
      { from: "two", to: "two", label: "1/3" },
      { from: "two", to: "three", label: "2/3" },
      { from: "three", to: "three", label: "2/3" },
      { from: "three", to: "four", label: "1/3" },
      { from: "four", to: "four", label: "2/3" },
      { from: "four", to: "home", label: "1/3" },
    ],
    caption: "Each step goes to one of the 3 other corners, each with chance 1/3.",
  };
  return problem(
    "ant-on-a-tetrahedron",
    "An ant stands on one corner of a tetrahedron (4 corners, each joined to the other 3). Each step it walks to one of the other 3 corners at random. On average, how many steps until it has visited every corner and is back where it started?",
    answer,
    "number",
    [
      {
        label: "Wait for the 2nd corner",
        work: "every neighbour is new",
        result: "1 step",
        icon: "count",
        explain: "From the start, all 3 corners it can walk to are new, so the first step always finds one.",
        visual: chain,
      },
      {
        label: "Wait for the 3rd corner",
        work: "1 ÷ 2/3",
        result: formatDecimal(third),
        icon: "divide",
        explain: "With 2 corners seen, 2 of its 3 moves reach a new corner. A chance of 2/3 each step means 1 ÷ 2/3 steps on average.",
      },
      {
        label: "Wait for the 4th corner",
        work: "1 ÷ 1/3",
        result: formatDecimal(fourth),
        icon: "divide",
        explain: "With 3 corners seen, only 1 of its 3 moves is new.",
      },
      {
        label: "Wait to get back to the start",
        work: "1 ÷ 1/3",
        result: formatDecimal(home),
        icon: "divide",
        explain: "It’s now away from the start, and from any other corner 1 of its 3 moves goes home.",
      },
      {
        label: "Add the waits",
        work: "1 + 1.5 + 3 + 3",
        icon: "add",
        explain: "The four waits happen one after another, so the average total is their sum.",
        visual: {
          type: "bars",
          bars: [
            { label: "2nd", value: 1, tone: "alt", text: "1" },
            { label: "3rd", value: 1.5, tone: "alt", text: "1.5" },
            { label: "4th", value: 3, tone: "alt", text: "3" },
            { label: "Home", value: 3, tone: "hit", text: "3" },
          ],
          caption: "Average steps for each stage.",
        },
      },
    ],
    { corners: 4 },
    chain,
  );
})();

// ─── 4. The highest roll before a 4 ────────────────────────────────────────────────────

const highestBeforeFour = (() => {
  const atMost4 = q(1, 3), atMost5 = q(1, 2);
  const p4 = atMost4, p5 = sub(atMost5, atMost4), p6 = sub(q(1), atMost5);
  const answer = add(add(mul(q(4), p4), mul(q(5), p5)), mul(q(6), p6));
  return problem(
    "highest-roll-before-a-four",
    "You roll a fair die until it shows a 4, then stop. What’s the highest number you rolled, on average (counting the final 4)?",
    answer,
    "number",
    [
      {
        label: "The highest is at least 4",
        work: "the last roll is always a 4",
        icon: "idea",
        explain: "So the highest is 4, 5 or 6. You only need the chance of each.",
      },
      {
        label: "The highest stays at 4",
        work: "a 4 comes before any 5 or 6: 1 ÷ 3",
        result: formatFraction(atMost4),
        icon: "filter",
        explain: "Ignore 1s, 2s and 3s. Of 4, 5 and 6, each is equally likely to show up first, and the 4 must be first.",
        visual: { type: "die-faces", sides: 6, marks: [{ faces: [1, 2, 3], tone: "muted" }, { faces: [4], tone: "hit" }, { faces: [5, 6], tone: "lose" }] },
      },
      {
        label: "The highest is 5 or less",
        work: "a 4 comes before any 6: 1 ÷ 2",
        result: formatFraction(atMost5),
        icon: "filter",
        explain: "Now only 4 and 6 matter: whichever shows up first decides it.",
        visual: { type: "die-faces", sides: 6, marks: [{ faces: [1, 2, 3, 5], tone: "muted" }, { faces: [4], tone: "hit" }, { faces: [6], tone: "lose" }] },
      },
      {
        label: "Chances of a highest of 4, 5 and 6",
        work: `${formatFraction(atMost4)}, ${formatFraction(atMost5)} − ${formatFraction(atMost4)}, 1 − ${formatFraction(atMost5)}`,
        result: `${formatFraction(p4)}, ${formatFraction(p5)}, ${formatFraction(p6)}`,
        icon: "subtract",
        explain: "The chance the highest is exactly 5 is the chance it’s at most 5, minus the chance it’s at most 4.",
        visual: {
          type: "bars",
          bars: [
            { label: "4", value: value(p4), tone: "hit", text: formatFraction(p4) },
            { label: "5", value: value(p5), tone: "hit", text: formatFraction(p5) },
            { label: "6", value: value(p6), tone: "hit", text: formatFraction(p6) },
          ],
          caption: "Chance of each highest roll.",
        },
      },
      {
        label: "Average highest",
        work: `4 × ${formatFraction(p4)} + 5 × ${formatFraction(p5)} + 6 × ${formatFraction(p6)}`,
        icon: "add",
        explain: "Multiply each highest by its chance and add them up.",
      },
    ],
    { stop: 4 },
    { type: "die-faces", sides: 6, marks: [{ faces: [4], tone: "hit" }] },
  );
})();

// ─── 5. Two coin waits ─────────────────────────────────────────────────────────────────

const twoWaits = (() => {
  const bobMore = q(1, 3);
  const answer = div(q(1), q(3, 4));
  return problem(
    "two-coin-waits",
    "Alice and Bob each flip a fair coin until they get heads, counting their flips. You’re told Bob needed more flips than Alice. On average, how many flips did Alice need?",
    answer,
    "number",
    [
      {
        label: "Alice takes a flips and Bob takes more",
        work: "(1/2)ᵃ × (1/2)ᵃ = (1/4)ᵃ",
        icon: "multiply",
        explain: "Alice’s first head comes on flip `a` with chance `(1/2)^a`. Bob needs more than `a` flips, so his first `a` flips are all tails, also chance `(1/2)^a`.",
        visual: { type: "coins", flips: ["T", "H", "T", "T", "?"], tones: ["alt", "alt", "hit", "hit", "muted"], caption: "Alice (blue) gets heads on flip 2; Bob (orange) is still on tails after 2 flips." },
      },
      {
        label: "Chance Bob needs more flips",
        work: "1/4 + 1/16 + 1/64 + …",
        result: formatFraction(bobMore),
        icon: "add",
        explain: "Add `(1/4)^a` over every `a`. This is what you’re told happened.",
      },
      {
        label: "Given that, Alice took a flips",
        work: "(1/4)ᵃ ÷ 1/3 = 3/4, 3/16, 3/64, …",
        icon: "divide",
        explain: "Divide by the chance of what you know. That’s a first-success wait with chance 3/4 each flip.",
        visual: {
          type: "bars",
          bars: [1, 2, 3, 4, 5].map((a) => ({ label: String(a), value: 3 / 4 ** a, tone: "alt" as const, text: a <= 3 ? formatFraction(q(3, 4 ** a)) : undefined })),
          caption: "Alice’s flips, given Bob needed more.",
        },
      },
      {
        label: "Average flips for Alice",
        work: "1 ÷ 3/4",
        icon: "divide",
        explain: "A chance of 3/4 each flip means 1 ÷ 3/4 flips on average. Knowing Bob was slow makes Alice look quick.",
      },
    ],
    { chance: "1/2" },
  );
})();

// ─── 6. Rolling until a repeat ─────────────────────────────────────────────────────────

const untilRepeat = (() => {
  const still = Array.from({ length: 7 }, (_, r) => {
    let p = q(1);
    for (let i = 0; i < r; i++) p = mul(p, q(6 - i, 6));
    return p;
  });
  const answer = still.reduce((sum, p) => add(sum, p), q(0));
  return problem(
    "rolling-until-a-repeat",
    "You roll a fair die again and again, stopping as soon as a number comes up that you’ve already rolled. On average, how many rolls do you make (counting the last)?",
    answer,
    "number",
    [
      {
        label: "Average rolls = chances you’re still rolling, added up",
        work: "add the chance the first r rolls are all different, for r = 0 to 6",
        icon: "idea",
        explain: "You make roll `r + 1` only if the first `r` rolls were all different. Adding the chance of making each roll gives the average count.",
      },
      {
        label: "First r rolls all different",
        work: "1, 1, 5/6, 5/9, 5/18, 5/54, 5/324",
        icon: "multiply",
        explain: "Each new roll must miss the numbers already seen: 5/6, then 4/6, and so on, multiplied together.",
        visual: {
          type: "bars",
          bars: still.map((p, r) => ({ label: String(r), value: value(p), tone: "hit" as const })),
          caption: "Chance the first r rolls are all different.",
        },
      },
      {
        label: "Add them",
        work: still.map((p) => formatFraction(p)).join(" + "),
        icon: "add",
        explain: "This sum is the average number of rolls. After 7 rolls a repeat is certain, so the list stops there.",
      },
    ],
    { sides: 6 },
    { type: "die-faces", sides: 6, marks: [{ faces: [2, 5], tone: "known" }, { faces: [5], tone: "hit" }], caption: "Stop when a face shows up a second time." },
  );
})();

// ─── 7. The free-ice-cream line ────────────────────────────────────────────────────────

const iceCream = (() => {
  // Chance place n wins: the n − 1 ahead all differ, then n matches one of them (365-day year).
  const winChance = (n: number) => {
    let differ = 1;
    for (let i = 0; i < n - 1; i++) differ *= (365 - i) / 365;
    return (differ * (n - 1)) / 365;
  };
  return problem(
    "free-ice-cream-line",
    "An ice-cream shop gives a free cone to the first person in line whose birthday matches someone ahead of them. Birthdays are random over 365 days. Which place in line gives you the best chance of the free cone?",
    q(20),
    "count",
    [
      {
        label: "Chance place n wins",
        work: "(the n − 1 people ahead all differ) × (n − 1) ÷ 365",
        icon: "multiply",
        explain: "Nobody ahead of you can have won, so their birthdays all differ. Then yours must match one of those `n - 1`.",
        visual: {
          type: "bars",
          bars: Array.from({ length: 24 }, (_, i) => ({ label: String(i + 1), value: winChance(i + 1), tone: i + 1 === 20 ? ("hit" as const) : ("muted" as const) })),
          caption: "Chance of winning at each place in line.",
        },
      },
      {
        label: "Compare place n + 1 with place n",
        work: "× (366 − n) ÷ 365 for the extra person who must differ, × n ÷ (n − 1) for more people to match",
        icon: "divide",
        explain: "Moving back one place adds a person who must not match, but gives you one more birthday to hit.",
      },
      {
        label: "Best place: just after n² − n reaches 365",
        work: "19² − 19 = 342 is under 365; 20² − 20 = 380 isn’t",
        icon: "target",
        explain: "The chance rises while the ratio is above 1, which simplifies to `n^2 - n < 365`. It peaks one place after that stops.",
      },
    ],
    { days: 365 },
  );
})();

// ─── 8. The gambler and the friend ─────────────────────────────────────────────────────

const gambler = (() => {
  const spins = 6;
  const answer = pow(q(5, 6), spins);
  return problem(
    "gambler-and-friend",
    `A smaller version of the roulette gambler: a wheel has 6 equal sections, and a $1 bet on one section pays 5 to 1. You bet $1 on the same section for ${spins} spins. What’s the chance you end up behind?`,
    answer,
    "probability",
    [
      {
        label: "One win is enough to break even",
        work: "one win: +$5; five losses: −$5",
        icon: "idea",
        explain: "A single win pays back exactly what the other 5 bets lose, so you’re only behind if you never win.",
        visual: {
          type: "bars",
          bars: Array.from({ length: spins + 1 }, (_, w) => ({
            label: String(w),
            value: choose(spins, w) * (1 / 6) ** w * (5 / 6) ** (spins - w),
            tone: w === 0 ? ("lose" as const) : ("win" as const),
            text: w === 0 ? "behind" : w === 1 ? "even" : undefined,
          })),
          caption: "Chance of each number of wins in 6 spins. Only 0 wins leaves you behind.",
        },
      },
      {
        label: "No win in 6 spins",
        work: `(5/6)${"⁶"}`,
        icon: "repeat",
        explain: "Each spin misses your section with chance 5/6, and spins don’t affect each other, so multiply 6 times.",
      },
    ],
    { spins, sections: 6 },
    { type: "die-faces", sides: 6, marks: [{ faces: [3], tone: "hit" }], caption: "Your section is one of 6." },
  );
})();

// ─── 9. A running total past a target ──────────────────────────────────────────────────

const runningTotal = (() => {
  const target = 10, sides = 4;
  // Value of the game from each total: the average final total, worked back from the end.
  const worth = new Map<number, Rational>();
  const at = (t: number): Rational => (t >= target ? q(t) : worth.get(t)!);
  for (let t = target - 1; t >= 0; t--) {
    let sum = q(0);
    for (let f = 1; f <= sides; f++) sum = add(sum, at(t + f));
    worth.set(t, div(sum, q(sides)));
  }
  const from = (t: number) => approx(worth.get(t)!);
  return problem(
    "running-total-past-a-target",
    `You roll a fair ${sides}-sided die and keep a running total, stopping as soon as the total is ${target} or more. What’s the final total on average?`,
    worth.get(0)!,
    "number",
    [
      {
        label: `From a total of 9`,
        work: "(10 + 11 + 12 + 13) ÷ 4",
        result: formatDecimal(worth.get(9)!),
        icon: "idea",
        explain: "Work back from the end. From 9, any roll finishes, so the final total is 9 plus the roll, averaged over the 4 faces.",
        visual: {
          type: "number-line",
          min: 0,
          max: 13,
          ticks: [0, 5, 9, 10, 13],
          shade: [{ from: 10, to: 13, tone: "hit", text: "stop" }],
          points: [{ at: 9, label: "9", tone: "alt" }],
        },
      },
      {
        label: "From a total of 8",
        work: `(value from 9 + 10 + 11 + 12) ÷ 4`,
        result: from(8),
        icon: "add",
        explain: "A 1 takes you to 9, whose value you just found; the other rolls finish at once.",
      },
      {
        label: "From 7 and 6",
        work: `${from(7)} and ${from(6)}`,
        icon: "repeat",
        explain: "Each total’s value is the average of the values one to four steps ahead.",
      },
      {
        label: "Back to a total of 0",
        work: "the same rule, one total at a time, down to the start",
        icon: "repeat",
        explain: "Keep averaging the four totals ahead until you reach 0, the start of the game.",
        visual: {
          type: "bars",
          bars: Array.from({ length: target }, (_, t) => ({ label: String(t), value: value(worth.get(t)!) - 9, tone: t === 0 ? ("hit" as const) : ("muted" as const) })),
          caption: "How far above 9 the final total ends up, on average, from each total.",
        },
      },
    ],
    { target, sides },
  );
})();

// ─── 10–12. Broken sticks and a circle ─────────────────────────────────────────────────

const stickTriangle = problem(
  "broken-stick-triangle",
  "You break a stick at two random points, chosen independently. What’s the chance the three pieces can form a triangle?",
  q(1, 4),
  "probability",
  [
    {
      label: "A triangle needs every piece under half",
      work: "the longest side must be shorter than the other two together",
      icon: "idea",
      explain: "If one piece is half the stick or more, the other two can’t reach around it.",
    },
    {
      label: "Picture the two breaks as a point in a square",
      work: "across: first break, up: second break",
      icon: "split",
      explain: "Every pair of break points is equally likely, so a chance is a share of the square’s area.",
      visual: {
        type: "square",
        xLabel: "First break",
        yLabel: "Second break",
        max: "1",
        regions: [
          { points: [[0, 0.5], [0.5, 1], [0.5, 0.5]], tone: "hit" },
          { points: [[0.5, 0], [0.5, 0.5], [1, 0.5]], tone: "hit" },
        ],
        caption: "Orange: all three pieces are under half the stick.",
      },
    },
    {
      label: "Area where every piece is under half",
      work: "2 triangles of 1/8 each",
      icon: "count",
      explain: "Each orange triangle has legs of 1/2, so area 1/8. Together they cover a quarter of the square.",
    },
  ],
  { breaks: 2 },
);

const shortestPiece = problem(
  "shortest-piece",
  "You break a 1 m stick at two random points. What’s the chance the shortest of the three pieces is 20 cm or less?",
  q(21, 25),
  "probability",
  [
    {
      label: "Work out the opposite",
      work: "every piece is longer than 20 cm",
      icon: "flip",
      explain: "\"At most 20 cm\" has many cases; \"all over 20 cm\" is one region, so find it and take it from 1.",
    },
    {
      label: "Give each piece 20 cm first",
      work: "100 − 3 × 20",
      result: "40 cm",
      icon: "subtract",
      explain: "If every piece is over 20 cm, take 20 cm off each. What’s left is a random split of 40 cm.",
    },
    {
      label: "Chance every piece is over 20 cm",
      work: "(40/100)²",
      result: "4/25",
      icon: "multiply",
      explain: "The region in the square is the full picture shrunk to 40% across and 40% up, so its area is 0.4².",
      visual: {
        type: "square",
        xLabel: "First break",
        yLabel: "Second break",
        max: "100 cm",
        regions: [
          { points: [[0.2, 0.4], [0.2, 0.8], [0.6, 0.8]], tone: "alt" },
          { points: [[0.4, 0.2], [0.8, 0.2], [0.8, 0.6]], tone: "alt" },
        ],
        caption: "Blue: every piece is over 20 cm. That’s 16% of the square.",
      },
    },
    {
      label: "Shortest is 20 cm or less",
      work: "1 − 4/25",
      icon: "subtract",
      explain: "Everything outside the blue triangles has a piece of 20 cm or less.",
    },
  ],
  { cm: 20 },
);

const acuteTriangle = problem(
  "acute-triangle-on-a-circle",
  "You pick three random points on a circle and join them into a triangle. What’s the chance the triangle is acute (every angle under 90°)?",
  q(1, 4),
  "probability",
  [
    {
      label: "Acute means the centre is inside",
      work: "an angle of 90° or more appears exactly when all three points fit in a half circle",
      icon: "idea",
      explain: "If the points fit in a half circle, the triangle sits to one side of the centre and its middle angle is at least 90°.",
      visual: {
        type: "number-line",
        min: 0,
        max: 360,
        ticks: [0, 90, 180, 270, 360],
        shade: [{ from: 0, to: 180, tone: "known", text: "a half circle" }],
        points: [
          { at: 20, label: "A", tone: "hit" },
          { at: 110, label: "B", tone: "hit" },
          { at: 160, label: "C", tone: "hit" },
        ],
        caption: "The circle opened out into degrees: these three fit in a half circle, so the triangle isn’t acute.",
      },
    },
    {
      label: "Chance all three fit in a half circle",
      work: "3 ÷ 2²",
      result: "3/4",
      icon: "count",
      explain: "Each point can be the start of a clockwise half circle holding the other two: chance (1/2)² each, and only one point can be it.",
    },
    {
      label: "Chance the triangle is acute",
      work: "1 − 3/4",
      icon: "subtract",
      explain: "The triangle is acute exactly when the points don’t fit in any half circle.",
    },
  ],
  { points: 3 },
);

export const CLASSIC_B_PUZZLES: QuantPuzzle[] = [
  { id: "last-colour-standing", lesson: "splitting-cases", title: "The last colour standing", difficulty: "Hard", problem: lastColour },
  { id: "polya-urn", lesson: "random-walks", title: "The Pólya urn", difficulty: "Hard", problem: polya },
  { id: "ant-on-a-tetrahedron", lesson: "coupon-collector", title: "An ant on a tetrahedron", difficulty: "Medium", problem: ant },
  { id: "highest-roll-before-a-four", lesson: "highest-lowest", title: "The highest roll before a 4", difficulty: "Medium", problem: highestBeforeFour },
  { id: "two-coin-waits", lesson: "geometric", title: "Two coin waits", difficulty: "Hard", problem: twoWaits },
  { id: "rolling-until-a-repeat", lesson: "complements", title: "Rolling until a repeat", difficulty: "Medium", problem: untilRepeat },
  { id: "free-ice-cream-line", lesson: "complements", title: "The free ice-cream line", difficulty: "Hard", problem: iceCream },
  { id: "gambler-and-friend", lesson: "binomial", title: "The gambler and the friend", difficulty: "Easy", problem: gambler },
  { id: "running-total-past-a-target", lesson: "optimal-stopping", title: "A running total past a target", difficulty: "Medium", problem: runningTotal },
  { id: "broken-stick-triangle", lesson: "area", title: "The broken stick triangle", difficulty: "Medium", problem: stickTriangle },
  { id: "shortest-piece", lesson: "area", title: "The shortest piece", difficulty: "Medium", problem: shortestPiece },
  { id: "acute-triangle-on-a-circle", lesson: "area", title: "An acute triangle on a circle", difficulty: "Hard", problem: acuteTriangle },
];
