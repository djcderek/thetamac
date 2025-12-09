"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag, Check, Coins } from "lucide-react";
import ItemPreview3D from "./item-preview-3d";
import { GarageDisplay } from "./garage-display";
import { ThreeErrorBoundary } from "@/components/ui/three-error-boundary";

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
  equippedWheelId: string | null;
}

export function ShopDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ShopData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [garageCategory, setGarageCategory] = useState<string>("vehicle");

  useEffect(() => {
    fetchShop();
  }, []);

  const fetchShop = async () => {
    try {
      setError(null);
      const res = await fetch("/api/shop");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch shop");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Shop fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load shop");
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
        const isWheel = type === "wheel";
        const isTrail = type === "trail";
        return {
          ...prev,
          equippedSkinId: isSkin ? (action === "equip" ? itemId : null) : prev.equippedSkinId,
          equippedTrailId: isTrail ? (action === "equip" ? itemId : null) : prev.equippedTrailId,
          equippedVehicleId: isVehicle ? (action === "equip" ? itemId : null) : prev.equippedVehicleId,
          equippedWheelId: isWheel ? (action === "equip" ? itemId : null) : prev.equippedWheelId,
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

  if (error || !data || !data.items) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="text-muted-foreground">{error || "Failed to load shop. Please try again later."}</div>
        <Button variant="outline" onClick={() => { setLoading(true); fetchShop(); }}>
          Try Again
        </Button>
      </div>
    );
  }

  const shopItems = data.items.filter(i => !data.ownedItemIds.includes(i.id));
  
  // Helper to get currently equipped assets
  const getEquippedItem = (type: string) => {
      if (type === 'vehicle') return data.items.find(i => i.id === data.equippedVehicleId);
      if (type === 'skin') return data.items.find(i => i.id === data.equippedSkinId);
      if (type === 'trail') return data.items.find(i => i.id === data.equippedTrailId);
      if (type === 'wheel') return data.items.find(i => i.id === data.equippedWheelId);
      return null;
  };

  const equippedVehicleAsset = getEquippedItem('vehicle')?.assetId;
  const equippedSkinAsset = getEquippedItem('skin')?.assetId;
  const equippedTrailAsset = getEquippedItem('trail')?.assetId;
  const equippedWheelAsset = getEquippedItem('wheel')?.assetId;

  // Filter owned items by category for the garage list
  const getGarageItems = (category: string) => {
    return data.items.filter(i => 
        data.ownedItemIds.includes(i.id) && 
        i.type === category
    );
  };

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
                  <div className={`h-32 bg-muted flex items-center justify-center relative overflow-hidden ${item.type === 'skin' ? 'bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/20 dark:to-indigo-900/20' : item.type === 'vehicle' ? 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20' : item.type === 'wheel' ? 'bg-gradient-to-br from-slate-100 to-zinc-100 dark:from-slate-900/20 dark:to-zinc-900/20' : 'bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20'}`}>
                    <div className="absolute inset-0">
                      <ThreeErrorBoundary>
                        <ItemPreview3D type={item.type as "skin" | "trail" | "vehicle" | "wheel"} assetId={item.assetId} />
                      </ThreeErrorBoundary>
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
                        {item.cost === 0 ? "Free" : `Buy for ${item.cost}`}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="inventory" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                {/* Left: Display Room */}
                <div className="lg:col-span-2 h-full rounded-xl overflow-hidden border bg-neutral-950 shadow-2xl">
                    <ThreeErrorBoundary
                        fallback={
                            <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                                <div className="text-center p-8">
                                    <div className="text-neutral-400 text-lg font-medium mb-2">Garage Preview Unavailable</div>
                                    <div className="text-neutral-500 text-sm">Your browser may not support 3D graphics</div>
                                </div>
                            </div>
                        }
                    >
                        <GarageDisplay 
                            equippedSkin={equippedSkinAsset} 
                            equippedTrail={equippedTrailAsset} 
                            equippedVehicle={equippedVehicleAsset}
                            equippedWheel={equippedWheelAsset}
                        />
                    </ThreeErrorBoundary>
                </div>

                {/* Right: Customization Panel */}
                <div className="lg:col-span-1 h-full flex flex-col bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-muted/40">
                        <h3 className="font-semibold mb-4">Customize</h3>
                        <Tabs value={garageCategory} onValueChange={setGarageCategory} className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
                                <TabsTrigger value="skin">Decal</TabsTrigger>
                                <TabsTrigger value="trail">Boost</TabsTrigger>
                                <TabsTrigger value="wheel">Wheels</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {/* Default/None Option for Skins/Trails if applicable */}
                        {(garageCategory === 'skin' || garageCategory === 'trail' || garageCategory === 'wheel') && (
                             <Button
                                variant="outline"
                                className={`w-full justify-start h-auto py-3 px-4 ${(!data.equippedSkinId && garageCategory === 'skin') || (!data.equippedTrailId && garageCategory === 'trail') || (!data.equippedWheelId && garageCategory === 'wheel') ? 'border-primary bg-primary/5' : ''}`}
                                onClick={() => {
                                    if (garageCategory === 'skin' && data.equippedSkinId) handleEquip(data.equippedSkinId, 'skin', 'unequip');
                                    if (garageCategory === 'trail' && data.equippedTrailId) handleEquip(data.equippedTrailId, 'trail', 'unequip');
                                    if (garageCategory === 'wheel' && data.equippedWheelId) handleEquip(data.equippedWheelId, 'wheel', 'unequip');
                                }}
                             >
                                <div className="flex items-center gap-3 w-full">
                                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                        <span className="text-xs text-muted-foreground">None</span>
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-medium">Default / None</div>
                                        <div className="text-xs text-muted-foreground">Remove customization</div>
                                    </div>
                                    {((garageCategory === 'skin' && !data.equippedSkinId) || (garageCategory === 'trail' && !data.equippedTrailId) || (garageCategory === 'wheel' && !data.equippedWheelId)) && (
                                        <Check className="w-4 h-4 text-primary" />
                                    )}
                                </div>
                             </Button>
                        )}

                        {/* Base Vehicle Option (always owned) */}
                        {garageCategory === 'vehicle' && (
                            <Button
                                variant="outline"
                                className={`w-full justify-start h-auto py-3 px-4 ${!data.equippedVehicleId ? 'border-primary bg-primary/5' : ''}`}
                                onClick={() => {
                                    if (data.equippedVehicleId) handleEquip(data.equippedVehicleId, 'vehicle', 'unequip');
                                }}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden">
                                         <ThreeErrorBoundary>
                                           <ItemPreview3D type="base" />
                                         </ThreeErrorBoundary>
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-medium">Base Vehicle</div>
                                        <div className="text-xs text-muted-foreground">Standard Issue</div>
                                    </div>
                                    {!data.equippedVehicleId && <Check className="w-4 h-4 text-primary" />}
                                </div>
                            </Button>
                        )}

                        {getGarageItems(garageCategory).map((item) => {
                            let isEquipped = false;
                            if (item.type === 'skin') isEquipped = data.equippedSkinId === item.id;
                            if (item.type === 'trail') isEquipped = data.equippedTrailId === item.id;
                            if (item.type === 'vehicle') isEquipped = data.equippedVehicleId === item.id;
                            if (item.type === 'wheel') isEquipped = data.equippedWheelId === item.id;

                            return (
                                <Button
                                    key={item.id}
                                    variant="outline"
                                    className={`w-full justify-start h-auto py-3 px-4 ${isEquipped ? 'border-primary bg-primary/5' : ''}`}
                                    onClick={() => !isEquipped && handleEquip(item.id, item.type, 'equip')}
                                    disabled={actionLoading === item.id}
                                >
                                    <div className="flex items-center gap-3 w-full">
                                    <div className={`w-12 h-12 rounded flex items-center justify-center overflow-hidden relative shrink-0 ${item.type === 'skin' ? 'bg-indigo-100 dark:bg-indigo-900/20' : item.type === 'vehicle' ? 'bg-emerald-100 dark:bg-emerald-900/20' : item.type === 'wheel' ? 'bg-slate-100 dark:bg-slate-900/20' : 'bg-orange-100 dark:bg-orange-900/20'}`}>
                                        <ThreeErrorBoundary>
                                          <ItemPreview3D type={item.type as "skin" | "trail" | "vehicle" | "wheel"} assetId={item.assetId} />
                                        </ThreeErrorBoundary>
                                    </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="font-medium truncate">{item.name}</div>
                                            <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                                        </div>
                                        {isEquipped ? (
                                            <Check className="w-4 h-4 text-primary shrink-0" />
                                        ) : actionLoading === item.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                        ) : null}
                                    </div>
                                </Button>
                            );
                        })}
                        
                        {getGarageItems(garageCategory).length === 0 && garageCategory !== 'vehicle' && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No items in this category.
                                <br />
                                Visit the shop to get more!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
