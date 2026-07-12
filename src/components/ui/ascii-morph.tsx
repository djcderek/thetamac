"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import {
  ACCENT_THRESHOLD,
  ASCII_COLS,
  ASCII_ROWS,
  ASCII_SHAPES,
  cellPhase,
  pickGlyph,
  type AsciiShapeName,
} from "./ascii-shapes";

// Grid cell is 6x10 units (Geist Mono advance is 0.6em), so the intrinsic
// aspect ratio of every figure is (28*6):(18*10).
const CELL_W = 6;
const CELL_H = 10;
const VIEW_W = ASCII_COLS * CELL_W;
const VIEW_H = ASCII_ROWS * CELL_H;
const SHIMMER_MS = 250;

const INK_TOKEN: Record<NonNullable<AsciiMorphProps["ink"]>, string> = {
  muted: "--ascii-ink",
  foreground: "--foreground",
  brand: "--brand",
};

type AsciiMorphProps = {
  shapes?: AsciiShapeName[];
  ink?: "muted" | "foreground" | "brand";
  /** Render the densest cells in the brand color. */
  accent?: boolean;
  /** false = static first shape; the ambient tier. */
  animate?: boolean;
  /** Mirror the shape vertically while keeping every glyph upright. */
  flipY?: boolean;
  morphMs?: number;
  holdMs?: number;
  /** Capped at 15; decorative motion doesn't need more. */
  fps?: number;
  className?: string;
};

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

// Deterministic static frame (tick 0) as SVG rows — this is the server render,
// the no-JS render, and the prefers-reduced-motion render.
function StaticFrame({
  shape,
  ink,
  accent,
  flipY,
}: {
  shape: AsciiShapeName;
  ink: NonNullable<AsciiMorphProps["ink"]>;
  accent: boolean;
  flipY: boolean;
}) {
  const { density } = ASCII_SHAPES[shape];
  const baseRows: string[] = [];
  const accentRows: string[] = [];
  for (let r = 0; r < ASCII_ROWS; r++) {
    let base = "";
    let acc = "";
    for (let c = 0; c < ASCII_COLS; c++) {
      const sourceRow = flipY ? ASCII_ROWS - 1 - r : r;
      const d = density[sourceRow * ASCII_COLS + c];
      const glyph = pickGlyph(d, c, r, 0);
      const isAccent = accent && d >= ACCENT_THRESHOLD;
      base += isAccent ? " " : glyph;
      acc += isAccent ? glyph : " ";
    }
    baseRows.push(base);
    accentRows.push(acc);
  }

  const textProps = {
    xmlSpace: "preserve",
    textLength: VIEW_W,
    lengthAdjust: "spacing",
  } as const;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: CELL_H }}
      data-ascii-static
    >
      <g fill={`var(${INK_TOKEN[ink]})`}>
        {baseRows.map((row, r) => (
          <text key={r} x={0} y={r * CELL_H + CELL_H * 0.82} {...textProps}>
            {row}
          </text>
        ))}
      </g>
      {accent && (
        <g fill="var(--brand)">
          {accentRows.map((row, r) =>
            row.trim() ? (
              <text key={r} x={0} y={r * CELL_H + CELL_H * 0.82} {...textProps}>
                {row}
              </text>
            ) : null,
          )}
        </g>
      )}
    </svg>
  );
}

