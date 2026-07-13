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

const PRODUCT_SURVEY_CSS_VARIABLES = {
  "--ph-survey-background-color": "#f7f3ec",
  "--ph-survey-border-color": "#d8d0c5",
  "--ph-survey-border-radius": "16px",
  "--ph-survey-box-padding": "18px 20px",
  "--ph-survey-box-shadow": "0 16px 44px rgba(32, 27, 20, 0.14)",
  "--ph-survey-font-family": "inherit",
  "--ph-survey-input-background": "#fffdf9",
  "--ph-survey-input-text-color": "#181613",
  "--ph-survey-max-width": "360px",
  "--ph-survey-outline-color": "rgba(238, 101, 52, 0.42)",
  "--ph-survey-rating-active-bg-color": "#ee6534",
  "--ph-survey-rating-active-text-color": "#ffffff",
  "--ph-survey-rating-bg-color": "#fffdf9",
  "--ph-survey-rating-text-color": "#181613",
  "--ph-survey-submit-button-color": "#ee6534",
  "--ph-survey-submit-button-text-color": "#ffffff",
  "--ph-survey-text-primary-color": "#181613",
  "--ph-survey-text-subtle-color": "#6f675e",
} as const;

function applyProductSurveyAppearance(surveyId: string): boolean {
  const container = document.getElementsByClassName(
    `PostHogSurvey-${surveyId}`
  )[0];
  if (!(container instanceof HTMLElement)) return false;

  for (const [property, value] of Object.entries(
    PRODUCT_SURVEY_CSS_VARIABLES
  )) {
    container.style.setProperty(property, value);
  }
  return true;
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
        const surveyId = capturedEvent.properties?.$survey_id;
        if (typeof surveyId === "string") {
          applyProductSurveyAppearance(surveyId);
        }
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
    let appearanceObserver: MutationObserver | null = null;

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

            appearanceObserver = new MutationObserver(() => {
              if (applyProductSurveyAppearance(survey.id)) {
                appearanceObserver?.disconnect();
                appearanceObserver = null;
              }
            });
            appearanceObserver.observe(document.documentElement, {
              childList: true,
              subtree: true,
            });

            posthog.displaySurvey(survey.id, {
              displayType: "popover",
              ignoreConditions: false,
              ignoreDelay: false,
            });
            if (applyProductSurveyAppearance(survey.id)) {
              appearanceObserver.disconnect();
              appearanceObserver = null;
            }

            pendingTimeout = setTimeout(() => {
              appearanceObserver?.disconnect();
              appearanceObserver = null;
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
      appearanceObserver?.disconnect();
    };
  }, [enabled, surface]);

  return null;
}
