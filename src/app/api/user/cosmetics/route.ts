import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export interface UserCosmetics {
  equippedSkin: string | null;
  equippedTrail: string | null;
  equippedVehicle: string | null;
  equippedWheel: string | null;
}

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all equipped items for this user
    const equippedItems = await db.userItem.findMany({
      where: {
        userId,
        isEquipped: true,
      },
      include: {
        item: {
          select: {
            type: true,
            assetId: true,
          },
        },
      },
    });

    // Map to cosmetics object
    const cosmetics: UserCosmetics = {
      equippedSkin: null,
      equippedTrail: null,
      equippedVehicle: null,
      equippedWheel: null,
    };

    for (const userItem of equippedItems) {
      switch (userItem.item.type) {
        case "skin":
          cosmetics.equippedSkin = userItem.item.assetId;
          break;
        case "trail":
          cosmetics.equippedTrail = userItem.item.assetId;
          break;
        case "vehicle":
          cosmetics.equippedVehicle = userItem.item.assetId;
          break;
        case "wheel":
          cosmetics.equippedWheel = userItem.item.assetId;
          break;
      }
    }

    return NextResponse.json(cosmetics);
  } catch (error) {
    console.error("User Cosmetics API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

