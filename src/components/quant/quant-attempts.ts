/**
 * Saves one answered quant question for review (signed-in players only). Fire and forget:
 * practice never waits on it, and a failed save only means one fewer item in review.
 */
export function recordQuantAttempt(attempt: { lessonId: string; family: string; correct: boolean; seconds: number | null }) {
  fetch("/api/quant/attempts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...attempt, seconds: attempt.seconds === null ? null : Math.min(3600, Math.round(attempt.seconds * 10) / 10) }),
    keepalive: true,
  }).catch(() => {});
}
