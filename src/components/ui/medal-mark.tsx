import { cn } from "@/lib/utils";

// Rank is a numeral, so it is set as one: a hard square tile where first place
// prints in ink, podium places carry a strong rule, and the field stays quiet.
export function MedalMark({ rank, size = "md", className }: { rank: number; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-[3px] font-mono font-semibold tabular-nums",
        size === "sm" && "h-6 w-6 text-xs",
        size === "md" && "h-8 w-8 text-sm",
        size === "lg" && "h-10 w-10 text-base",
        rank === 1 && "bg-foreground text-background",
        (rank === 2 || rank === 3) && "border-2 border-foreground text-foreground",
        rank > 3 && "border border-border text-muted-foreground",
        className
      )}
    >
      {rank}
    </span>
  );
}
