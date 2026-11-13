export const REVIEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function isWithinReviewWindow(deliveredAt: Date | null, now: Date) {
  if (!deliveredAt) return false;
  const age = now.getTime() - deliveredAt.getTime();
  return age >= 0 && age <= REVIEW_WINDOW_MS;
}
