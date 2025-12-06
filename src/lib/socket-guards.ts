import type { ZodSchema } from "zod";

type RateLimitBucket = { count: number; resetAt: number };

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

/**
 * Simple fixed-window rate limiter keyed by socket ID.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const buckets = new Map<string, RateLimitBucket>();

  return (key: string): RateLimitResult => {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return { allowed: true, retryAfterMs: options.windowMs };
    }

    if (bucket.count >= options.limit) {
      return { allowed: false, retryAfterMs: bucket.resetAt - now };
    }

    bucket.count += 1;
    return { allowed: true, retryAfterMs: bucket.resetAt - now };
  };
}

/**
 * Safely stringify and measure payload size. Returns true when the payload
 * exceeds the provided byte limit or cannot be stringified.
 */
export function isPayloadTooLarge(
  payload: unknown,
  maxBytes: number
): boolean {
  try {
    const size = Buffer.byteLength(JSON.stringify(payload ?? ""), "utf8");
    return size > maxBytes;
  } catch {
    return true;
  }
}

/**
 * Validate an incoming payload against a Zod schema without throwing.
 */
export function parseWithSchema<T>(
  schema: ZodSchema<T>,
  payload: unknown
): { success: true; data: T } | { success: false; message: string } {
  const result = schema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const message = result.error.issues.map(issue => issue.message).join("; ");
  return { success: false, message };
}

/**
 * Wrap arbitrary async handler logic to prevent a single bad client from
 * crashing the socket server.
 */
export async function safelyExecute(
  label: string,
  fn: () => Promise<void> | void
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error(`[Socket] ${label} failed`, error);
  }
}
