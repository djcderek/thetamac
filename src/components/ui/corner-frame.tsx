import { cn } from "@/lib/utils";

const CORNERS = [
  "left-0 top-0 border-l-2 border-t-2",
  "right-0 top-0 border-r-2 border-t-2",
  "bottom-0 left-0 border-b-2 border-l-2",
  "bottom-0 right-0 border-b-2 border-r-2",
] as const;

// Registration-mark framing for the one featured element in a view.
// Parent must be `relative`; keep to at most one framed element per screen.
export function CornerBrackets({
  size = 12,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {CORNERS.map((corner) => (
        <span
          key={corner}
          className={cn("absolute border-border", corner, className)}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}
