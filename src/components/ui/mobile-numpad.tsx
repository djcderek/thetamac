"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileNumpadProps = {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  onDone?: () => void;
  doneLabel?: string;
  disabled?: boolean;
  /** Visual sizing. Use "compact" only where you need a shorter keypad (e.g. racing mobile). */
  variant?: "default" | "compact";
};

/**
 * Trigger haptic feedback using the Vibration API.
 * Gracefully fails on unsupported devices.
 */
const triggerHaptic = (intensity: "light" | "medium" = "light") => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(intensity === "light" ? 10 : 15);
  }
};

/**
 * Fixed bottom numeric keypad used in `duel-mode` (reused for training on mobile).
 * Renders digits, minus toggle, backspace, clear, and a Done button.
 * 
 * Optimized for responsiveness with:
 * - onPointerDown for instant touch response
 * - Haptic feedback on button press
 * - Ripple animation for visual feedback
 * - Slide-up entrance animation
 */
export function MobileNumpad({
  value,
  setValue,
  onDone,
  doneLabel = "Done",
  disabled = false,
  variant = "default",
}: MobileNumpadProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; buttonKey: string }>>([]);
  const rippleIdRef = useRef(0);

  // Trigger slide-up animation on mount
  useEffect(() => {
    // Small delay to ensure CSS transition triggers
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Create ripple effect at touch point for a specific button
  const createRipple = useCallback((e: React.PointerEvent<HTMLButtonElement>, buttonKey: string) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++rippleIdRef.current;
    
    setRipples((prev) => [...prev, { id, x, y, buttonKey }]);
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 400);
  }, []);

  // Get ripples for a specific button
  const getRipplesForButton = useCallback((buttonKey: string) => {
    return ripples.filter((r) => r.buttonKey === buttonKey);
  }, [ripples]);

  // Actions shared by touch, keyboard activation of a button, and a hardware keyboard.
  const pressDigit = useCallback(
    (digit: string) => setValue((prev) => `${prev}${digit}`.replace(/[^0-9\-]/g, "")),
    [setValue]
  );
  const pressMinus = useCallback(
    () =>
      setValue((prev) => {
        if (prev.startsWith("-")) return prev.slice(1);
        return prev.length === 0 ? "-" : `-${prev.replace(/^-/, "")}`;
      }),
    [setValue]
  );
  const pressBackspace = useCallback(() => setValue((prev) => prev.slice(0, -1)), [setValue]);
  const pressClear = useCallback(() => setValue(""), [setValue]);
  const canSubmit = !disabled && Boolean(onDone) && value.length > 0 && value !== "-";
  const pressDone = useCallback(() => {
    if (canSubmit) onDone?.();
  }, [canSubmit, onDone]);

  // Touch and mouse act on pointerdown (fast, with ripple and haptics). Buttons activated
  // with Enter/Space fire only a click with detail 0, which previously did nothing.
  const pointerHandler = useCallback(
    (buttonKey: string, haptic: "light" | "medium", action: () => void) =>
      (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (disabled) return;
        createRipple(e, buttonKey);
        triggerHaptic(haptic);
        action();
      },
    [disabled, createRipple]
  );
  const keyboardClickHandler = useCallback(
    (action: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
      if (e.detail !== 0 || disabled) return;
      action();
    },
    [disabled]
  );

  // Devices with the numpad have no text input, so typing on a hardware keyboard (an iPad
  // with a keyboard case) did nothing. Map digits, minus, Backspace and Enter here.
  useEffect(() => {
    if (disabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Skip keys another control already handled (e.g. a focused lane button's Enter).
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      // A focused button handles its own Enter (e.g. a numpad key activated from the keyboard).
      if (e.key === "Enter" && target?.closest("button")) return;
      if (/^[0-9]$/.test(e.key)) pressDigit(e.key);
      else if (e.key === "-") pressMinus();
      else if (e.key === "Backspace") pressBackspace();
      else if (e.key === "Enter") pressDone();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, pressDigit, pressMinus, pressBackspace, pressDone]);

  const doneDisabled = !canSubmit;
  const isCompact = variant === "compact";

  // Base button classes with performance optimizations
  const baseButtonClass = cn(
    "relative overflow-hidden rounded-xl font-semibold",
    "touch-action-manipulation select-none",
    "will-change-transform transition-all duration-100 ease-out",
    "active:scale-[0.98] active:opacity-80",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    "-webkit-tap-highlight-color-transparent"
  );

  const digitBtnClass = cn(
    baseButtonClass,
    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    isCompact ? "h-10 text-lg" : "h-12 text-xl"
  );

  const actionBtnClass = cn(
    baseButtonClass,
    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    isCompact ? "h-10 text-lg" : "h-12 text-xl"
  );

  const backspaceBtnClass = cn(
    baseButtonClass,
    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    isCompact ? "h-10" : "h-12"
  );

  const footerBtnClass = cn(
    baseButtonClass,
    "text-sm",
    isCompact ? "h-9" : "h-11"
  );

  const doneBtnClass = cn(
    footerBtnClass,
    "bg-primary text-primary-foreground hover:bg-primary/90",
    "font-bold tracking-wide"
  );

  const clearBtnClass = cn(
    footerBtnClass,
    "bg-secondary text-secondary-foreground hover:bg-secondary/80"
  );

  // Ripple component
  const RippleEffect = ({ x, y }: { x: number; y: number }) => (
    <span
      className="numpad-ripple"
      style={{
        left: x,
        top: y,
      }}
    />
  );

  return (
    <div
      id="mobile-numpad"
      className={cn(
        "fixed left-0 right-0 bottom-0 z-50",
        "transform transition-transform duration-250 ease-out",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="border-t border-border bg-background">
        <div
          className={cn(
            "max-w-md mx-auto px-3",
            isCompact ? "pt-1" : "pt-2",
            "pb-[calc(env(safe-area-inset-bottom,0.5rem)+8px)]"
          )}
        >
          {/* Handle indicator */}
          <div className={cn("flex items-center justify-center", isCompact ? "pb-1.5" : "pb-2")}>
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Number grid */}
          <div
            className={cn(
              "grid grid-cols-3",
              isCompact ? "gap-1.5" : "gap-2",
              "select-none"
            )}
          >
            {/* Digits 7-9, 4-6, 1-3 */}
            {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((d) => (
              <button
                key={d}
                type="button"
                className={digitBtnClass}
                onPointerDown={pointerHandler(`digit-${d}`, "light", () => pressDigit(d))}
                onClick={keyboardClickHandler(() => pressDigit(d))}
                disabled={disabled}
              >
                {getRipplesForButton(`digit-${d}`).map((r) => (
                  <RippleEffect key={r.id} x={r.x} y={r.y} />
                ))}
                {d}
              </button>
            ))}

            {/* Bottom digit row: +/- toggle, 0, backspace */}
            <button
              type="button"
              className={actionBtnClass}
              onPointerDown={pointerHandler("minus", "light", pressMinus)}
              onClick={keyboardClickHandler(pressMinus)}
              disabled={disabled}
              aria-label="Toggle negative sign"
            >
              {getRipplesForButton("minus").map((r) => (
                <RippleEffect key={r.id} x={r.x} y={r.y} />
              ))}
              +/−
            </button>
            <button
              type="button"
              className={actionBtnClass}
              onPointerDown={pointerHandler("digit-0", "light", () => pressDigit("0"))}
              onClick={keyboardClickHandler(() => pressDigit("0"))}
              disabled={disabled}
            >
              {getRipplesForButton("digit-0").map((r) => (
                <RippleEffect key={r.id} x={r.x} y={r.y} />
              ))}
              0
            </button>
            <button
              type="button"
              className={backspaceBtnClass}
              onPointerDown={pointerHandler("backspace", "light", pressBackspace)}
              onClick={keyboardClickHandler(pressBackspace)}
              disabled={disabled}
              aria-label="Backspace"
            >
              {getRipplesForButton("backspace").map((r) => (
                <RippleEffect key={r.id} x={r.x} y={r.y} />
              ))}
              <Delete className="h-5 w-5 opacity-80 mx-auto" />
            </button>

            {/* Footer row: Clear on left, Done spanning 2 cols on right */}
            <button
              type="button"
              className={clearBtnClass}
              onPointerDown={pointerHandler("clear", "medium", pressClear)}
              onClick={keyboardClickHandler(pressClear)}
              disabled={disabled}
            >
              {getRipplesForButton("clear").map((r) => (
                <RippleEffect key={r.id} x={r.x} y={r.y} />
              ))}
              Clear
            </button>
            <button
              type="button"
              className={cn(doneBtnClass, "col-span-2", doneDisabled && "opacity-50 cursor-not-allowed")}
              onPointerDown={pointerHandler("done", "medium", pressDone)}
              onClick={keyboardClickHandler(pressDone)}
              disabled={doneDisabled}
            >
              {getRipplesForButton("done").map((r) => (
                <RippleEffect key={r.id} x={r.x} y={r.y} />
              ))}
              {doneLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
