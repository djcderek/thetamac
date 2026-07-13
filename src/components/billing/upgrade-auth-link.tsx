"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";
import type { UpgradeFeature } from "@/lib/upgrade";

export function UpgradeAuthLink({
  href,
  feature,
  source,
  className,
  children,
}: {
  href: string;
  feature?: UpgradeFeature;
  source?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, {
          feature,
          entry_source: source ?? "direct",
          surface: "upgrade",
          auth_state: "guest",
          action: "authenticate_for_trial",
        });
      }}
    >
      {children}
    </Link>
  );
}