export function AsciiMorph({
  shapes = ["theta", "times", "bolt", "trophy"],
  ink = "muted",
  accent = false,
  animate = true,
  flipY = false,
  morphMs = 900,
  holdMs = 3200,
  fps = 12,
  className,
}: AsciiMorphProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shapeKey = shapes.join(",");

  useEffect(() => {
    const shapes = shapeKey.split(",") as AsciiShapeName[];
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!animate || !wrapper || !canvas || shapes.length === 0) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frameMs = 1000 / Math.min(fps, 15);
    const sequence = shapes.map((name) => ASCII_SHAPES[name]);
    const cycleMs = holdMs + morphMs;

    let raf = 0;
    let running = false;
    let inView = true;
    let lastDraw = 0;
    let width = 0;
    let height = 0;
    let inkColor = "";
    let accentColor = "";
    let fontSpec = "";
    const startedAt = performance.now();

    const resolveColors = () => {
      const styles = getComputedStyle(canvas);
      inkColor = styles.getPropertyValue(INK_TOKEN[ink]).trim() || "currentColor";
      accentColor = styles.getPropertyValue("--brand").trim() || inkColor;
    };

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const family =
        getComputedStyle(canvas).getPropertyValue("--font-geist-mono").trim() || "monospace";
      fontSpec = `${height / ASCII_ROWS}px ${family}`;
    };

    const draw = (now: number) => {
      const cw = width / ASCII_COLS;
      const ch = height / ASCII_ROWS;
      const tick = Math.floor(now / SHIMMER_MS);
      // rAF timestamps can precede the performance.now() taken at setup.
      const elapsed = Math.max(0, now - startedAt);

      let from = sequence[0];
      let to = sequence[0];
      let progress = 0;
      if (sequence.length > 1) {
        const seg = Math.floor(elapsed / cycleMs) % sequence.length;
        const within = elapsed % cycleMs;
        from = sequence[seg];
        to = sequence[(seg + 1) % sequence.length];
        progress = within < holdMs ? 0 : (within - holdMs) / morphMs;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.font = fontSpec;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let r = 0; r < ASCII_ROWS; r++) {
        for (let c = 0; c < ASCII_COLS; c++) {
          const sourceRow = flipY ? ASCII_ROWS - 1 - r : r;
          const i = sourceRow * ASCII_COLS + c;
          let d = from.density[i];
          if (progress > 0) {
            // Hashed per-cell stagger dissolves the shape cell-by-cell.
            const local = Math.min(1, Math.max(0, progress * 1.35 - cellPhase(c, r) * 0.35));
            d = d + (to.density[i] - d) * smoothstep(local);
          }
          const glyph = pickGlyph(d, c, r, tick);
          if (glyph === " ") continue;
          ctx.fillStyle = accent && d >= ACCENT_THRESHOLD ? accentColor : inkColor;
          ctx.fillText(glyph, (c + 0.5) * cw, (r + 0.53) * ch);
        }
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - lastDraw < frameMs) return;
      lastDraw = now;
      draw(now);
    };

    const staticSvg = wrapper.querySelector<SVGElement>("[data-ascii-static]");

    const start = () => {
      if (running || reducedMotion.matches || document.hidden || !inView) return;
      running = true;
      resolveColors();
      resize();
      canvas.style.visibility = "visible";
      if (staticSvg) staticSvg.style.visibility = "hidden";
      raf = requestAnimationFrame(loop);
    };

    const stop = (revealStatic = false) => {
      running = false;
      cancelAnimationFrame(raf);
      if (revealStatic && staticSvg) {
        staticSvg.style.visibility = "visible";
        canvas.style.visibility = "hidden";
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
      else stop();
    });
    io.observe(wrapper);

    const ro = new ResizeObserver(() => {
      if (running) resize();
    });
    ro.observe(wrapper);

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onMotionChange = () => {
      if (reducedMotion.matches) stop(true);
      else start();
    };
    reducedMotion.addEventListener("change", onMotionChange);

    // Theme flips swap the .dark class on <html>; re-resolve the ink tokens.
    const themeObserver = new MutationObserver(() => {
      resolveColors();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    start();

    return () => {
      stop(true);
      io.disconnect();
      ro.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener("change", onMotionChange);
    };
  }, [animate, shapeKey, ink, accent, flipY, morphMs, holdMs, fps]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className={cn("pointer-events-none relative select-none", className)}
      style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
    >
      <StaticFrame
        shape={shapes[0] ?? "theta"}
        ink={ink}
        accent={accent}
        flipY={flipY}
      />
      {animate && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ visibility: "hidden" }}
        />
      )}
    </div>
  );
}

const SPINNER_GLYPHS = ["+", "×", "÷", "="];

// CSS-only loading mark: four operators take one quarter-turn each.
export function AsciiSpinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "relative inline-flex h-6 w-6 items-center justify-center font-mono text-lg text-muted-foreground",
        className,
      )}
    >
      {SPINNER_GLYPHS.map((glyph, i) => (
        <span
          key={glyph}
          aria-hidden="true"
          className={cn("absolute inset-0 flex items-center justify-center", i > 0 && "opacity-0")}
          style={{ animation: "ascii-blink 1.6s steps(1) infinite", animationDelay: `${i * 0.4}s` }}
        >
          {glyph}
        </span>
      ))}
    </span>
  );
}
