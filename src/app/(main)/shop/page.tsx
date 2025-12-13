import { Metadata } from "next";
import { ShopDashboard } from "@/components/shop/shop-dashboard";

export const metadata: Metadata = {
  title: "Shop | thetamac",
  description: "Purchase and equip cosmetic items for your racing vehicle.",
};

export default function ShopPage() {
  return (
    <div className="h-full p-8">
      <ShopDashboard />
    </div>
  );
}

