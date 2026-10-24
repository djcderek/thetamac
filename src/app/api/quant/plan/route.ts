import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadMockPlan } from "@/lib/quant/plan-server";

export const dynamic = "force-dynamic";

/** The plan from the latest mock, or null before a mock or after a perfect one. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ plan: await loadMockPlan(session.user.id) });
  } catch (error) {
    console.error("Error loading quant plan:", error);
    return NextResponse.json({ error: "Failed to load plan" }, { status: 500 });
  }
}
