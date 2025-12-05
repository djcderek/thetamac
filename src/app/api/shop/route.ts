import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Lazy seeding of shop items
const DEFAULT_ITEMS = [
  // Original Items
  {
    name: "Red Racer",
    description: "A classic red racing car skin.",
    cost: 0,
    type: "skin",
    assetId: "car_red",
    isProOnly: false,
  },
  {
    name: "Blue Streak",
    description: "A sleek blue racing car skin.",
    cost: 0,
    type: "skin",
    assetId: "car_blue",
    isProOnly: false,
  },
  {
    name: "Golden Glory",
    description: "A luxurious golden car skin for champions.",
    cost: 0,
    type: "skin",
    assetId: "car_gold",
    isProOnly: false,
  },
  {
    name: "Fire Trail",
    description: "Leave a trail of fire behind you.",
    cost: 0,
    type: "trail",
    assetId: "trail_fire",
    isProOnly: false,
  },
  {
    name: "Neon Trail",
    description: "A futuristic neon trail.",
    cost: 0,
    type: "trail",
    assetId: "trail_neon",
    isProOnly: false,
  },
  // New Boosts (Trails)
  {
    name: "Pixel Stream",
    description: "A retro 8-bit pixelated trail.",
    cost: 0,
    type: "trail",
    assetId: "trail_pixel",
    isProOnly: false,
  },
  {
    name: "Lightning Strike",
    description: "Shock the competition with electric sparks.",
    cost: 0,
    type: "trail",
    assetId: "trail_lightning",
    isProOnly: false,
  },
  {
    name: "Rainbow Road",
    description: "Leave a colorful spectrum behind you.",
    cost: 0,
    type: "trail",
    assetId: "trail_rainbow",
    isProOnly: true,
  },
  // New Complex Skins
  {
    name: "Galactic Void",
    description: "Race through the stars with this cosmic skin.",
    cost: 0,
    type: "skin",
    assetId: "skin_galactic",
    isProOnly: false,
  },
  {
    name: "Cyber Glitch",
    description: "Tear through the matrix.",
    cost: 0,
    type: "skin",
    assetId: "skin_glitch",
    isProOnly: false,
  },
  {
    name: "Magma Flow",
    description: "Hotter than the competition.",
    cost: 0,
    type: "skin",
    assetId: "skin_lava",
    isProOnly: false,
  },
  {
    name: "Ice Crystal",
    description: "Stay cool under pressure.",
    cost: 0,
    type: "skin",
    assetId: "skin_ice",
    isProOnly: false,
  },
  {
    name: "Rainbow Rush",
    description: "Taste the speed.",
    cost: 0,
    type: "skin",
    assetId: "skin_rainbow",
    isProOnly: false,
  },
  // New Pro Vehicles
  {
    name: "The Beast",
    description: "A heavy-duty pickup for rough tracks.",
    cost: 0,
    type: "vehicle",
    assetId: "car_truck",
    isProOnly: false,
  },
  {
    name: "Offroad King",
    description: "Conquer any terrain.",
    cost: 0,
    type: "vehicle",
    assetId: "car_jeep",
    isProOnly: false,
  },
  {
    name: "Velocity X",
    description: "Aerodynamic perfection.",
    cost: 0,
    type: "vehicle",
    assetId: "car_sport",
    isProOnly: false,
  },
  // New Wheels Category
  {
    name: "Standard Rims",
    description: "Reliable and classic.",
    cost: 0,
    type: "wheel",
    assetId: "wheel_standard",
    isProOnly: false,
  },
  {
    name: "Chrome Spinners",
    description: "Keep spinning even when you stop.",
    cost: 0,
    type: "wheel",
    assetId: "wheel_spinner",
    isProOnly: false,
  },
  {
    name: "Offroad Knobbys",
    description: "Deep treads for maximum grip.",
    cost: 0,
    type: "wheel",
    assetId: "wheel_offroad",
    isProOnly: false,
  },
  {
    name: "Future Discs",
    description: "Glowing neon discs from 2077.",
    cost: 0,
    type: "wheel",
    assetId: "wheel_future",
    isProOnly: true,
  },
];

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    // Ensure db.shopItem exists
    if (!db.shopItem) {
        console.error("Prisma client stale: db.shopItem is undefined");
        throw new Error("Database client not initialized correctly");
    }

    // Sync default items (create if missing, update cost if different)
    for (const item of DEFAULT_ITEMS) {
      const existing = await db.shopItem.findFirst({
        where: { assetId: item.assetId },
      });

      if (!existing) {
        await db.shopItem.create({
          data: item,
        });
      } else if (existing.cost !== item.cost || existing.isProOnly !== item.isProOnly) {
        await db.shopItem.update({
          where: { id: existing.id },
          data: { 
            cost: item.cost,
            isProOnly: item.isProOnly 
          },
        });
      }
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

    return NextResponse.json({ success: true, coins: user.coins - item.cost });
  } catch (error) {
    console.error("Shop Buy Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
