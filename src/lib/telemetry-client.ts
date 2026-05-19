"use client";

export type TelemetryEventName =
  | "upgrade_page_view"
  | "upgrade_cta_click"
  | "seo_cta_click"
  | "training_start"
  | "training_first_answer"
  | "training_complete"
  | "signup_cta_click";

export function trackEvent(
  eventName: TelemetryEventName,
  properties: Record<string, unknown> = {}
) {
  void fetch("/api/telemetry/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, properties }),
    keepalive: true,
  }).catch(() => {});
}
