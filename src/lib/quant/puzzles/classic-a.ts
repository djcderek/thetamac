import { q } from "../rational";
import { problem, type QuantPuzzle } from "../build";
import type { TreeNode } from "../visual";

/**
 * Classic one-off puzzles, first batch: counting, probability basics and conditional
 * probability. Each answer is checked another way in classic-a.test.ts.
 */

/** An 8-player bracket as a tree, to picture how a knockout works. */
function bracket(highlight?: { left: "hit" | "alt"; right: "hit" | "alt" }): TreeNode {
  const player = (n: number): TreeNode => ({
    label: `P${n}`,
    tone: highlight ? (n <= 4 ? highlight.left : highlight.right) : undefined,
  });
  const game = (label: string, children: TreeNode[]): TreeNode => ({ label, children });
  return game("Final", [
    game("Semi", [game("Game", [player(1), player(2)]), game("Game", [player(3), player(4)])]),
    game("Semi", [game("Game", [player(5), player(6)]), game("Game", [player(7), player(8)])]),
  ]);
}

const montyHall: QuantPuzzle = {
  id: "monty-hall",
  lesson: "conditional-probability",
  title: "The Monty Hall problem",
  difficulty: "Medium",
  problem: problem(
    "monty-hall",
    "A game show has 3 doors: a car behind one, goats behind the other two. You pick a door. The host, who knows where the car is, opens one of the other doors to show a goat, then lets you switch to the last closed door. If you switch, what's the chance you win the car?",
    q(2, 3),
    "probability",
    [
      {
        label: "Your first pick is the car",
        work: "1 of 3 doors",
        result: "1/3",
        icon: "split",
        explain: "Your first pick is right 1 time in 3. Then the other closed door hides a goat, so switching loses.",
        visual: {
          type: "tree",
          root: {
            label: "Your pick",
            children: [
              { label: "Car", edge: "1/3", tone: "lose", children: [{ label: "Switch: goat", tone: "lose" }] },
              { label: "Goat", edge: "2/3", children: [{ label: "Switch: car" }] },
            ],
          },
        },
      },
      {
        label: "Your first pick is a goat",
        work: "2 of 3 doors",
        result: "2/3",
        icon: "filter",
        explain: "Now the host must open the other goat door, since he never shows the car. The door left closed has to be the car.",
        visual: {
          type: "tree",
          root: {
            label: "Your pick",
            children: [
              { label: "Car", edge: "1/3", tone: "muted", children: [{ label: "Switch: goat", tone: "muted" }] },
              { label: "Goat", edge: "2/3", tone: "hit", children: [{ label: "Switch: car", tone: "win" }] },
            ],
          },
        },
      },
      {
        label: "Switching wins",
        work: "whenever your first pick was a goat",
        icon: "check",
        explain: "The host's door tells you nothing about your own pick, which stays at 1/3. All the rest of the chance moves to the other door.",
      },
    ],
    {},
    {
      type: "slots",
      slots: [
        { label: "Door 1", value: "?" },
        { label: "Door 2", value: "?" },
        { label: "Door 3", value: "?" },
      ],
      op: "",
      caption: "One car, two goats.",
    },
  ),
};

const bertrandsBox: QuantPuzzle = {
  id: "bertrands-box",
  lesson: "bayes-rule",
  title: "Bertrand's box",
  difficulty: "Medium",
  problem: problem(
    "bertrands-box",
    "There are three boxes. One holds two gold coins, one holds two silver coins, and one holds a gold coin and a silver coin. You pick a box at random and take out one coin without looking: it's gold. What's the chance the other coin in that box is gold too?",
    q(2, 3),
    "probability",
    [
      {
        label: "Gold coins you could have drawn",
        work: "2 in the two-gold box + 1 in the mixed box",
        result: "3",
        icon: "count",
        explain: "Every coin is equally likely to be the one you draw. You drew a gold one, so it's one of these 3, each equally likely.",
        visual: {
          type: "marbles",
          groups: [
            { count: 2, tone: "hit", label: "Gold, two-gold box" },
            { count: 1, tone: "alt", label: "Gold, mixed box" },
            { count: 3, tone: "muted", label: "Silver" },
          ],
        },
      },
      {
        label: "Of those, from the two-gold box",
        work: "2 of 3",
        icon: "divide",
        explain: "2 of the 3 gold coins sit in the box whose other coin is gold. It's not 1/2: the two-gold box gives you gold twice as often.",
      },
    ],
    {},
    {
      type: "marbles",
      groups: [
        { count: 3, tone: "hit", label: "Gold coins" },
        { count: 3, tone: "muted", label: "Silver coins" },
      ],
      caption: "Six coins in three boxes of two.",
    },
  ),
};

