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
  workedExample?: {
    title: string;
    prompt: string;
    steps: string[];
    answer: string;
    takeaway: string;
  };
  practicePrompts?: string[];
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
    lastReviewed: "2026-07-10",
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
    workedExample: {
      title: "Translate a utilization prompt before calculating",
      prompt:
        "A 24-person support team resolves 18 tickets per person each workday. If 75% of the team is scheduled tomorrow, how many tickets should the team plan to resolve?",
      steps: [
        "Scheduled agents = 24 × 75% = 24 × 3/4 = 18.",
        "Tickets per scheduled day = 18 agents × 18 tickets per agent.",
        "Compute 18 × 18 as (20 × 18) − (2 × 18) = 360 − 36 = 324.",
      ],
      answer: "The team should plan for 324 tickets.",
      takeaway:
        "Turn the wording into a rate × people equation first; only then choose the fastest arithmetic shortcut.",
    },
    practicePrompts: [
      "A store sells 240 units per week at a 35% gross margin. Write the equation for weekly gross profit before solving it.",
      "A delivery route is 80% complete after 36 stops. How many stops are planned in total? State the equation first.",
      "A company cuts a $1.2M annual cost by 15%. Express the monthly savings with units.",
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
    lastReviewed: "2026-07-10",
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
    workedExample: {
      title: "Turn a benchmark into a focused practice decision",
      prompt:
        "In a two-minute mixed test, you solve 30 problems at 90% accuracy. Multiplication takes 5 seconds on average, while the other operations average 3 seconds. What should the next focused session target?",
      steps: [
        "Keep the benchmark settings fixed: the 30-problem result is the baseline, not a reason to change every variable at once.",
        "Accuracy is already at the 90% floor, so do not trade accuracy away for speed.",
        "Multiplication is the clear time outlier at 5 seconds versus 3 seconds, so isolate it in the next practice block.",
      ],
      answer: "Run a multiplication-focused session, then repeat the same mixed benchmark to compare like with like.",
      takeaway:
        "A speed test is useful only when it produces one specific training decision and the next retest uses the same conditions.",
    },
    practicePrompts: [
      "Record a two-minute baseline with total solved, accuracy, and average time before changing difficulty.",
      "After a benchmark, name the one operation with the slowest average time and create a 10-problem focused set.",
      "Compare two weekly results only when timer, difficulty, and operation mix match.",
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
    lastReviewed: "2026-07-10",
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
    workedExample: {
      title: "Use a near-base shortcut for 49 × 18",
      prompt: "Calculate 49 × 18 without long multiplication.",
      steps: [
        "Treat 49 as 50 − 1, so 49 × 18 = (50 × 18) − 18.",
        "Compute 50 × 18 = 900.",
        "Subtract 18: 900 − 18 = 882.",
      ],
      answer: "49 × 18 = 882.",
      takeaway:
        "When one factor sits next to a friendly base such as 50, 100, or 25, adjust from the easy product instead of multiplying every digit.",
    },
    practicePrompts: [
      "Solve 51 × 24 by adjusting from 50 × 24.",
      "Solve 98 × 17 by adjusting from 100 × 17.",
      "Solve 25 × 36 by using one quarter of 100 × 36.",
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
    lastReviewed: "2026-07-10",
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
    workedExample: {
      title: "Build a sustainable five-session week",
      prompt:
        "You have 10 minutes on weekdays and tend to lose accuracy after long sessions. How should you structure one week of interview-math practice?",
      steps: [
        "Use Monday, Wednesday, and Friday for one focused 10-minute operation block each.",
        "Use Tuesday and Thursday for the same two-minute mixed benchmark plus a short review of the slowest operation.",
        "Keep Saturday as light review or rest and Sunday fully off, then compare only the Tuesday and Thursday benchmarks.",
      ],
      answer: "Use three focused sessions, two repeatable benchmarks, and two recovery days rather than five long mixed sessions.",
      takeaway:
        "Consistency improves retention; a repeatable benchmark gives feedback without turning every practice session into a test.",
    },
    practicePrompts: [
      "Choose one operation for each of three focused sessions this week and define a 10-minute stopping point.",
      "Write the fixed settings for your two weekly mixed benchmarks.",
      "After one week, note whether speed or accuracy changed before adding more volume.",
    ],
    relatedGuides: ["daily-routine", "mental-math-speed-test", "division-and-averages"],
  },
];

export function getInterviewMathGuideBySlug(slug: string): InterviewMathGuide | undefined {
  return INTERVIEW_MATH_GUIDES.find((guide) => guide.slug === slug);
}
