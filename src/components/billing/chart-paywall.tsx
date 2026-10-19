"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { getUpgradeUrl } from "@/lib/upgrade";

interface ChartPaywallProps {
  title: string;
}

export function ChartPaywall({ title }: ChartPaywallProps) {
  const router = useRouter();

  const handleUpgradeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(getUpgradeUrl({ feature: "analytics", source: "chart_paywall" }));
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-muted/20 rounded-2xl border border-dashed border-border p-4 text-center animate-in fade-in zoom-in duration-300">
      <div className="p-3 bg-background rounded-full shadow-sm mb-3">
        <Lock className="w-6 h-6 text-primary" />
      </div>
      <h3 className="font-semibold text-sm mb-1">Unlock {title}</h3>
      <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
        Upgrade to Theta Pro to view detailed analytics and track your progress.
      </p>
      <Button size="sm" variant="default" onClick={handleUpgradeClick}>
        Upgrade
      </Button>
    </div>
  );
}

