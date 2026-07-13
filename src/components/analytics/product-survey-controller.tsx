"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";

import { hasOptedOutOfAnalytics } from "@/lib/analytics-client";
import {
  PRODUCT_SURVEY_LAST_SHOWN_KEY,
  PRODUCT_SURVEY_PENDING_KEY,
  PRODUCT_SURVEY_PENDING_TTL_MS,
  parseSurveyTimestamp,
  selectProductSurvey,
  shouldAttemptProductSurvey,
  type ProductSurveySurface,
} from "@/lib/product-surveys";

interface CapturedPostHogEvent {
  event?: string;
  properties?: Record<string, unknown>;
}

function readStoredTimestamp(storage: Storage, key: string): number | null {
  try {
    return parseSurveyTimestamp(storage.getItem(key));
  } catch {
    return null;
  }
}

function writeStoredTimestamp(storage: Storage, key: string, value: number) {
  try {
    storage.setItem(key, String(value));
  } catch {
    // Survey state is best-effort and must never interrupt the product.
  }
}

function removeStoredTimestamp(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Survey state is best-effort and must never interrupt the product.
  }
}

export function ProductSurveyController({
  surface,
  enabled,
}: {
  surface: ProductSurveySurface;
  enabled: boolean;
}) {
  const attemptLockedRef = useRef(false);
  const selectedSurveyIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = posthog.on(
      "eventCaptured",
      (capturedEvent: CapturedPostHogEvent) => {
        if (capturedEvent.event !== "survey shown") return;
        if (
          selectedSurveyIdRef.current &&
          capturedEvent.properties?.$survey_id !== selectedSurveyIdRef.current
        ) {
          return;
        }

        writeStoredTimestamp(
          window.localStorage,
          PRODUCT_SURVEY_LAST_SHOWN_KEY,
          Date.now()
        );
        removeStoredTimestamp(window.sessionStorage, PRODUCT_SURVEY_PENDING_KEY);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (attemptLockedRef.current) return;

    const now = Date.now();
    const lastShownAt = readStoredTimestamp(
      window.localStorage,
      PRODUCT_SURVEY_LAST_SHOWN_KEY
    );
    const pendingAt = readStoredTimestamp(
      window.sessionStorage,
      PRODUCT_SURVEY_PENDING_KEY
    );

    if (
      !shouldAttemptProductSurvey({
        enabled,
        optedOut: hasOptedOutOfAnalytics(),
        now,
        lastShownAt,
        pendingAt,
      })
    ) {
      return;
    }

    let disposed = false;
    let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      posthog.getActiveMatchingSurveys((surveys, context) => {
        if (disposed || context?.isLoaded === false || context?.error) return;

        const survey = selectProductSurvey(surveys, surface);
        if (!survey) return;

        attemptLockedRef.current = true;
        selectedSurveyIdRef.current = survey.id;
        writeStoredTimestamp(
          window.sessionStorage,
          PRODUCT_SURVEY_PENDING_KEY,
          Date.now()
        );

        void posthog
          .canRenderSurveyAsync(survey.id, true)
          .then((result) => {
            if (disposed || !result.visible || hasOptedOutOfAnalytics()) {
              attemptLockedRef.current = false;
              selectedSurveyIdRef.current = null;
              removeStoredTimestamp(
                window.sessionStorage,
                PRODUCT_SURVEY_PENDING_KEY
              );
              return;
            }

            posthog.displaySurvey(survey.id, {
              displayType: "popover",
              ignoreConditions: false,
              ignoreDelay: false,
            });

            pendingTimeout = setTimeout(() => {
              removeStoredTimestamp(
                window.sessionStorage,
                PRODUCT_SURVEY_PENDING_KEY
              );
              attemptLockedRef.current = false;
              selectedSurveyIdRef.current = null;
            }, PRODUCT_SURVEY_PENDING_TTL_MS);
          })
          .catch(() => {
            attemptLockedRef.current = false;
            selectedSurveyIdRef.current = null;
            removeStoredTimestamp(
              window.sessionStorage,
              PRODUCT_SURVEY_PENDING_KEY
            );
          });
      }, true);
    } catch {
      attemptLockedRef.current = false;
      selectedSurveyIdRef.current = null;
      removeStoredTimestamp(window.sessionStorage, PRODUCT_SURVEY_PENDING_KEY);
    }

    return () => {
      disposed = true;
      if (pendingTimeout) clearTimeout(pendingTimeout);
    };
  }, [enabled, surface]);

  return null;
}
