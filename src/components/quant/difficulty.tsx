import type { QuantDifficulty } from "@/lib/quant/build";
import { cn } from "@/lib/utils";

const TONES: Record<QuantDifficulty, string> = {
  Easy: "text-success",
  Medium: "text-warning",
  Hard: "text-destructive",
};

/** Easy, Medium or Hard in its colour, as in a problem list. */
export function DifficultyLabel({ difficulty, className }: { difficulty: QuantDifficulty; className?: string }) {
  return <span className={cn("font-medium", TONES[difficulty], className)}>{difficulty}</span>;
}

/** The same as a soft pill, for a lesson's header. */
export function DifficultyPill({ difficulty }: { difficulty: QuantDifficulty }) {
  return (
    <span className={cn("rounded-full bg-control px-2.5 py-0.5 text-[13px] font-medium", TONES[difficulty])}>{difficulty}</span>
  );
}
