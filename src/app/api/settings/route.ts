import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      console.log("GET /api/settings: Unauthorized - No session user email");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    console.log(`GET /api/settings: Fetching settings for user ${userId} (${userEmail})`);
    
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
      console.log(`GET /api/settings: User ID ${userId} not found, trying email ${userEmail}`);
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
      console.log(`GET /api/settings: User not found in DB`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("GET /api/settings: Found user", { 
      name: user.name, 
      email: user.email, 
      hasImage: !!user.image 
    });

    // If settings don't exist, return defaults
    const settings = user.settings || {
      soundEnabled: true,
      notificationsEnabled: true,
      autoAdvance: true,
      defaultDifficulty: "Medium",
      defaultTimer: "10s",
      theme: "system"
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

    const userEmail = session.user.email;
    const body = await req.json();
    const { type, data } = body;

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
      const updateData: {
        name?: string;
        image?: string;
      } = {};

      if (data && typeof data.name === "string") {
        updateData.name = data.name;
      }

      if (data && typeof data.image === "string") {
        updateData.image = data.image;
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: "No valid profile fields provided" },
          { status: 400 }
        );
      }

      const updatedUser = await db.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          name: true,
          email: true,
          image: true,
        },
      });
      return NextResponse.json({ success: true, user: updatedUser });
    } 
    
    if (type === "settings") {
      // Update or create user settings
      const updatedSettings = await db.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          ...data
        },
        update: {
          ...data
        }
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
