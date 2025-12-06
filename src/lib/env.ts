import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL"),
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
});

export const env = envSchema.parse(process.env);
