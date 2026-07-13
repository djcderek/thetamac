import { PostHog } from "posthog-node";

import {
  type AnalyticsEventName,
  type AnalyticsProperties,
  sanitizeAnalyticsProperties,
} from "@/lib/analytics";

function createPostHogClient(): PostHog | null {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const captureOutsideProduction =
    process.env.NEXT_PUBLIC_POSTHOG_ENABLE_NON_PRODUCTION === "true";
  if (
    !token ||
    (process.env.NODE_ENV !== "production" && !captureOutsideProduction)
  ) {
    return null;
  }

  return new PostHog(token, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
}

export async function captureServerAnalyticsEvent({
  distinctId,
  event,
  properties = {},
  insertId,
}: {
  distinctId: string;
  event: AnalyticsEventName;
  properties?: AnalyticsProperties;
  insertId?: string;
}): Promise<void> {
  const client = createPostHogClient();
  if (!client) return;

  try {
    client.capture({
      distinctId,
      event,
      properties: {
        ...sanitizeAnalyticsProperties(properties),
        ...(insertId ? { $insert_id: insertId } : {}),
      },
    });
    await client.shutdown();
  } catch (error) {
    await client.shutdown().catch(() => undefined);
    console.warn("PostHog server capture failed", {
      event,
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
