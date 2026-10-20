"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

// reducedMotion="user": with the OS "reduce motion" setting on, Motion drops transform and
// layout animation and keeps opacity, so morphs become gentle cross-fades.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
