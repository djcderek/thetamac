export function LogoMark({
  size = 32,
  className,
  textured = true,
}: {
  size?: number;
  className?: string;
  textured?: boolean;
}) {
  return (
    <div
      className={[
        "relative inline-flex items-center justify-center overflow-hidden rounded-[32%] border border-brand/35 bg-brand text-brand-foreground shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ width: size, height: size }}
      aria-label="thetamac"
    >
      {textured && (
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: "conic-gradient(from 270deg at 1.5px 1.5px, currentColor 90deg, transparent 0)",
            backgroundSize: "4px 4px",
          }}
        />
      )}
      <svg viewBox="0 0 24 24" aria-hidden="true" className="relative h-[72%] w-[72%]">
        <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M4.5 13.2c4.8-4.1 10.2-4.1 15 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
