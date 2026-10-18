"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";
import { claimMobileTrainingAnnouncement } from "@/lib/mobile-training-announcement";

export function MobileTrainingAnnouncement({
  ready,
  returningAccount,
}: {
  ready: boolean;
  returningAccount: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const mobile = window.matchMedia("(max-width: 767px)");
    const showOnce = () => {
      try {
        if (claimMobileTrainingAnnouncement(window.localStorage, {
          mobileSetup: mobile.matches,
          returningAccount,
        })) {
          setVisible(true);
          captureAnalyticsEvent(ANALYTICS_EVENTS.mobileTrainingUpdateViewed, {
            surface: "training_setup",
          });
        }
      } catch {
        // Storage access can be disabled without affecting training.
      }
    };
    showOnce();
    mobile.addEventListener("change", showOnce);
    return () => mobile.removeEventListener("change", showOnce);
  }, [ready, returningAccount]);

  if (!visible) return null;

  return (
    <aside aria-label="Mobile training update" className="mb-5 rounded-lg border border-border bg-muted/30 px-3 pb-3 md:hidden">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Easier mobile training</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11"
          onClick={() => {
            setVisible(false);
            captureAnalyticsEvent(ANALYTICS_EVENTS.mobileTrainingUpdateDismissed, {
              surface: "training_setup",
            });
          }}
        >
          Got it
        </Button>
      </div>
      <p className="text-xs leading-5 text-foreground">
        More room for problems, manual submit up front, and saved guest settings.
      </p>
    </aside>
  );
}
