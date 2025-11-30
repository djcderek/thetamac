"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag, Check, Coins } from "lucide-react";
import ItemPreview3D from "./item-preview-3d";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: string;
  assetId: string;
  isProOnly: boolean;
}

interface ShopData {
  items: ShopItem[];
  userCoins: number;
  ownedItemIds: string[];
  equippedSkinId: string | null;
  equippedTrailId: string | null;
  equippedVehicleId: string | null;
}

export function ShopDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ShopData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchShop();
  }, []);

  const fetchShop = async () => {
    try {
      const res = await fetch("/api/shop");
      if (!res.ok) throw new Error("Failed to fetch shop");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (itemId: string) => {
    setActionLoading(itemId);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to buy item");
        return;
      }

      const json = await res.json();
      // Update local state
      setData((prev) => prev ? {
        ...prev,
        userCoins: json.coins,
        ownedItemIds: [...prev.ownedItemIds, itemId],
      } : null);
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEquip = async (itemId: string, type: string, action: "equip" | "unequip") => {
    setActionLoading(itemId);
    try {
      const res = await fetch("/api/shop/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to equip item");
        return;
      }

      // Update local state
      setData((prev) => {
        if (!prev) return null;
        const isSkin = type === "skin";
        const isVehicle = type === "vehicle";
        return {
          ...prev,
          equippedSkinId: isSkin ? (action === "equip" ? itemId : null) : prev.equippedSkinId,
          equippedTrailId: (!isSkin && !isVehicle) ? (action === "equip" ? itemId : null) : prev.equippedTrailId,
          equippedVehicleId: isVehicle ? (action === "equip" ? itemId : null) : prev.equippedVehicleId,
        };
      });
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!data || !data.items) return <div>Failed to load shop. Please try again later.</div>;

  const ownedItems = data.items.filter(i => data.ownedItemIds.includes(i.id));
  const shopItems = data.items.filter(i => !data.ownedItemIds.includes(i.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Item Shop</h2>
            <p className="text-muted-foreground">Customize your racing vehicle</p>
        </div>
        <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg">
            <Coins className="w-5 h-5 text-yellow-500" />
            <span className="font-bold text-lg">{data.userCoins}</span>
        </div>
      </div>

      <Tabs defaultValue="shop" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="shop">Shop</TabsTrigger>
          <TabsTrigger value="inventory">My Garage</TabsTrigger>
        </TabsList>
        
        <TabsContent value="shop" className="mt-6">
          {shopItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">You own everything! Check your garage.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shopItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className={`h-32 bg-muted flex items-center justify-center relative overflow-hidden ${item.type === 'skin' ? 'bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/20 dark:to-indigo-900/20' : item.type === 'vehicle' ? 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20' : 'bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20'}`}>
                    <div className="absolute inset-0">
                      <ItemPreview3D type={item.type as "skin" | "trail" | "vehicle"} assetId={item.assetId} />
                    </div>
                  </div>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>{item.name}</CardTitle>
                        {item.isProOnly && <Badge variant="secondary" className="bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 border-0">PRO</Badge>}
                    </div>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button 
                        className="w-full gap-2" 
                        onClick={() => handleBuy(item.id)}
                        disabled={actionLoading === item.id || data.userCoins < item.cost}
                    >
                        {actionLoading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                        Buy for {item.cost}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="inventory" className="mt-6">
            {ownedItems.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="overflow-hidden border-primary ring-1 ring-primary">
                        <div className="h-32 bg-muted flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0">
                                <ItemPreview3D type="base" />
                            </div>
                        </div>
                        <CardHeader>
                            <CardTitle>Base Vehicle</CardTitle>
                            <CardDescription>Standard issued racing vehicle</CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Button variant="secondary" className="w-full gap-2" disabled>
                                <Check className="w-4 h-4" />
                                Equipped
                            </Button>
                        </CardFooter>
                    </Card>
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        You don't own any custom items yet. Visit the shop to upgrade!
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ownedItems.map((item) => {
                    let isEquipped = false;
                    if (item.type === 'skin') isEquipped = data.equippedSkinId === item.id;
                    if (item.type === 'trail') isEquipped = data.equippedTrailId === item.id;
                    if (item.type === 'vehicle') isEquipped = data.equippedVehicleId === item.id;

                    return (
                        <Card key={item.id} className={`overflow-hidden ${isEquipped ? 'border-primary ring-1 ring-primary' : ''}`}>
                        <div className={`h-32 bg-muted flex items-center justify-center relative overflow-hidden ${item.type === 'skin' ? 'bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/20 dark:to-indigo-900/20' : item.type === 'vehicle' ? 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20' : 'bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20'}`}>
                            <div className="absolute inset-0">
                                <ItemPreview3D type={item.type as "skin" | "trail" | "vehicle"} assetId={item.assetId} />
                            </div>
                        </div>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>{item.name}</CardTitle>
                                {item.isProOnly && <Badge variant="secondary" className="bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 border-0">PRO</Badge>}
                            </div>
                            <CardDescription>{item.description}</CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Button 
                                variant={isEquipped ? "secondary" : "default"}
                                className="w-full gap-2" 
                                onClick={() => handleEquip(item.id, item.type, isEquipped ? "unequip" : "equip")}
                                disabled={actionLoading === item.id}
                            >
                                {actionLoading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEquipped ? <Check className="w-4 h-4" /> : null)}
                                {isEquipped ? "Equipped" : "Equip"}
                            </Button>
                        </CardFooter>
                        </Card>
                    );
                })}
                </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
