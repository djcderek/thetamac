import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { settingsRatelimit, checkRateLimit } from "@/lib/rate-limit";

const featureRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(5, "Please add a bit more detail.")
    .max(2000, "Please keep it under 2000 characters."),
});

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(settingsRatelimit, session.user.email);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = featureRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: rateLimit.headers }
      );
    }

    // Prisma would normally generate cuid() client-side.
    // We generate a unique string here so we can insert safely without requiring a regenerated Prisma client.
    const id = globalThis.crypto.randomUUID();
    const userId = session.user.id ?? null;
    const email = session.user.email;
    const message = parsed.data.message;

    const rows = await db.$queryRaw<Array<{ id: string; createdAt: Date }>>(Prisma.sql`
      INSERT INTO "feature_requests" ("id", "userId", "email", "message", "createdAt")
      VALUES (${id}, ${userId}, ${email}, ${message}, CURRENT_TIMESTAMP)
      RETURNING "id", "createdAt";
    `);

    return NextResponse.json(
      {
        success: true,
        featureRequest: {
          id: rows[0]?.id ?? id,
          createdAt: rows[0]?.createdAt ?? new Date(),
        },
      },
      { headers: rateLimit.headers }
    );
  } catch (error) {
    console.error("Error creating feature request:", error);
    return NextResponse.json({ error: "Failed to submit feature request" }, { status: 500 });
  }
}