const lostBoardingPass: QuantPuzzle = {
  id: "lost-boarding-pass",
  lesson: "splitting-cases",
  title: "The lost boarding pass",
  difficulty: "Hard",
  problem: problem(
    "lost-boarding-pass",
    "100 passengers board a plane with 100 seats, one at a time. The first has lost their boarding pass and sits in a random seat. Everyone after sits in their own seat if it's free, and in a random free seat if it isn't. What's the chance the last passenger gets their own seat?",
    q(1, 2),
    "probability",
    [
      {
        label: "Only two seats matter",
        work: "the first passenger's seat and the last passenger's seat",
        icon: "idea",
        explain: "Whenever someone sits at random, they either take seat 1 (everyone after is fine), seat 100 (the last passenger loses), or push the problem on.",
        visual: {
          type: "tree",
          root: {
            label: "A random pick",
            children: [
              { label: "Seat 1", tone: "win", children: [{ label: "Last passenger fine", tone: "win" }] },
              { label: "Seat 100", tone: "lose", children: [{ label: "Last passenger loses", tone: "lose" }] },
              { label: "Another seat", tone: "muted", children: [{ label: "Someone picks again", tone: "muted" }] },
            ],
          },
        },
      },
      {
        label: "At every random pick",
        work: "seat 1 and seat 100 are equally likely",
        icon: "split",
        explain: "Both seats are free until one of them is taken, and a random pick treats them the same. The other seats only delay the choice.",
      },
      {
        label: "Chance seat 1 is taken first",
        work: "1 of the 2 seats that matter",
        icon: "divide",
        explain: "The game ends the moment either seat is taken, and each is equally likely to go first.",
      },
    ],
    {},
    {
      type: "slots",
      slots: [
        { label: "Seat 1", value: "1", tone: "win" },
        { label: "Seats 2–99", value: "…", tone: "muted" },
        { label: "Seat 100", value: "100", tone: "lose" },
      ],
      op: "",
      caption: "The seat the first passenger lost, and the last passenger's seat.",
    },
  ),
};

const labellingADie: QuantPuzzle = {
  id: "labelling-a-die",
  lesson: "permutations",
  title: "Labelling a die",
  difficulty: "Hard",
  problem: problem(
    "labelling-a-die",
    "You write the numbers 1 to 6 on the faces of a blank cube, one number per face. Two labellings count as the same if you can turn one cube to look exactly like the other. How many different dice can you make?",
    q(30),
    "count",
    [
      {
        label: "Turn the cube so 1 faces down",
        work: "1 way, once turning is allowed",
        result: "1",
        icon: "idea",
        explain: "Any die can be turned so 1 is on the bottom. That uses up the freedom to tip the cube over.",
        visual: { type: "slots", slots: [{ label: "Bottom", value: "1" }], op: "×" },
      },
      {
        label: "Choose the number on top",
        work: "any of the other 5",
        result: "5",
        icon: "count",
        explain: "The top face is opposite 1, and turning can't change which number is opposite 1.",
        visual: {
          type: "slots",
          slots: [
            { label: "Bottom", value: "1" },
            { label: "Top", value: "5", tone: "hit" },
          ],
          op: "×",
        },
      },
      {
        label: "Arrange the 4 sides in a ring",
        work: "(4 − 1)! = 3!",
        result: "6",
        icon: "repeat",
        explain: "The 4 side faces form a ring you can still spin, like a round table. Fix one number and arrange the other 3: 3! ways.",
      },
      {
        label: "Multiply",
        work: "5 × 6",
        icon: "multiply",
        explain: "Each choice of top goes with each ring order, so multiply.",
        visual: {
          type: "slots",
          slots: [
            { label: "Bottom", value: "1" },
            { label: "Top", value: "5" },
            { label: "Sides", value: "6" },
          ],
          op: "×",
          result: "30",
        },
      },
    ],
    {},
  ),
};

