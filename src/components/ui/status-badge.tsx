import { cn } from "@/lib/utils";

export type StatusKind = "connected" | "connecting" | "disconnected" | "neutral";

// Connection/state readout as a soft status pill (Kurb's "• Needs your approval").
export function StatusBadge({ kind, label, className }: { kind: StatusKind; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[13px] font-medium", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          kind === "connected" && "bg-success",
          kind === "connecting" && "bg-warning animate-pulse",
          kind === "disconnected" && "bg-destructive",
          kind === "neutral" && "bg-muted-foreground/50"
        )}
      />
      <span className="text-foreground">{label}</span>
    </span>
  );
}
