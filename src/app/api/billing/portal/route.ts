import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { env } from "@/lib/env";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/stats/performance`,
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



