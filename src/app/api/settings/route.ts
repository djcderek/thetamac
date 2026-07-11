import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { settingsRatelimit, checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const avatarSchema = z
  .string()
  .max(2_800_000, "Profile images must be smaller than 2MB.")
  .refine(
    (value) => {
      if (value === "" || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)) {
        return true;
      }
      try {
        const url = new URL(value);
        return url.protocol === "https:" && Boolean(url.hostname);
      } catch {
        return false;
      }
    },
    "Use an HTTPS image URL or a PNG, JPEG, WebP, or GIF image."
  );

const profileDataSchema = z
  .object({
    name: z.string().trim().min(1, "Display name is required.").max(80).optional(),
    image: avatarSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "No profile changes provided.");

const settingsDataSchema = z
  .object({
    autoAdvance: z.boolean().optional(),
    defaultDifficulty: z.enum(["Easy", "Medium", "Hard", "Expert"]).optional(),
    defaultTimer: z.enum(["5s", "8s", "10s", "12s", "15s", "20s", "30s"]).optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "No settings changes provided.");

const updateRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("profile"), data: profileDataSchema }),
  z.object({ type: z.literal("settings"), data: settingsDataSchema }),
]);

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    
    // Fetch user settings and user profile data
    // Try finding by ID first, then fall back to email if ID mismatch (e.g. dev DB reset)
    let user = null;
    
    if (userId) {
      user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          settings: true
        }
      });
    }

    if (!user && userEmail) {
      // Fallback to email lookup if ID not found (handles potential DB resets)
      user = await db.user.findUnique({
        where: { email: userEmail },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          settings: true
        }
      });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const storedSettings = user.settings;
    const settings = {
      autoAdvance: storedSettings?.autoAdvance ?? true,
      defaultDifficulty: ["Easy", "Medium", "Hard", "Expert"].includes(
        storedSettings?.defaultDifficulty ?? ""
      )
        ? storedSettings!.defaultDifficulty
        : "Medium",
      defaultTimer: ["5s", "8s", "10s", "12s", "15s", "20s", "30s"].includes(
        storedSettings?.defaultTimer ?? ""
      )
        ? storedSettings!.defaultTimer
        : "10s",
      theme: ["light", "dark", "system"].includes(storedSettings?.theme ?? "")
        ? storedSettings!.theme
        : "system",
    };

    return NextResponse.json({
      profile: {
        name: user.name,
        email: user.email,
        image: user.image
      },
      settings
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit by user email
    const rateLimit = await checkRateLimit(settingsRatelimit, session.user.email);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many updates. Please slow down." },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const userEmail = session.user.email;
    const body = await req.json().catch(() => null);
    const parsedBody = updateRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid settings update.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { type, data } = parsedBody.data;

    // Find user first to get correct ID (handling potential ID mismatch)
    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = user.id;

    if (type === "profile") {
      const updatedUser = await db.user.update({
        where: { id: userId },
        data,
        select: {
          name: true,
          email: true,
          image: true,
        },
      });
      return NextResponse.json({ success: true, user: updatedUser });
    } 
    
    if (type === "settings") {
      const updatedSettings = await db.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          ...data,
        },
        update: data,
      });
      return NextResponse.json({ success: true, settings: updatedSettings });
    }

    return NextResponse.json({ error: "Invalid update type" }, { status: 400 });

  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
