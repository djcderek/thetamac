"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AsciiSpinner } from "@/components/ui/ascii-morph";
import { PageHeader, SectionLabel, optionTileClass } from "@/components/ui/visual-system";
import { Loader2, ShoppingBag, Check } from "lucide-react";
import { ThreeErrorBoundary } from "@/components/ui/three-error-boundary";
import { cn } from "@/lib/utils";

// Dynamically import 3D components with SSR disabled to prevent hydration issues
const ItemPreview3D = dynamic(() => import("./item-preview-3d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-secondary/40">
      <AsciiSpinner />
    </div>
  )
});

const GarageDisplay = dynamic(
  () => import("./garage-display").then((mod) => mod.GarageDisplay),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center bg-secondary/40">
        <AsciiSpinner />
      </div>
    )
  }
);

const categoryLabels: Record<string, string> = {
  vehicle: "Vehicle",
  skin: "Decal",
  trail: "Boost",
  wheel: "Wheels",
};

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
  const [actionError, setActionError] = useState<{ itemId: string; message: string } | null>(null);
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
    setActionError(null);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setActionError({ itemId, message: err.error || "Failed to buy item" });
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
      setActionError({ itemId, message: "Something went wrong. Please try again." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEquip = async (itemId: string, type: string, action: "equip" | "unequip") => {
    setActionLoading(itemId);
    setActionError(null);
    try {
      const res = await fetch("/api/shop/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setActionError({ itemId, message: err.error || "Failed to equip item" });
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
      setActionError({ itemId, message: "Something went wrong. Please try again." });
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
    <>
      <PageHeader
        eyebrow="Garage"
        title="Shop"
        description="Customize your racing vehicle"
        action={
          <div className="text-right">
            <SectionLabel>Coins</SectionLabel>
            <div className="mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums">{data.userCoins}</div>
          </div>
        }
      />

      <div className="space-y-6 p-4 md:p-6">
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
                  <div className="bayer-field relative flex h-32 items-center justify-center overflow-hidden border-b border-border bg-secondary/40">
                    <span className="editorial-label absolute left-2 top-2 z-10">
                      {categoryLabels[item.type] ?? item.type}
                    </span>
                    <div className="absolute inset-0">
                      <ThreeErrorBoundary>
                        <ItemPreview3D type={item.type as "skin" | "trail" | "vehicle" | "wheel"} assetId={item.assetId} />
                      </ThreeErrorBoundary>
                    </div>
                  </div>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>{item.name}</CardTitle>
                        {item.isProOnly && (
                          <span className="rounded-[3px] bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-background">
                            PRO
                          </span>
                        )}
                    </div>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardFooter className="flex-col items-stretch gap-2">
                    <Button
                        className="w-full gap-2"
                        onClick={() => handleBuy(item.id)}
                        disabled={actionLoading === item.id || data.userCoins < item.cost}
                    >
                        {actionLoading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                        {item.cost === 0 ? "Free" : `Buy for ${item.cost}`}
                    </Button>
                    {actionError?.itemId === item.id && (
                      <p className="font-mono text-xs text-destructive">{actionError.message}</p>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="inventory" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                {/* Left: Display Room — the dark room inside the canvas is scene art */}
                <div className="lg:col-span-2 h-full rounded-[3px] overflow-hidden border border-border">
                    <ThreeErrorBoundary
                        fallback={
                            <div className="flex h-full w-full items-center justify-center bg-secondary/40">
                                <div className="p-8 text-center">
                                    <div className="mb-2 text-lg font-medium">Garage Preview Unavailable</div>
                                    <div className="text-sm text-muted-foreground">Your browser may not support 3D graphics</div>
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
                <div className="lg:col-span-1 h-full flex flex-col bg-card rounded-[3px] border border-border overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <SectionLabel className="mb-4 text-foreground">Customize</SectionLabel>
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
                        {(garageCategory === 'skin' || garageCategory === 'trail' || garageCategory === 'wheel') && (() => {
                            const noneSelected =
                                (!data.equippedSkinId && garageCategory === 'skin') ||
                                (!data.equippedTrailId && garageCategory === 'trail') ||
                                (!data.equippedWheelId && garageCategory === 'wheel');
                            return (
                             <button
                                className={optionTileClass(noneSelected, "w-full")}
                                onClick={() => {
                                    if (garageCategory === 'skin' && data.equippedSkinId) handleEquip(data.equippedSkinId, 'skin', 'unequip');
                                    if (garageCategory === 'trail' && data.equippedTrailId) handleEquip(data.equippedTrailId, 'trail', 'unequip');
                                    if (garageCategory === 'wheel' && data.equippedWheelId) handleEquip(data.equippedWheelId, 'wheel', 'unequip');
                                }}
                             >
                                <div className="flex items-center gap-3 w-full">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-[3px] bg-secondary">
                                        <span className="text-xs text-muted-foreground">None</span>
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="text-sm font-medium">Default / None</div>
                                        <div className={cn("text-xs", noneSelected ? "text-background/70" : "text-muted-foreground")}>
                                            Remove customization
                                        </div>
                                    </div>
                                    {noneSelected && <Check className="w-4 h-4" />}
                                </div>
                             </button>
                            );
                        })()}

                        {/* Base Vehicle Option (always owned) */}
                        {garageCategory === 'vehicle' && (
                            <button
                                className={optionTileClass(!data.equippedVehicleId, "w-full")}
                                onClick={() => {
                                    if (data.equippedVehicleId) handleEquip(data.equippedVehicleId, 'vehicle', 'unequip');
                                }}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[3px] bg-secondary">
                                         <ThreeErrorBoundary>
                                           <ItemPreview3D type="base" />
                                         </ThreeErrorBoundary>
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="text-sm font-medium">Base Vehicle</div>
                                        <div className={cn("text-xs", !data.equippedVehicleId ? "text-background/70" : "text-muted-foreground")}>
                                            Standard Issue
                                        </div>
                                    </div>
                                    {!data.equippedVehicleId && <Check className="w-4 h-4" />}
                                </div>
                            </button>
                        )}

                        {getGarageItems(garageCategory).map((item) => {
                            let isEquipped = false;
                            if (item.type === 'skin') isEquipped = data.equippedSkinId === item.id;
                            if (item.type === 'trail') isEquipped = data.equippedTrailId === item.id;
                            if (item.type === 'vehicle') isEquipped = data.equippedVehicleId === item.id;
                            if (item.type === 'wheel') isEquipped = data.equippedWheelId === item.id;

                            return (
                                <div key={item.id} className="space-y-1">
                                <button
                                    className={optionTileClass(isEquipped, "w-full disabled:pointer-events-none disabled:opacity-50")}
                                    onClick={() => !isEquipped && handleEquip(item.id, item.type, 'equip')}
                                    disabled={actionLoading === item.id}
                                >
                                    <div className="flex items-center gap-3 w-full">
                                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-secondary">
                                        <ThreeErrorBoundary>
                                          <ItemPreview3D type={item.type as "skin" | "trail" | "vehicle" | "wheel"} assetId={item.assetId} />
                                        </ThreeErrorBoundary>
                                    </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">{item.name}</div>
                                            <div className={cn("text-xs truncate", isEquipped ? "text-background/70" : "text-muted-foreground")}>
                                                {item.description}
                                            </div>
                                        </div>
                                        {isEquipped ? (
                                            <Check className="w-4 h-4 shrink-0" />
                                        ) : actionLoading === item.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                        ) : null}
                                    </div>
                                </button>
                                {actionError?.itemId === item.id && (
                                    <p className="px-1 font-mono text-xs text-destructive">{actionError.message}</p>
                                )}
                                </div>
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
    </>
  );
}
