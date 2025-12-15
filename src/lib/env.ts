import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  // Optional override for verifying socket/guest tokens on a separate websocket server (e.g. Fly.io)
  // when it cannot share the same AUTH_SECRET as the main Next.js app (e.g. Vercel).
  SOCKET_AUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  NEXT_PUBLIC_SOCKET_URL: z
    .string()
    .url("NEXT_PUBLIC_SOCKET_URL must be a valid URL")
    .optional(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, "STRIPE_WEBHOOK_SECRET is required"),
  STRIPE_MONTHLY_PRICE_ID: z
    .string()
    .min(1, "STRIPE_MONTHLY_PRICE_ID is required"),
  STRIPE_YEARLY_PRICE_ID: z
    .string()
    .min(1, "STRIPE_YEARLY_PRICE_ID is required"),
  // Upstash Redis for rate limiting (optional - rate limiting disabled if not set)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

// Allow skipping validation for build time
const skipValidation = 
  process.env.SKIP_ENV_VALIDATION === "true" || 
  process.env.npm_lifecycle_event === "lint";

const parsed = envSchema.safeParse(process.env);

if (!parsed.success && !skipValidation) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors
  );
  throw new Error("Invalid environment variables");
}

export const env = parsed.success
  ? parsed.data
  : (process.env as unknown as z.infer<typeof envSchema>);
