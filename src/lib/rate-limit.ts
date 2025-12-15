import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client (only if env vars are set)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Rate limiters for different endpoints
// Sliding window algorithm provides smooth rate limiting

/**
 * Checkout rate limit: 5 requests per minute
 * Prevents Stripe checkout session spam
 */
export const checkoutRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "ratelimit:checkout",
      analytics: true,
    })
  : null;

/**
 * Shop rate limit: 15 requests per minute
 * Prevents purchase spam
 */
export const shopRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(15, "60 s"),
      prefix: "ratelimit:shop",
      analytics: true,
    })
  : null;

/**
 * Training rate limit: 120 requests per minute (2 per second)
 * Allows fast gameplay while preventing abuse
 */
export const trainingRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(120, "60 s"),
      prefix: "ratelimit:training",
      analytics: true,
    })
  : null;

/**
 * Settings rate limit: 20 requests per minute
 * Prevents settings update spam
 */
export const settingsRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "60 s"),
      prefix: "ratelimit:settings",
      analytics: true,
    })
  : null;

/**
 * Billing portal rate limit: 5 requests per minute
 * Prevents portal session spam
 */
export const billingPortalRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "ratelimit:billing-portal",
      analytics: true,
    })
  : null;

/**
 * Helper to check rate limit and return appropriate response
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; headers?: Record<string, string> }> {
  // If rate limiting is not configured, allow all requests
  if (!limiter) {
    return { success: true };
  }

  const result = await limiter.limit(identifier);

  if (!result.success) {
    return {
      success: false,
      headers: {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.reset.toString(),
        "Retry-After": Math.ceil((result.reset - Date.now()) / 1000).toString(),
      },
    };
  }

  return {
    success: true,
    headers: {
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.reset.toString(),
    },
  };
}