const locksAndKeys: QuantPuzzle = {
  id: "locks-and-keys",
  lesson: "combinations",
  title: "Locks and keys",
  difficulty: "Hard",
  problem: problem(
    "locks-and-keys",
    "5 partners lock a safe with several locks and share out keys so that any 3 of them together can open every lock, but no 2 of them can. What's the fewest locks they need?",
    q(10),
    "count",
    [
      {
        label: "Every pair must be stopped by some lock",
        work: "a lock neither of the 2 has a key to",
        icon: "filter",
        explain: "No 2 partners can open the safe, so for each pair there's a lock that both of them are missing.",
        visual: {
          type: "people",
          groups: [
            { count: 2, tone: "lose", label: "A pair: no key to this lock" },
            { count: 3, tone: "win", label: "The other 3: hold its key" },
          ],
        },
      },
      {
        label: "That lock's keys go to everyone else",
        work: "all 3 of the others",
        icon: "idea",
        explain: "If any of the other 3 also lacked that key, a trio could be stuck. So the lock stops exactly one pair and no other.",
      },
      {
        label: "One lock for each pair",
        work: "C(5, 2) = 5 × 4 ÷ 2",
        icon: "count",
        explain: "Each pair needs its own lock, and a lock per pair is enough: any trio includes someone outside every pair, so it can open all of them.",
        visual: {
          type: "slots",
          slots: [
            { label: "Partners", value: "5" },
            { label: "Then", value: "4" },
          ],
          op: "×",
          result: "20 ÷ 2 = 10 pairs",
        },
      },
    ],
    {},
    {
      type: "people",
      groups: [{ count: 5, tone: "known", label: "Partners" }],
    },
  ),
};

const bubblePass: QuantPuzzle = {
  id: "one-bubble-pass",
  lesson: "permutations",
  title: "One bubble-sort pass",
  difficulty: "Hard",
  problem: problem(
    "one-bubble-pass",
    "The numbers 1 to 5 are put in a random order. You make one bubble-sort pass: go left to right, swapping each neighbouring pair that's in the wrong order. What's the chance the list is sorted after that one pass?",
    q(2, 15),
    "probability",
    [
      {
        label: "In one pass, a number moves left at most 1 place",
        work: "it only moves left when a bigger number passes it",
        icon: "idea",
        explain: "The pass carries the biggest number so far to the right. Anything it passes shifts left by just one place.",
      },
      {
        label: "So number k must start in the first k + 1 places",
        work: "1 in place 1 or 2, 2 in places 1 to 3, and so on",
        icon: "filter",
        explain: "To end in place k, number k can start at most one place to its right. That's the only thing that can go wrong.",
      },
      {
        label: "Place 1, then 2, then 3 …",
        work: "2 × 2 × 2 × 2 × 1 = 2⁴",
        result: "16",
        icon: "multiply",
        explain: "Each number has 2 allowed spots left when you place it (the last has 1). So 16 orders get sorted.",
        visual: {
          type: "slots",
          slots: [
            { label: "Place 1", value: "2" },
            { label: "Place 2", value: "2" },
            { label: "Place 3", value: "2" },
            { label: "Place 4", value: "2" },
            { label: "Place 5", value: "1" },
          ],
          op: "×",
          result: "16",
        },
      },
      {
        label: "Chance",
        work: "16 ÷ 5! = 16 ÷ 120",
        icon: "divide",
        explain: "All 120 orders are equally likely, and 16 of them get sorted.",
      },
    ],
    {},
    {
      type: "slots",
      slots: [
        { label: "1st", value: "3" },
        { label: "2nd", value: "1" },
        { label: "3rd", value: "2" },
        { label: "4th", value: "5" },
        { label: "5th", value: "4" },
      ],
      op: "",
      caption: "One random order of 1 to 5 (this one does get sorted).",
    },
  ),
};

