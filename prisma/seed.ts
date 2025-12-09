import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_ITEMS: Array<{
  name: string;
  description: string;
  cost: number;
  type: string;
  assetId: string;
  isProOnly: boolean;
}> = [
  // Original Items
  {
    name: "Red Racer",
    description: "A classic red racing car skin.",
    cost: 150,
    type: "skin",
    assetId: "car_red",
    isProOnly: false,
  },
  {
    name: "Blue Streak",
    description: "A sleek blue racing car skin.",
    cost: 150,
    type: "skin",
    assetId: "car_blue",
    isProOnly: false,
  },
  {
    name: "Golden Glory",
    description: "A luxurious golden car skin for champions.",
    cost: 400,
    type: "skin",
    assetId: "car_gold",
    isProOnly: false,
  },
  {
    name: "Fire Trail",
    description: "Leave a trail of fire behind you.",
    cost: 220,
    type: "trail",
    assetId: "trail_fire",
    isProOnly: false,
  },
  {
    name: "Neon Trail",
    description: "A futuristic neon trail.",
    cost: 260,
    type: "trail",
    assetId: "trail_neon",
    isProOnly: false,
  },
  // New Boosts (Trails)
  {
    name: "Pixel Stream",
    description: "A retro 8-bit pixelated trail.",
    cost: 320,
    type: "trail",
    assetId: "trail_pixel",
    isProOnly: false,
  },
  {
    name: "Lightning Strike",
    description: "Shock the competition with electric sparks.",
    cost: 450,
    type: "trail",
    assetId: "trail_lightning",
    isProOnly: true,
  },
  {
    name: "Rainbow Road",
    description: "Leave a colorful spectrum behind you.",
    cost: 900,
    type: "trail",
    assetId: "trail_rainbow",
    isProOnly: true,
  },
  // New Complex Skins
  {
    name: "Galactic Void",
    description: "Race through the stars with this cosmic skin.",
    cost: 650,
    type: "skin",
    assetId: "skin_galactic",
    isProOnly: false,
  },
  {
    name: "Cyber Glitch",
    description: "Tear through the matrix.",
    cost: 550,
    type: "skin",
    assetId: "skin_glitch",
    isProOnly: true,
  },
  {
    name: "Magma Flow",
    description: "Hotter than the competition.",
    cost: 500,
    type: "skin",
    assetId: "skin_lava",
    isProOnly: false,
  },
  {
    name: "Ice Crystal",
    description: "Stay cool under pressure.",
    cost: 450,
    type: "skin",
    assetId: "skin_ice",
    isProOnly: true,
  },
  {
    name: "Rainbow Rush",
    description: "Taste the speed.",
    cost: 480,
    type: "skin",
    assetId: "skin_rainbow",
    isProOnly: true,
  },
  // New Pro Vehicles
  {
    name: "The Beast",
    description: "A heavy-duty pickup for rough tracks.",
    cost: 850,
    type: "vehicle",
    assetId: "car_truck",
    isProOnly: false,
  },
  {
    name: "Offroad King",
    description: "Conquer any terrain.",
    cost: 750,
    type: "vehicle",
    assetId: "car_jeep",
    isProOnly: true,
  },
  {
    name: "Velocity X",
    description: "Aerodynamic perfection.",
    cost: 1150,
    type: "vehicle",
    assetId: "car_sport",
    isProOnly: true,
  },
  // New Wheels Category
  {
    name: "Standard Rims",
    description: "Reliable and classic.",
    cost: 120,
    type: "wheel",
    assetId: "wheel_standard",
    isProOnly: false,
  },
  {
    name: "Chrome Spinners",
    description: "Keep spinning even when you stop.",
    cost: 380,
    type: "wheel",
    assetId: "wheel_spinner",
    isProOnly: false,
  },
  {
    name: "Offroad Knobbys",
    description: "Deep treads for maximum grip.",
    cost: 260,
    type: "wheel",
    assetId: "wheel_offroad",
    isProOnly: false,
  },
  {
    name: "Future Discs",
    description: "Glowing neon discs from 2077.",
    cost: 700,
    type: "wheel",
    assetId: "wheel_future",
    isProOnly: true,
  },
];

async function seedShopItems() {
  for (const item of DEFAULT_ITEMS) {
    const existing = await prisma.shopItem.findFirst({
      where: { assetId: item.assetId },
    });

    if (!existing) {
      await prisma.shopItem.create({ data: item });
      continue;
    }

    await prisma.shopItem.update({
      where: { id: existing.id },
      data: {
        name: item.name,
        description: item.description,
        cost: item.cost,
        type: item.type,
        assetId: item.assetId,
        isProOnly: item.isProOnly,
      },
    });
  }
}

async function main() {
  await seedShopItems();
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
