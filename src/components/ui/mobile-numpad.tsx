"use client";

import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MobileNumpadProps = {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  onDone?: () => void;
  disabled?: boolean;
  /** Visual sizing. Use "compact" only where you need a shorter keypad (e.g. racing mobile). */
  variant?: "default" | "compact";
};

/**
 * Fixed bottom numeric keypad used in `duel-mode` (reused for training on mobile).
 * Renders digits, minus toggle, backspace, clear, and a Done button.
 */
export function MobileNumpad({
  value,
  setValue,
  onDone,
  disabled = false,
  variant = "default",
}: MobileNumpadProps) {
  const appendDigit = (digit: string) => {
    if (disabled) return;
    setValue((prev) => `${prev}${digit}`.replace(/[^0-9\-]/g, ""));
  };

  const toggleMinus = () => {
    if (disabled) return;
    setValue((prev) => {
      if (prev.startsWith("-")) return prev.slice(1);
      return prev.length === 0 ? "-" : `-${prev.replace(/^-/, "")}`;
    });
  };

  const backspace = () => {
    if (disabled) return;
    setValue((prev) => prev.slice(0, -1));
  };

  const clearAnswer = () => {
    if (disabled) return;
    setValue("");
  };

  const doneDisabled = disabled || !onDone || value.length === 0 || value === "-";

  const isCompact = variant === "compact";
  const digitBtnClass = isCompact
    ? "h-10 rounded-xl text-lg font-semibold active:scale-[0.98] transition"
    : "h-12 rounded-xl text-xl font-semibold active:scale-[0.98] transition";
  const actionBtnClass = isCompact
    ? "h-10 rounded-xl text-lg font-semibold active:scale-[0.98] transition"
    : "h-12 rounded-xl text-xl font-semibold active:scale-[0.98] transition";
  const backspaceBtnClass = isCompact
    ? "h-10 rounded-xl active:scale-[0.98] transition"
    : "h-12 rounded-xl active:scale-[0.98] transition";
  const footerBtnClass = isCompact
    ? "h-9 rounded-xl text-sm font-semibold active:scale-[0.99] transition"
    : "h-11 rounded-xl text-sm font-semibold active:scale-[0.99] transition";

  return (
    <div id="mobile-numpad" className="fixed left-0 right-0 bottom-0 z-50">
      <div className="border-t border-border bg-background">
        <div className={`max-w-md mx-auto px-3 ${isCompact ? "pt-1" : "pt-2"} pb-[calc(env(safe-area-inset-bottom,0.5rem)+8px)]`}>
          <div className={`flex items-center justify-center ${isCompact ? "pb-1.5" : "pb-2"}`}>
            <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
          </div>

          <div className={`grid grid-cols-3 ${isCompact ? "gap-1.5" : "gap-2"} select-none touch-manipulation`}>
            {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((d) => (
              <Button
                key={d}
                type="button"
                variant="secondary"
                className={digitBtnClass}
                onClick={() => appendDigit(d)}
                disabled={disabled}
              >
                {d}
              </Button>
            ))}

            <Button
              type="button"
              variant="secondary"
              className={actionBtnClass}
              onClick={toggleMinus}
              disabled={disabled}
              aria-label="Toggle negative sign"
            >
              −
            </Button>
            <Button
              type="button"
              variant="secondary"
              className={actionBtnClass}
              onClick={() => appendDigit("0")}
              disabled={disabled}
            >
              0
            </Button>
            <Button
              type="button"
              variant="secondary"
              className={backspaceBtnClass}
              onClick={backspace}
              disabled={disabled}
              aria-label="Backspace"
            >
              <Delete className="h-5 w-5 opacity-80" />
            </Button>

            <Button
              type="button"
              className={`${footerBtnClass} col-span-2`}
              onClick={onDone}
              disabled={doneDisabled}
            >
              Done
            </Button>
            <Button
              type="button"
              variant="secondary"
              className={footerBtnClass}
              onClick={clearAnswer}
              disabled={disabled}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


