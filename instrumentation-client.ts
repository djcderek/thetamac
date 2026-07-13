import posthog from "posthog-js";

import {
  ANALYTICS_OPT_OUT_KEY,
  isAnalyticsOptOutValue,
  stripUrlQuery,
} from "@/lib/analytics";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const captureOutsideProduction =
  process.env.NEXT_PUBLIC_POSTHOG_ENABLE_NON_PRODUCTION === "true";
const shouldInitialize =
  Boolean(token) &&
  (process.env.NODE_ENV === "production" || captureOutsideProduction);

function hasStoredAnalyticsOptOut() {
  if (typeof window === "undefined") return false;
  try {
    return isAnalyticsOptOutValue(
      window.localStorage.getItem(ANALYTICS_OPT_OUT_KEY)
    );
  } catch {
    return false;
  }
}

if (shouldInitialize && token) {
  posthog.init(token, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-05-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
    opt_out_capturing_by_default: hasStoredAnalyticsOptOut(),
    session_recording: {
      maskAllInputs: true,
      recordHeaders: false,
      recordBody: false,
      maskCapturedNetworkRequestFn: (request) => {
        if (request.name) request.name = stripUrlQuery(request.name);
        return request;
      },
    },
  });
}
