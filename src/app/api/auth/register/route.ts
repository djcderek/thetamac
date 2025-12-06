import { NextResponse } from "next/server";

/**
 * Username/password registration has been removed.
 * We keep the route to return a clear response if it is called.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Password sign-ups are disabled. Please continue with Google.",
    },
    { status: 410 }
  );
}