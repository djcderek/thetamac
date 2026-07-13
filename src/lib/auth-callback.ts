const CALLBACK_BASE_URL = "https://thetamac.invalid";

export function getSafeCallbackPath(value?: string | null): string {
  if (!value) return "/";

  const candidate = value.trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return "/";
  }

  try {
    const parsed = new URL(candidate, CALLBACK_BASE_URL);
    if (parsed.origin !== CALLBACK_BASE_URL) return "/";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}
