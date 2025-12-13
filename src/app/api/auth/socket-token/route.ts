import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SignJWT } from "jose";
import { env } from "@/lib/env";
import { cookies } from "next/headers";
import { GUEST_COOKIE_NAME, verifyGuestToken } from "@/lib/guest";

// Generate a short-lived token for socket authentication
export async function GET() {
  const session = await auth();

  let userId: string | null = session?.user?.id ?? null;
  let username: string | null = (typeof session?.user?.name === "string" && session.user.name) || null;
  let isGuest = false;

  if (!userId) {
    const guestCookie = (await cookies()).get(GUEST_COOKIE_NAME)?.value;
    const guest = guestCookie ? await verifyGuestToken(guestCookie) : null;

    if (!guest) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = guest.guestId;
    username = guest.guestName;
    isGuest = true;
  }

  // Create a short-lived token (5 minutes) for socket auth
  const secret = new TextEncoder().encode(env.AUTH_SECRET);
  const token = await new SignJWT({
    userId,
    username: username || "Player",
    isGuest,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);

  return NextResponse.json({
    token,
    isGuest,
    userId,
    username: username || "Player",
  });
}
