import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  GUEST_COOKIE_NAME,
  GUEST_TOKEN_TTL_SECONDS,
  type GuestTokenPayload,
  createGuestIdentity,
  signGuestToken,
  verifyGuestToken,
} from "@/lib/guest";

async function readGuestCookie(): Promise<GuestTokenPayload | null> {
  const token = (await cookies()).get(GUEST_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifyGuestToken(token);
}

export async function GET() {
  const existing = await readGuestCookie();
  if (existing) {
    return NextResponse.json({ guest: { id: existing.guestId, name: existing.guestName } });
  }

  const { guestId, guestName } = createGuestIdentity();
  const token = await signGuestToken({ guestId, guestName, isGuest: true, v: 1 });

  const res = NextResponse.json({ guest: { id: guestId, name: guestName } });
  res.cookies.set(GUEST_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_TOKEN_TTL_SECONDS,
  });

  return res;
}


