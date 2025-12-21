import React from "react";

/**
 * Brand logo mark that reuses the app favicon (`/icon.svg`).
 * Uses an inverted icon on `bg-foreground` so it stays visible in light/dark themes.
 */
export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={[
        "inline-flex items-center justify-center rounded bg-foreground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ width: size, height: size }}
      aria-label="thetamac"
    >
      <img
        src="/icon.svg"
        alt=""
        className="h-[70%] w-[70%] invert"
        draggable={false}
      />
    </div>
  );
}


