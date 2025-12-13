import "server-only";

import { randomUUID } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

export const GUEST_COOKIE_NAME = "thetamac_guest";
export const GUEST_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type GuestTokenPayload = {
  guestId: string;
  guestName: string;
  isGuest: true;
  v: 1;
};

export function createGuestName() {
  const adjectives = [
    "Swift",
    "Brave",
    "Clever",
    "Calm",
    "Bold",
    "Sharp",
    "Quick",
    "Bright",
    "Steady",
    "Wild",
  ];
  const animals = [
    "Fox",
    "Hawk",
    "Otter",
    "Tiger",
    "Panda",
    "Koala",
    "Raven",
    "Wolf",
    "Lynx",
    "Dolphin",
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  return `Guest ${adj}${animal}${suffix}`;
}

export function createGuestIdentity() {
  return {
    guestId: randomUUID(),
    guestName: createGuestName(),
  };
}

export async function signGuestToken(payload: GuestTokenPayload) {
  const secret = new TextEncoder().encode(env.AUTH_SECRET);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${GUEST_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyGuestToken(token: string): Promise<GuestTokenPayload | null> {
  try {
    const secret = new TextEncoder().encode(env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (
      typeof payload !== "object" ||
      typeof payload.guestId !== "string" ||
      typeof payload.guestName !== "string" ||
      payload.isGuest !== true
    ) {
      return null;
    }

    return {
      guestId: payload.guestId,
      guestName: payload.guestName,
      isGuest: true,
      v: typeof payload.v === "number" ? (payload.v as 1) : 1,
    };
  } catch {
    return null;
  }
}


