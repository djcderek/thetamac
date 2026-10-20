import type { Transition } from "motion/react";

// House springs (Motion's bounce/duration ≈ Apple's damping/response). Springs start from
// the current on-screen value, so every transition can be interrupted and reversed.

/** Shape morphs (a control expanding into a panel): a little bounce reads as a blob. */
export const morphSpring: Transition = { type: "spring", bounce: 0.2, duration: 0.6 };

/** Sliding indicators and small repositions: critically damped, no overshoot. */
export const snapSpring: Transition = { type: "spring", bounce: 0, duration: 0.35 };

/** Drawers and sheets: quick and critically damped (no flick precedes them). */
export const drawerSpring: Transition = { type: "spring", bounce: 0, duration: 0.4 };

/** Content entering or leaving: calm, no overshoot. */
export const settleSpring: Transition = { type: "spring", bounce: 0, duration: 0.45 };

/** Content inside a morphing surface fades in once the shape has mostly formed. */
export const morphContentIn: Transition = { duration: 0.22, delay: 0.12, ease: [0.22, 1, 0.36, 1] };

/** A small label inside a surface that is shrinking back into a control: appears late. */
export const morphLabelIn: Transition = { duration: 0.18, delay: 0.28, ease: [0.22, 1, 0.36, 1] };

/** Content leaving a morphing surface: gone before the shape changes much. */
export const morphContentOut: Transition = { duration: 0.1, ease: "easeOut" };
