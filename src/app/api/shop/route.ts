import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { shopRatelimit, checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { getPostHogClient } from "@/lib/posthog-server";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    // Ensure db.shopItem exists
    if (!db.shopItem) {
        console.error("Prisma client stale: db.shopItem is undefined");
        throw new Error("Database client not initialized correctly");
    }

    const items = await db.shopItem.findMany({
      orderBy: { cost: "asc" },
    });

    // If user is logged in, fetch their owned items
    let userItems: string[] = [];
    let userCoins = 0;
    let equippedSkinId: string | null = null;
    let equippedTrailId: string | null = null;
    let equippedVehicleId: string | null = null;
    let equippedWheelId: string | null = null;

    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          items: {
            where: { isEquipped: true }, // Fetch equipped to determine status
            include: {
              item: true,
            }
          },
        },
      });

      if (user) {
        userCoins = user.coins;
        
        // Fetch all owned item IDs
        const owned = await db.userItem.findMany({
          where: { userId },
          select: { itemId: true, isEquipped: true, item: { select: { type: true } } },
        });
        
        userItems = owned.map((ui) => ui.itemId);
        
        // Determine equipped items
        const equippedSkin = user.items.find(i => i.item.type === 'skin');
        const equippedTrail = user.items.find(i => i.item.type === 'trail');
        const equippedVehicle = user.items.find(i => i.item.type === 'vehicle');
        const equippedWheel = user.items.find(i => i.item.type === 'wheel');
        
        if (equippedSkin) equippedSkinId = equippedSkin.itemId;
        if (equippedTrail) equippedTrailId = equippedTrail.itemId;
        if (equippedVehicle) equippedVehicleId = equippedVehicle.itemId;
        if (equippedWheel) equippedWheelId = equippedWheel.itemId;
      }
    }

    return NextResponse.json({
      items,
      userCoins,
      ownedItemIds: userItems,
      equippedSkinId,
      equippedTrailId,
      equippedVehicleId,
      equippedWheelId,
    });
  } catch (error) {
    console.error("Shop API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const buySchema = z.object({
  itemId: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit by user ID
    const rateLimit = await checkRateLimit(shopRatelimit, session.user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many purchase attempts. Please slow down." },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const body = await req.json();
    const { itemId } = buySchema.parse(body);

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, coins: true, isPremium: true, subscriptionStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const item = await db.shopItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Check if user already owns it
    const existing = await db.userItem.findUnique({
      where: {
        userId_itemId: {
          userId: user.id,
          itemId: item.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Already owned" }, { status: 400 });
    }

    // Check Pro requirement
    const isPremium = user.isPremium || ["active", "trialing"].includes(user.subscriptionStatus || "");
    
    if (item.isProOnly && !isPremium) {
      return NextResponse.json({ error: "This item requires a Pro subscription" }, { status: 403 });
    }

    // Check funds
    if (user.coins < item.cost) {
      return NextResponse.json({ error: "Insufficient funds" }, { status: 400 });
    }

    // Transaction: Deduct coins, add item
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { coins: { decrement: item.cost } },
      }),
      db.userItem.create({
        data: {
          userId: user.id,
          itemId: item.id,
        },
      }),
    ]);

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: "shop_item_purchased",
      properties: {
        item_id: item.id,
        item_name: item.name,
        item_type: item.type,
        item_cost: item.cost,
        coins_remaining: user.coins - item.cost,
      },
    });
    await posthog.flush();

    return NextResponse.json({ success: true, coins: user.coins - item.cost });
  } catch (error) {
    console.error("Shop Buy Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
