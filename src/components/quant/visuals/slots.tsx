import type { CSSProperties } from "react";
import type { QuantVisual, Tone } from "@/lib/quant/visual";
import { cn } from "@/lib/utils";
import { TONE_FILL } from "@/components/quant/visuals/tones";
import { MathExpr } from "@/components/quant/math";

type Slots = Extract<QuantVisual, { type: "slots" }>;

/**
 * What a slot's value looks like as a picture, read from the value itself:
 * - a small count ("5") is a row of dots, one per option;
 * - "3 + 1" is 3 dots and a ring for the extra option (none, skip);
 * - a fraction with a small bottom ("7/10") is a meter of 10 cells with 7 filled;
 * - a percentage ("60%") is a filled bar.
 * Anything else (money, names, "?") is just the value.
 */
type Picture = { kind: "dots"; filled: number; hollow: number } | { kind: "cells"; filled: number; total: number } | { kind: "bar"; share: number };

function pictureOf(value: string): Picture | null {
  let m = /^(\d+)$/.exec(value);
  if (m && +m[1] >= 1 && +m[1] <= 10) return { kind: "dots", filled: +m[1], hollow: 0 };
  m = /^(\d+) \+ (\d+)$/.exec(value);
  if (m && +m[1] + +m[2] <= 10) return { kind: "dots", filled: +m[1], hollow: +m[2] };
  m = /^(\d+)\/(\d+)$/.exec(value);
  if (m && +m[2] >= 2 && +m[2] <= 12 && +m[1] <= +m[2]) return { kind: "cells", filled: +m[1], total: +m[2] };
  m = /^(\d+(?:\.\d+)?)%$/.exec(value);
  if (m && +m[1] <= 100) return { kind: "bar", share: +m[1] / 100 };
  return null;
}

/** The tone's colour, for accents; "muted" slots draw their dots in soft ink. */
const accent = (tone: Tone) => (tone === "muted" ? "color-mix(in oklab, var(--foreground) 32%, transparent)" : TONE_FILL[tone]);

function PictureRow({ picture, tone, compact }: { picture: Picture; tone: Tone; compact: boolean }) {
  const color = accent(tone);
  if (picture.kind === "dots") {
    const size = compact ? 7 : 8;
    const dots = [...Array.from({ length: picture.filled }, () => true), ...Array.from({ length: picture.hollow }, () => false)];
    return (
      <span aria-hidden="true" className="flex max-w-[5.5rem] flex-wrap justify-center gap-[5px]">
        {dots.map((filled, i) => (
          <span
            key={i}
            className="quant-pop rounded-full"
            style={{
              width: size,
              height: size,
              animationDelay: `${i * 28}ms`,
              transition: "background-color 250ms ease, border-color 250ms ease",
              ...(filled ? { backgroundColor: color } : { boxShadow: `inset 0 0 0 1.5px ${color}` }),
            }}
          />
        ))}
      </span>
    );
  }
  if (picture.kind === "cells") {
    return (
      <span aria-hidden="true" className="flex gap-[2px]" style={{ width: compact ? 52 : 64 }}>
        {Array.from({ length: picture.total }, (_, i) => (
          <span
            key={i}
            className="h-[6px] flex-1 rounded-[2px]"
            style={{
              backgroundColor: i < picture.filled ? color : "color-mix(in oklab, var(--foreground) 10%, transparent)",
              transition: `background-color 260ms ease ${i * 18}ms`,
            }}
          />
        ))}
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="h-[6px] overflow-hidden rounded-full" style={{ width: compact ? 52 : 64, backgroundColor: "color-mix(in oklab, var(--foreground) 10%, transparent)" }}>
      <span className="block h-full rounded-full" style={{ width: `${picture.share * 100}%`, backgroundColor: color, transition: "width 400ms cubic-bezier(0.22, 1, 0.36, 1)" }} />
    </span>
  );
}

function cardStyle(tone: Tone): CSSProperties {
  if (tone === "muted") return { backgroundColor: "var(--background)", borderColor: "var(--border)" };
  const fill = TONE_FILL[tone];
  return {
    backgroundColor: `color-mix(in oklab, ${fill} 10%, var(--background))`,
    borderColor: `color-mix(in oklab, ${fill} 45%, var(--border))`,
    ...(tone === "known" ? { borderStyle: "dashed" } : {}),
  };
}

/**
 * Choices made in steps, as a row of cards joined by × or +: each card has its label, its value
 * typeset, and a small picture of the value when it has one (a dot per option, a meter for a
 * chance). The total sits in its own card at the end. Rows wrap on a phone, each operator
 * travelling with the card after it.
 */
export function SlotsFigure({ visual }: { visual: Slots }) {
  const compact = visual.slots.length >= 5;
  const op = visual.op === "×" ? "×" : visual.op === "+" ? "+" : "";
  const label = `${visual.slots.map((s) => `${s.label}: ${s.value}`).join(op === "×" ? ", times " : op === "+" ? ", plus " : ", ")}${
    visual.result ? `, equals ${visual.result}` : ""
  }`;

  return (
    <figure className="mx-auto w-full">
      <div role="img" aria-label={label} className={cn("flex flex-wrap items-stretch justify-center", compact ? "gap-y-2.5" : "gap-y-3")}>
        {visual.slots.map((slot, i) => {
          const tone = slot.tone ?? "muted";
          const picture = pictureOf(slot.value);
          return (
            <div key={i} className="flex items-stretch">
              {i > 0 && (
                <span aria-hidden="true" className={cn("flex items-center text-muted-foreground", op ? (compact ? "px-1.5 text-[17px]" : "px-2.5 text-[20px]") : "px-1")}>
                  {op}
                </span>
              )}
              <div
                className={cn(
                  "quant-pop flex flex-col items-center justify-between rounded-[14px] border text-center",
                  compact ? "min-w-[3.6rem] gap-1.5 px-2 pb-2.5 pt-2" : "min-w-[4.75rem] gap-2 px-3 pb-3 pt-2.5",
                )}
                style={{ ...cardStyle(tone), animationDelay: `${i * 45}ms`, transition: "background-color 250ms ease, border-color 250ms ease" }}
              >
                <span className={cn("max-w-[8rem] font-medium leading-tight text-muted-foreground", compact ? "text-[11px]" : "text-[12px]")}>{slot.label}</span>
                <span className={cn("font-semibold leading-none text-foreground", compact ? "text-[17px]" : "text-[21px]")}>
                  <MathExpr expr={slot.value} />
                </span>
                {picture ? <PictureRow picture={picture} tone={tone} compact={compact} /> : <span aria-hidden="true" className="h-[6px]" />}
              </div>
            </div>
          );
        })}
        {visual.result && (
          <div className="flex items-stretch">
            <span aria-hidden="true" className={cn("flex items-center text-muted-foreground", compact ? "px-1.5 text-[17px]" : "px-2.5 text-[20px]")}>
              =
            </span>
            <div
              className={cn(
                "quant-pop flex flex-col items-center justify-center rounded-[14px] bg-foreground text-background",
                compact ? "min-w-[3.6rem] px-3 py-2" : "min-w-[4.75rem] px-4 py-2.5",
              )}
              style={{ animationDelay: `${visual.slots.length * 45}ms` }}
            >
              <span className={cn("font-semibold leading-none", compact ? "text-[18px]" : "text-[22px]")}>
                <MathExpr expr={visual.result} />
              </span>
            </div>
          </div>
        )}
      </div>
      {visual.caption && <figcaption className="mt-3 text-center text-[13px] text-muted-foreground">{visual.caption}</figcaption>}
    </figure>
  );
}
