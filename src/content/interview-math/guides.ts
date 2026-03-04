export interface InterviewMathGuide {
  slug: string;
  title: string;
  description: string;
  primaryKeyword?: string;
  targetIntent?: "informational" | "commercial";
  lastReviewed?: string;
  conversionGoal?: "start-training" | "create-account";
  quickAnswer: string;
  whyItMatters: string[];
  drillPlan: string[];
  commonMistakes: string[];
  relatedGuides: string[];
}

export const INTERVIEW_MATH_GUIDES: InterviewMathGuide[] = [
  {
    slug: "daily-routine",
    title: "10-Minute Mental Math Interview Routine",
    description:
      "A repeatable 10-minute plan to improve interview math speed and accuracy without burnout.",
    primaryKeyword: "mental math interview routine",
    targetIntent: "informational",
    lastReviewed: "2026-03-04",
    conversionGoal: "start-training",
    quickAnswer:
      "Use a 2-6-2 format: 2 minutes warm-up, 6 minutes targeted drills, 2 minutes timed benchmark. Track accuracy and time, then repeat daily.",
    whyItMatters: [
      "Builds speed under light pressure before live interviews.",
      "Creates measurable progress with low daily time cost.",
      "Prevents random practice by forcing a structure.",
    ],
    drillPlan: [
      "Warm-up: single-digit multiplication and quick subtraction (2 min).",
      "Targeted block: percentages, averages, and 2-digit multiplication (6 min).",
      "Benchmark: 2-minute timed mixed set and record score (2 min).",
    ],
    commonMistakes: [
      "Practicing too long without a timer, which hides speed issues.",
      "Changing difficulty every day so progress is not comparable.",
      "Ignoring review notes after each benchmark.",
    ],
    relatedGuides: ["percentages-fast", "division-and-averages", "mental-math-speed-test"],
  },
  {
    slug: "percentages-fast",
    title: "How to Do Percentages Fast in Interviews",
    description:
      "Shortcut methods to calculate percentages quickly in consulting and finance interview cases.",
    primaryKeyword: "percentages mental math interview",
    targetIntent: "informational",
    lastReviewed: "2026-03-04",
    conversionGoal: "start-training",
    quickAnswer:
      "Anchor on 10%, 5%, and 1%, then combine. For growth deltas, estimate first, then refine if needed.",
    whyItMatters: [
      "Percentages appear in growth, margin, and conversion questions.",
      "Fast percentage math keeps you focused on case structure.",
      "Confidence here removes one of the biggest interview bottlenecks.",
    ],
    drillPlan: [
      "Run 15 reps of 10%, 5%, and 1% decomposition.",
      "Practice compound prompts: 18% of 250, 27% of 480, and 12.5% of 160.",
      "Finish with 2-minute timed mixed percentage questions.",
    ],
    commonMistakes: [
      "Trying to compute exact values before estimating order of magnitude.",
      "Overusing long-form multiplication for easy percentage decompositions.",
      "Forgetting whether the question asks absolute or relative change.",
    ],
    relatedGuides: ["growth-rates-and-cagr", "unit-economics-math", "rounding-and-estimation"],
  },
  {
    slug: "market-sizing-math",
    title: "Market Sizing Math: Fast Back-of-the-Envelope Calculations",
    description:
      "A practical framework for sizing markets quickly with assumptions interviewers can follow.",
    primaryKeyword: "market sizing math mental math",
    targetIntent: "informational",
    lastReviewed: "2026-03-04",
    conversionGoal: "start-training",
    quickAnswer:
      "Break the market into a simple equation, pick round assumptions, calculate in layers, and sanity-check with a second estimate.",
    whyItMatters: [
      "Market sizing is common in consulting and product interviews.",
      "Interviewers evaluate your structure and arithmetic reliability together.",
      "Clean mental math makes your assumptions easier to trust.",
    ],
    drillPlan: [
      "Write 3 market-size equations from everyday products.",
      "Solve each with rounded assumptions and one sensitivity check.",
      "Re-solve one case with tighter assumptions for comparison.",
    ],
    commonMistakes: [
      "Jumping into arithmetic before defining the equation clearly.",
      "Using too many assumptions, which increases error risk.",
      "Presenting a result without a quick reasonableness check.",
    ],
    relatedGuides: ["guesstimate-framework", "rounding-and-estimation", "business-word-problems"],
  },
  {
    slug: "guesstimate-framework",
    title: "Guesstimate Framework for Case Interviews",
    description:
      "Use this framework to move from vague prompts to clear, defendable estimates under pressure.",
    primaryKeyword: "guesstimate framework interview",
    targetIntent: "informational",
    lastReviewed: "2026-03-04",
    conversionGoal: "start-training",
    quickAnswer:
      "Define population, frequency, and price (or volume and rate), then multiply with rounded numbers and explain each assumption.",
    whyItMatters: [
      "Guesstimates test both reasoning and arithmetic communication.",
      "A reusable structure reduces panic in ambiguous prompts.",
      "It keeps your math transparent to the interviewer.",
    ],
    drillPlan: [
      "Practice the same framework on 5 unrelated guesstimates.",
      "Time each solution to 4 minutes and debrief assumptions.",
      "Track which math steps cause delays and isolate those drills.",
    ],
    commonMistakes: [
      "Treating assumptions as exact facts instead of explicit estimates.",
      "Using irregular numbers that are hard to multiply mentally.",
      "Skipping unit checks (monthly vs annual, person vs household).",
    ],
    relatedGuides: ["market-sizing-math", "mental-math-speed-test", "daily-routine"],
  },
  {
    slug: "business-word-problems",
    title: "Business Word Problems: Fast Translation to Math",
    description:
      "Turn interview word problems into simple equations quickly and accurately.",
    primaryKeyword: "business word problems interview math",
    targetIntent: "informational",
    lastReviewed: "2026-03-04",
    conversionGoal: "start-training",
    quickAnswer:
      "Translate words to variables first, choose the equation, then compute. Do not calculate before the structure is clear.",
    whyItMatters: [
      "Interview math questions are often language-heavy.",
      "Translation speed often matters more than raw calculation speed.",
      "Clear setup reduces arithmetic mistakes later in the problem.",
    ],
    drillPlan: [
      "Convert 10 prompts into equations without solving first.",
      "Solve only after equation checks are complete.",
      "Time both translation and calculation separately.",
    ],
    commonMistakes: [
      "Solving immediately and missing a hidden constraint.",
      "Confusing rates with absolute values.",
      "Forgetting to align time windows across variables.",
    ],
    relatedGuides: ["unit-economics-math", "division-and-averages", "market-sizing-math"],
  },
  {
    slug: "mental-math-speed-test",
    title: "Mental Math Speed Test for Interview Readiness",
    description:
      "A practical benchmark method to measure if your interview math is fast enough.",
    primaryKeyword: "mental math speed test interview",
    targetIntent: "commercial",
    lastReviewed: "2026-03-04",
    conversionGoal: "start-training",
    quickAnswer:
      "Run a 2-minute mixed-operation test three times weekly. Track score, accuracy, and average time; improve one variable at a time.",
    whyItMatters: [
      "Benchmarking prevents false confidence from untimed practice.",
      "Shows whether your speed is stable under pressure.",
      "Lets you detect plateaus early and adjust training.",
    ],
    drillPlan: [
      "Baseline: one 2-minute mixed set at medium difficulty.",
      "Two focused sessions on weak operation clusters.",
      "Retest under same settings and compare trends weekly.",
    ],
    commonMistakes: [
      "Changing timer and difficulty every test, invalidating comparisons.",
      "Optimizing score while accuracy collapses.",
      "Ignoring weak operation breakdowns.",
    ],
    relatedGuides: ["daily-routine", "quick-multiplication-patterns", "division-and-averages"],
  },
  {
    slug: "division-and-averages",
    title: "Division and Averages for Interviews",
    description:
      "Methods for quicker division and average calculations in case interviews.",
    primaryKeyword: "division averages mental math interview",
    targetIntent: "informational",
    lastReviewed: "2026-03-04",
    conversionGoal: "start-training",
    quickAnswer:
      "Use factor decomposition and reverse multiplication checks. For averages, estimate bounds first, then compute exact if needed.",
    whyItMatters: [
      "Division appears in utilization, productivity, and unit economics prompts.",
      "Average calculations are a frequent second-step in case math.",
      "Getting these right improves credibility in structured problem-solving.",
    ],
    drillPlan: [
      "Do 20 division reps with clean factors and mixed remainders.",
      "Practice weighted and simple averages in timed sets.",
      "Use reverse multiplication to confirm each result.",
    ],
    commonMistakes: [
      "Attempting long division when factorization is faster.",
      "Mixing weighted and simple average formulas.",
      "Skipping sanity ranges before final answer.",
    ],
    relatedGuides: ["business-word-problems", "unit-economics-math", "daily-routine"],
  },
  {
    slug: "growth-rates-and-cagr",
    title: "Growth Rates and CAGR Mental Math",
    description:
      "Fast methods to estimate growth rates and CAGR during finance and consulting interviews.",
    primaryKeyword: "cagr mental math interview",
    targetIntent: "informational",
    lastReviewed: "2026-03-04",
    conversionGoal: "start-training",
    quickAnswer:
      "For small intervals, estimate annualized growth with rules of thumb first, then refine using logarithm-free approximations when needed.",
    whyItMatters: [
      "Growth framing appears in revenue and market analysis cases.",
      "CAGR mental math separates prepared candidates from average ones.",
      "Approximation-first thinking keeps answers quick and defensible.",
    ],
    drillPlan: [
      "Practice YoY, MoM, and multi-year growth conversions.",
      "Run 10 CAGR approximations with answer bounds.",
      "Pair each estimate with a one-sentence interpretation.",
    ],
    commonMistakes: [
      "Confusing percentage-point changes with percent changes.",
      "Using exact compounding math when estimate is sufficient.",
      "Forgetting to state timeframe clearly.",
    ],
    relatedGuides: ["percentages-fast", "market-sizing-math", "rounding-and-estimation"],
  },
  {
    slug: "quick-multiplication-patterns",
    title: "Quick Multiplication Patterns for Interviews",
    description:
      "Pattern-based multiplication shortcuts for faster arithmetic in interview settings.",
    primaryKeyword: "quick multiplication interview math",
    targetIntent: "informational",
    lastReviewed: "2026-03-04",
    conversionGoal: "start-training",
    quickAnswer:
      "Use distributive breakdowns, near-base shortcuts, and factor splitting to reduce multi-step multiplication time.",
    whyItMatters: [
      "Multiplication speed often determines overall case-math pace.",
      "Pattern recognition lowers cognitive load during pressure.",
      "Reliable shortcuts reduce careless carrying errors.",
    ],
    drillPlan: [
      "Train near-base numbers (49x, 51x, 99x) in rapid sets.",
      "Alternate distributive and rounding methods for the same problems.",
      "Close with a timed mixed multiplication challenge.",
    ],
    commonMistakes: [
      "Using one method for every number shape.",
      "Over-rounding without adjusting back.",
      "Not practicing under time pressure.",
    ],
    relatedGuides: ["rounding-and-estimation", "mental-math-speed-test", "percentages-fast"],
  },
  {
    slug: "rounding-and-estimation",
    title: "Rounding and Estimation Under Interview Pressure",
    description:
      "Make faster, cleaner interview calculations using deliberate rounding and correction.",
    primaryKeyword: "rounding estimation interview math",
    targetIntent: "informational",
    lastReviewed: "2026-03-04",
    conversionGoal: "start-training",
    quickAnswer:
      "Round to friendly numbers, compute quickly, then apply a correction factor. Always declare assumptions before calculating.",
    whyItMatters: [
      "Interviewers reward clear assumptions and fast directional answers.",
      "Estimation helps when exact arithmetic is unnecessary.",
      "It reduces mental strain in long case discussions.",
    ],
    drillPlan: [
      "Take 15 awkward-number problems and solve with rounding first.",
      "Add correction steps and compare with exact results.",
      "Track average error percentage and reduce it weekly.",
    ],
    commonMistakes: [
      "Rounding both factors the same direction and biasing results.",
      "Forgetting to apply the correction factor.",
      "Not communicating that result is an estimate.",
    ],
    relatedGuides: ["market-sizing-math", "growth-rates-and-cagr", "guesstimate-framework"],
  },
  {
    slug: "unit-economics-math",
    title: "Unit Economics Math for Product and Growth Interviews",
    description:
      "Mental math patterns for CAC, payback, margin, and LTV-style interview questions.",
    primaryKeyword: "unit economics interview math",
    targetIntent: "commercial",
    lastReviewed: "2026-03-04",
    conversionGoal: "start-training",
    quickAnswer:
      "Frame each prompt as rate x volume or margin x retention, then compute with rounded assumptions and explicit units.",
    whyItMatters: [
      "Unit economics is common in PM, growth, and strategy interviews.",
      "Arithmetic errors can break otherwise strong business reasoning.",
      "Clear mental math keeps discussions focused on decisions.",
    ],
    drillPlan: [
      "Practice CAC payback and gross margin scenarios daily.",
      "Use a 3-step template: define variables, compute, sanity-check.",
      "Explain each answer in one sentence with units.",
    ],
    commonMistakes: [
      "Mixing gross and net figures.",
      "Dropping units while calculating.",
      "Ignoring sensitivity when assumptions are uncertain.",
    ],
    relatedGuides: ["business-word-problems", "division-and-averages", "percentages-fast"],
  },
  {
    slug: "brain-friendly-drill-plan",
    title: "Brain-Friendly Drill Plan to Avoid Burnout",
    description:
      "A sustainable practice plan for interview math that improves consistency without overtraining.",
    primaryKeyword: "interview math drill plan",
    targetIntent: "informational",
    lastReviewed: "2026-03-04",
    conversionGoal: "create-account",
    quickAnswer:
      "Use short, frequent sessions with recovery days. Rotate operation focus and keep one stable benchmark each week.",
    whyItMatters: [
      "Consistency beats cramming for interview performance.",
      "Burnout lowers accuracy and confidence close to interview dates.",
      "Structured rotation improves retention across operations.",
    ],
    drillPlan: [
      "Run 5 sessions/week: 3 focused + 2 mixed benchmark sessions.",
      "Use one rest day and one light review day.",
      "Log weak-point themes and repeat targeted drills weekly.",
    ],
    commonMistakes: [
      "Doing long sessions infrequently instead of short sessions consistently.",
      "Practicing only strengths and neglecting weak operations.",
      "Skipping rest and losing accuracy over time.",
    ],
    relatedGuides: ["daily-routine", "mental-math-speed-test", "division-and-averages"],
  },
];

export function getInterviewMathGuideBySlug(slug: string): InterviewMathGuide | undefined {
  return INTERVIEW_MATH_GUIDES.find((guide) => guide.slug === slug);
}
