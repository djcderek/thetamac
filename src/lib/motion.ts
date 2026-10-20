import type { Transition } from "motion/react";

// House springs (Motion's bounce/duration ≈ Apple's damping/response). Springs start from
// the current on-screen value, so every transition can be interrupted and reversed.

/** Shape morphs (a control expanding into a panel): a little bounce reads as a blob. */
export const morphSpring: Transition = { type: "spring", bounce: 0.2, duration: 0.6 };

/** A morph closing back into its control: settles without overshoot, so it lands cleanly. */
export const closeSpring: Transition = { type: "spring", bounce: 0, duration: 0.42 };

/** Sliding indicators and small repositions: critically damped, no overshoot. */
export const snapSpring: Transition = { type: "spring", bounce: 0, duration: 0.35 };

/** Drawers and sheets: quick and critically damped (no flick precedes them). */
export const drawerSpring: Transition = { type: "spring", bounce: 0, duration: 0.4 };

/** A screen arriving (e.g. a run starting): quick ease-out, no overshoot. */
export const runEnter: Transition = { duration: 0.26, ease: [0.22, 1, 0.36, 1] };

/** Content entering or leaving: calm, no overshoot. */
export const settleSpring: Transition = { type: "spring", bounce: 0, duration: 0.45 };

/** Content inside a morphing surface fades in once the shape has mostly formed. */
export const morphContentIn: Transition = { duration: 0.22, delay: 0.12, ease: [0.22, 1, 0.36, 1] };
