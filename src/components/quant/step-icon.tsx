import {
  Check,
  Divide,
  Filter,
  GitBranch,
  Hash,
  Lightbulb,
  Minus,
  Plus,
  Repeat,
  Shuffle,
  Target,
  X,
  type LucideIcon,
} from "lucide-react";
import type { StepIcon as StepIconName } from "@/lib/quant/visual";
import { cn } from "@/lib/utils";

const ICONS: Record<StepIconName, LucideIcon> = {
  count: Hash,
  multiply: X,
  add: Plus,
  subtract: Minus,
  divide: Divide,
  split: GitBranch,
  filter: Filter,
  repeat: Repeat,
  flip: Shuffle,
  target: Target,
  check: Check,
  idea: Lightbulb,
};

/** The round icon beside a walkthrough step. */
export function StepIcon({ name, active, className }: { name?: StepIconName; active?: boolean; className?: string }) {
  const Icon = ICONS[name ?? "idea"];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-200",
        active ? "bg-foreground text-background" : "bg-control text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2.25} />
    </span>
  );
}
