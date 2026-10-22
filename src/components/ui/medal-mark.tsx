import { cn } from "@/lib/utils";

// Rank as a numeral in a soft circle: first place in ink, the podium in grey, the field plain.
export function MedalMark({ rank, size = "md", className }: { rank: number; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold tabular-nums",
        size === "sm" && "h-6 w-6 text-xs",
        size === "md" && "h-8 w-8 text-sm",
        size === "lg" && "h-10 w-10 text-base",
        rank === 1 && "bg-foreground text-background",
        (rank === 2 || rank === 3) && "bg-secondary text-foreground",
        rank > 3 && "text-muted-foreground",
        className
      )}
    >
      {rank}
    </span>
  );
}
