import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SignJWT } from "jose";
import { env } from "@/lib/env";

// Generate a short-lived token for socket authentication
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Create a short-lived token (5 minutes) for socket auth
  const secret = new TextEncoder().encode(env.AUTH_SECRET);
  const token = await new SignJWT({
    userId: session.user.id,
    username: session.user.name || "Player",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);

  return NextResponse.json({ token });
}
