import { cn } from "@/lib/utils";

export type StatusKind = "connected" | "connecting" | "disconnected" | "neutral";

// Connection/state readout in the editorial voice: a hard square indicator
// (never a round dot) beside a mono uppercase label.
export function StatusBadge({ kind, label, className }: { kind: StatusKind; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 shrink-0",
          kind === "connected" && "bg-success",
          kind === "connecting" && "bg-warning [animation:ascii-blink_1.2s_steps(1)_infinite]",
          kind === "disconnected" && "bg-destructive",
          kind === "neutral" && "border border-muted-foreground"
        )}
      />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
