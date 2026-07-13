import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureServerAnalyticsEvent } from "@/lib/posthog-server";

const equipSchema = z.object({
  itemId: z.string(),
  action: z.enum(["equip", "unequip"]),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { itemId, action } = equipSchema.parse(body);

    const userItem = await db.userItem.findUnique({
      where: {
        userId_itemId: {
          userId: session.user.id,
          itemId,
        },
      },
      include: {
        item: true,
      },
    });

    if (!userItem) {
      return NextResponse.json({ error: "Item not owned" }, { status: 404 });
    }

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { isPremium: true, subscriptionStatus: true }
    });
    
    const isPremium = user?.isPremium || ["active", "trialing"].includes(user?.subscriptionStatus || "");

    if (userItem.item.isProOnly && !isPremium) {
         return NextResponse.json({ error: "This item requires a Pro subscription to use" }, { status: 403 });
    }

    if (action === "equip") {
      // Find items of same type currently equipped
      const itemsOfType = await db.userItem.findMany({
        where: {
          userId: session.user.id,
          isEquipped: true,
          item: {
            type: userItem.item.type
          }
        }
      });
      
      const idsToUnequip = itemsOfType.map(i => i.id);
      
      await db.$transaction([
        db.userItem.updateMany({
          where: {
            id: { in: idsToUnequip }
          },
          data: { isEquipped: false }
        }),
        db.userItem.update({
          where: { id: userItem.id },
          data: { isEquipped: true }
        })
      ]);
    } else {
      // Unequip
      await db.userItem.update({
        where: { id: userItem.id },
        data: { isEquipped: false },
      });
    }

    await captureServerAnalyticsEvent({
      distinctId: session.user.id,
      event: ANALYTICS_EVENTS.shopItemEquipped,
      properties: {
        item_id: userItem.item.id,
        item_type: userItem.item.type,
        action,
        surface: "shop",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Shop Equip Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
