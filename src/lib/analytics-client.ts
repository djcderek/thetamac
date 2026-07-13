"use client";

import posthog from "posthog-js";

import {
  ANALYTICS_OPT_OUT_KEY,
  type AnalyticsEventName,
  type AnalyticsProperties,
  isAnalyticsOptOutValue,
  sanitizeAnalyticsProperties,
} from "@/lib/analytics";

export function captureAnalyticsEvent(
  event: AnalyticsEventName,
  properties: AnalyticsProperties = {}
) {
  try {
    posthog.capture(event, sanitizeAnalyticsProperties(properties));
  } catch {
    // Analytics must never interrupt a product workflow.
  }
}

export function createAnalyticsId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function registerAnalyticsSessionProperties(properties: AnalyticsProperties) {
  try {
    posthog.register_for_session(sanitizeAnalyticsProperties(properties));
  } catch {
    // Session context is best-effort.
  }
}

export function clearAnalyticsSessionProperties(...propertyNames: string[]) {
  try {
    for (const propertyName of propertyNames) posthog.unregister_for_session(propertyName);
  } catch {
    // Session context is best-effort.
  }
}

export function hasOptedOutOfAnalytics(): boolean {
  if (typeof window === "undefined") return false;
  return isAnalyticsOptOutValue(window.localStorage.getItem(ANALYTICS_OPT_OUT_KEY));
}

export function setAnalyticsOptOut(optedOut: boolean) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(ANALYTICS_OPT_OUT_KEY, String(optedOut));
  if (optedOut) {
    posthog.opt_out_capturing();
    posthog.stopSessionRecording();
  } else {
    posthog.opt_in_capturing();
    posthog.startSessionRecording();
  }
}
