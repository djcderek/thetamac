import { NextResponse } from "next/server";
import { getTrainingDistribution } from "@/lib/training-distribution";

export async function GET() {
  try {
    const result = await getTrainingDistribution();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error building training score distribution:", error);
    return NextResponse.json(
      { error: "Failed to load distribution" },
      { status: 500 }
    );
  }
}