const oddGrid: QuantPuzzle = {
  id: "odd-sums-grid",
  lesson: "equally-likely",
  title: "Odd sums on a 3 × 3 grid",
  difficulty: "Hard",
  problem: problem(
    "odd-sums-grid",
    "The numbers 1 to 9 are placed at random in a 3 × 3 grid, one per square. What's the chance every row and every column adds up to an odd number?",
    q(1, 14),
    "probability",
    [
      {
        label: "Only where the odd numbers go matters",
        work: "5 odd numbers (1, 3, 5, 7, 9) and 4 even",
        icon: "idea",
        explain: "A row's sum is odd when it holds an odd count of odd numbers: 1 or 3. Evens don't change that.",
        visual: {
          type: "die-faces",
          sides: 9,
          marks: [
            { faces: [1, 3, 5, 7, 9], tone: "hit" },
            { faces: [2, 4, 6, 8], tone: "alt" },
          ],
        },
      },
      {
        label: "Patterns that work",
        work: "one full row of odds, and the other 2 odds in the same column: 3 × 3",
        result: "9",
        icon: "count",
        explain: "5 odds split into rows as 3 + 1 + 1. The full row gives every column 1, so the 2 single odds must share a column to keep every column odd.",
        visual: {
          type: "slots",
          slots: [
            { label: "Full row", value: "3" },
            { label: "Shared column", value: "3" },
          ],
          op: "×",
          result: "9",
        },
      },
      {
        label: "All ways to place the odds",
        work: "C(9, 5)",
        result: "126",
        icon: "count",
        explain: "Every set of 5 squares for the odd numbers is equally likely.",
      },
      {
        label: "Chance",
        work: "9 ÷ 126",
        icon: "divide",
        explain: "The good patterns out of all the equally likely ones.",
      },
    ],
    {},
  ),
};

const evensBeforeOdds: QuantPuzzle = {
  id: "evens-before-odds",
  lesson: "equally-likely",
  title: "Evens before odds",
  difficulty: "Medium",
  problem: problem(
    "evens-before-odds",
    "You roll a fair die until every face has come up at least once. What's the chance that 2, 4 and 6 have all appeared before you see any odd number?",
    q(1, 20),
    "probability",
    [
      {
        label: "Only the order faces first appear matters",
        work: "a random order of the 6 faces",
        icon: "idea",
        explain: "Repeats don't change anything. The first new face, then the next new face and so on form an order of 1 to 6, and every order is equally likely.",
      },
      {
        label: "Orders in all",
        work: "6!",
        result: "720",
        icon: "count",
        explain: "6 choices for the first new face, 5 for the next, and so on.",
      },
      {
        label: "Orders with the 3 evens first",
        work: "3! × 3!",
        result: "36",
        icon: "multiply",
        explain: "Arrange the evens in the first three spots and the odds in the last three.",
        visual: {
          type: "slots",
          slots: [
            { label: "Evens first", value: "3!" },
            { label: "Then odds", value: "3!" },
          ],
          op: "×",
          result: "36",
        },
      },
      {
        label: "Chance",
        work: "36 ÷ 720",
        icon: "divide",
        explain: "The good orders out of all the equally likely ones.",
      },
    ],
    {},
    {
      type: "die-faces",
      sides: 6,
      marks: [
        { faces: [2, 4, 6], tone: "hit" },
        { faces: [1, 3, 5], tone: "alt" },
      ],
      caption: "The evens need to show up before any odd.",
    },
  ),
};

const knockoutMeet: QuantPuzzle = {
  id: "knockout-meeting",
  lesson: "equally-likely",
  title: "Meeting in a knockout",
  difficulty: "Medium",
  problem: problem(
    "knockout-meeting",
    "128 players are put in a random knockout bracket. Every game knocks one player out, and the better player always wins. You pick two of the players at random. What's the chance they play each other at some point?",
    q(1, 64),
    "probability",
    [
      {
        label: "Games played",
        work: "128 − 1",
        result: "127",
        icon: "count",
        explain: "Each game knocks out exactly one player, and all but the winner get knocked out.",
        visual: { type: "tree", root: bracket(), caption: "In 8 players, 7 games." },
      },
      {
        label: "Pairs of players",
        work: "C(128, 2) = 128 × 127 ÷ 2",
        result: "8,128",
        icon: "count",
        explain: "Each game is played by one pair of players.",
      },
      {
        label: "Chance your pair is one of the games",
        work: "127 ÷ 8,128",
        icon: "divide",
        explain: "The bracket is random, so every pair is equally likely to be one of the 127 pairs that meet.",
      },
    ],
    {},
    { type: "tree", root: bracket(), caption: "An 8-player bracket, to picture it." },
  ),
};

