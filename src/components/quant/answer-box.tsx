"use client";

import type { FormEvent, RefObject } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AnswerKind } from "@/lib/quant/rational";

const PLACEHOLDERS: Record<AnswerKind, string> = {
  probability: "Fraction, decimal or %",
  percent: "Percent",
  dollars: "Dollars",
  number: "Number or fraction",
  count: "Whole number",
};

// Keys a phone's number pad doesn't have, for fractions, percentages and losses.
const HELPER_KEYS: Record<AnswerKind, string[]> = {
  probability: ["/", "%", "."],
  percent: ["/", "."],
  dollars: ["−", "."],
  number: ["/", "."],
  count: [],
};

const KEY_LABELS: Record<string, string> = { "/": "Fraction bar", "%": "Percent", "−": "Minus", ".": "Decimal point" };

/** The answer field with its unit, the keys a number pad lacks, and Submit. */
export function AnswerBox({
  kind,
  value,
  onChange,
  onSubmit,
  disabled,
  inputRef,
}: {
  kind: AnswerKind;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2">
      <div className="relative">
        {kind === "dollars" && (
          <span aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">
            $
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Answer"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={PLACEHOLDERS[kind]}
          className="h-14 w-full rounded-2xl bg-secondary px-10 text-center text-2xl font-semibold tabular-nums outline-none transition-shadow placeholder:text-[15px] placeholder:font-normal placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60"
          autoFocus
        />
        {kind === "percent" && (
          <span aria-hidden="true" className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">
            %
          </span>
        )}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          {HELPER_KEYS[kind].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onChange(value + key);
                inputRef.current?.focus();
              }}
              className="min-h-11 flex-1 rounded-full bg-control text-lg font-semibold transition-colors hover:bg-control-hover active:scale-95"
              aria-label={KEY_LABELS[key]}
            >
              {key}
            </button>
          ))}
          <Button type="submit" disabled={!value.trim()} className={cn("min-h-11 rounded-full", HELPER_KEYS[kind].length ? "flex-[2]" : "flex-1")}>
            Submit
          </Button>
        </div>
      )}
    </form>
  );
}
