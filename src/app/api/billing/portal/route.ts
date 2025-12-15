import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { env } from "@/lib/env";

function normalizeReturnPath(
  baseUrl: string,
  returnUrl: unknown
): string | null {
  if (typeof returnUrl !== "string") return null;
  const trimmed = returnUrl.trim();
  if (!trimmed) return null;

  // Allow same-origin absolute URLs
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      const base = new URL(baseUrl);
      if (parsed.origin !== base.origin) return null;
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  }

  // Allow only relative paths to prevent open redirects.
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  return trimmed;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let returnPath: string | null = null;
    try {
      const body = await request.json();
      returnPath = normalizeReturnPath(env.NEXT_PUBLIC_APP_URL, body?.returnUrl);
    } catch {
      returnPath = null;
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        stripeCustomerId: true,
      },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found." },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    const baseUrl = env.NEXT_PUBLIC_APP_URL;
    // Backwards-compatible default: return to stats if no explicit returnUrl.
    const resolvedReturnPath = returnPath ?? "/stats/performance";

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: new URL(resolvedReturnPath, baseUrl).toString(),
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    return NextResponse.json(
      { error: "Unable to open billing portal." },
      { status: 500 }
    );
  }
}



