import { NextResponse } from "next/server";
import { getCached } from "@/lib/server-cache";
import { loadSetupScoreCounts } from "@/lib/leaderboard-queries";
import { parseTimedSetup, placeRun, setupKey } from "@/lib/run-placement";

// The runs on a setup are the same for everyone; a few minutes stale changes little.
const SETUP_TTL_SECONDS = 300;
const MAX_SCORE = 1000;

/**
 * Where a timed run places among everyone's runs on the same settings. Query: difficulty,
 * operations (comma-separated), limit (seconds), score (correct answers) and, for a run that
 * was stopped, elapsed (seconds played).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const setup = parseTimedSetup({ difficulty: params.get("difficulty"), operations: params.get("operations"), timeLimitSeconds: params.get("limit") });
  const score = Number(params.get("score"));
  const elapsedParam = params.get("elapsed");
  const elapsed = elapsedParam === null ? null : Number(elapsedParam);
  if (!setup || !Number.isInteger(score) || score < 0 || score > MAX_SCORE || (elapsed !== null && !(elapsed >= 0 && elapsed <= setup.timeLimitSeconds + 30))) {
    return NextResponse.json({ error: "Invalid run" }, { status: 400 });
  }
  try {
    const { counts, players } = await getCached(`placement:${setupKey(setup)}`, SETUP_TTL_SECONDS, () => loadSetupScoreCounts(setup));
    return NextResponse.json(placeRun(counts, players, { correct: score, elapsedSeconds: elapsed, timeLimitSeconds: setup.timeLimitSeconds }));
  } catch (error) {
    console.error("Error placing training run:", error);
    return NextResponse.json({ error: "Failed to place run" }, { status: 500 });
  }
}