const bestTwoFinal: QuantPuzzle = {
  id: "best-two-final",
  lesson: "equally-likely",
  title: "The two best in the final",
  difficulty: "Medium",
  problem: problem(
    "best-two-final",
    "128 players are put in a random knockout bracket, and the better player always wins. What's the chance the two best players meet in the final?",
    q(64, 127),
    "probability",
    [
      {
        label: "They meet in the final when they're in different halves",
        work: "each then beats everyone in their half",
        icon: "split",
        explain: "The best two lose to no one else. If they're in different halves they both reach the final; in the same half they meet earlier.",
        visual: { type: "tree", root: bracket({ left: "hit", right: "alt" }), caption: "The two halves of the bracket." },
      },
      {
        label: "Spots left for the second best",
        work: "127, with 64 in the other half",
        icon: "count",
        explain: "Put the best player anywhere. The second best is equally likely to be in any of the other 127 spots.",
      },
      {
        label: "Chance",
        work: "64 ÷ 127",
        icon: "divide",
        explain: "64 of those 127 spots are in the half the best player isn't in.",
      },
    ],
    {},
  ),
};

const aces = ["1S", "1H", "1D", "1C"] as const;

const cardAfterFirstAce: QuantPuzzle = {
  id: "card-after-first-ace",
  lesson: "conditional-probability",
  title: "The card after the first ace",
  difficulty: "Hard",
  problem: problem(
    "card-after-first-ace",
    "You shuffle a deck and turn the cards over one at a time until the first ace appears. What's the chance the very next card is the king of hearts?",
    q(1, 52),
    "probability",
    [
      {
        label: "Take the king of hearts out",
        work: "shuffle the other 51 cards",
        icon: "split",
        explain: "Build the shuffle in two steps: shuffle the other 51 cards, then put the king of hearts back into a random gap.",
        visual: { type: "cards", marks: [{ cards: [...aces], tone: "alt" }, { cards: ["13H"], tone: "muted" }] },
      },
      {
        label: "Gaps it could go back into",
        work: "before, between or after the 51 cards",
        result: "52",
        icon: "count",
        explain: "Each of the 52 gaps is equally likely, and the order of the other cards is untouched.",
      },
      {
        label: "Gaps that put it right after the first ace",
        work: "exactly 1",
        icon: "target",
        explain: "Whatever the first ace is, exactly one gap sits right after it. So the chance is the same as for any one card.",
        visual: { type: "cards", marks: [{ cards: [...aces], tone: "alt" }, { cards: ["13H"], tone: "hit" }] },
      },
      {
        label: "Chance",
        work: "1 ÷ 52",
        icon: "divide",
        explain: "One good gap out of 52 equally likely ones.",
      },
    ],
    {},
    {
      type: "cards",
      marks: [
        { cards: [...aces], tone: "alt" },
        { cards: ["13H"], tone: "hit" },
      ],
      caption: "The aces and the king of hearts.",
    },
  ),
};

const hundredSwitches: QuantPuzzle = {
  id: "hundred-switches",
  lesson: "inclusion-exclusion",
  title: "100 switches",
  difficulty: "Medium",
  problem: problem(
    "hundred-switches",
    "100 switches start off. Person 1 flips every switch, person 2 flips every 2nd switch, person 3 every 3rd, and so on up to person 100. How many switches are on at the end?",
    q(10),
    "count",
    [
      {
        label: "Switch k is flipped by each person whose number divides k",
        work: "switch 12: people 1, 2, 3, 4, 6, 12",
        icon: "count",
        explain: "Person m flips switches m, 2m, 3m, …, so a switch is flipped once for each of its divisors.",
        visual: {
          type: "bars",
          bars: Array.from({ length: 16 }, (_, i) => {
            const k = i + 1;
            const divisors = Array.from({ length: k }, (_, j) => j + 1).filter((d) => k % d === 0).length;
            return { label: String(k), value: divisors, tone: divisors % 2 ? "hit" : "muted", text: String(divisors) } as const;
          }),
          caption: "Flips for switches 1 to 16. Orange ones are flipped an odd number of times.",
        },
      },
      {
        label: "On at the end means an odd number of flips",
        work: "divisors pair up: 2 × 6, 3 × 4 …",
        icon: "idea",
        explain: "Divisors come in pairs that multiply to k. Only a perfect square has one divisor paired with itself, so only squares have an odd count.",
      },
      {
        label: "Perfect squares up to 100",
        work: "1, 4, 9, 16, 25, 36, 49, 64, 81, 100",
        icon: "check",
        explain: "Count the squares of 1 to 10.",
      },
    ],
    {},
  ),
};

