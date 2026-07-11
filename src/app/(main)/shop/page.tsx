import type { Metadata } from "next";
import { ShopDashboard } from "@/components/shop/shop-dashboard";

export const metadata: Metadata = {
  title: "Shop",
  description: "Purchase and equip cosmetic items for your racing vehicle.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ShopPage() {
  return (
    <div className="min-h-screen">
      <ShopDashboard />
    </div>
  );
}