const straight: QuantPuzzle = {
  id: "dealt-a-straight",
  lesson: "combinations",
  title: "Dealt a straight",
  difficulty: "Medium",
  problem: problem(
    "dealt-a-straight",
    "A straight is 5 cards of consecutive ranks, like 5-6-7-8-9 (the ace can be low, A-2-3-4-5, or high, 10-J-Q-K-A). Of the 2,598,960 possible 5-card hands, how many are a straight but not all one suit?",
    q(10200),
    "count",
    [
      {
        label: "Choose the lowest card's rank",
        work: "A, 2, 3, … up to 10",
        result: "10",
        icon: "count",
        explain: "The lowest rank fixes the other four. It can be anything from ace (A-2-3-4-5) up to 10 (10-J-Q-K-A).",
      },
      {
        label: "Choose a suit for each card",
        work: "4⁵",
        result: "1,024",
        icon: "multiply",
        explain: "Each of the 5 cards can be any of the 4 suits.",
        visual: {
          type: "slots",
          slots: [
            { label: "Ranks", value: "10" },
            { label: "Suits", value: "4⁵" },
          ],
          op: "×",
          result: "10,240",
        },
      },
      {
        label: "Take off the ones all in one suit",
        work: "10 × 1,024 − 10 × 4",
        icon: "subtract",
        explain: "10 ranks × 4 suits = 40 hands are straight flushes, which don't count. That leaves a chance of about 0.39%.",
      },
    ],
    {},
    {
      type: "cards",
      marks: [
        { cards: ["5S", "6H", "7H", "8C", "9D"], tone: "hit" },
      ],
      caption: "A straight: 5-6-7-8-9 in mixed suits.",
    },
  ),
};

const spinnerRace: QuantPuzzle = {
  id: "spinner-race",
  lesson: "splitting-cases",
  title: "A spinner race",
  difficulty: "Medium",
  problem: problem(
    "spinner-race",
    "A spinner has 7 equal spots numbered 1 to 7. You spin it again and again. What's the chance a 5 comes up twice before either a 4 or a 6 comes up even once?",
    q(1, 9),
    "probability",
    [
      {
        label: "Ignore spins that aren't 4, 5 or 6",
        work: "they don't change anything",
        icon: "filter",
        explain: "A 1, 2, 3 or 7 just means you spin again. Only spins of 4, 5 or 6 move the race on.",
        visual: {
          type: "die-faces",
          sides: 7,
          marks: [
            { faces: [5], tone: "hit" },
            { faces: [4, 6], tone: "alt" },
          ],
        },
      },
      {
        label: "A spin that counts is a 5",
        work: "1 ÷ 3",
        result: "1/3",
        icon: "divide",
        explain: "Among 4, 5 and 6, each is equally likely, so a spin that counts is a 5 with chance 1/3.",
      },
      {
        label: "The first two spins that count are both 5s",
        work: "1/3 × 1/3",
        icon: "multiply",
        explain: "You win only if the first two spins that count are 5s. Those spins don't affect each other, so multiply.",
        visual: {
          type: "tree",
          root: {
            label: "Start",
            children: [
              { label: "5", edge: "1/3", tone: "hit", children: [{ label: "5 again", edge: "1/3", tone: "win" }, { label: "4 or 6", edge: "2/3", tone: "lose" }] },
              { label: "4 or 6", edge: "2/3", tone: "lose" },
            ],
          },
        },
      },
    ],
    {},
    {
      type: "die-faces",
      sides: 7,
      marks: [
        { faces: [5], tone: "hit" },
        { faces: [4, 6], tone: "alt" },
      ],
      caption: "Two 5s before any 4 or 6.",
    },
  ),
};

export const CLASSIC_A_PUZZLES: QuantPuzzle[] = [
  hundredSwitches,
  labellingADie,
  bubblePass,
  locksAndKeys,
  straight,
  evensBeforeOdds,
  knockoutMeet,
  bestTwoFinal,
  oddGrid,
  montyHall,
  cardAfterFirstAce,
  spinnerRace,
  lostBoardingPass,
  bertrandsBox,
];
