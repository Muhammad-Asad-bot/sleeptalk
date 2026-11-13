import { describe, expect, it } from "vitest";
import { isWithinReviewWindow, REVIEW_WINDOW_MS } from "./review-window";

describe("isWithinReviewWindow", () => {
  const now = new Date("2026-11-13T12:00:00.000Z");

  it("allows reviews through the seven-day boundary", () => {
    expect(isWithinReviewWindow(new Date(now.getTime() - REVIEW_WINDOW_MS), now)).toBe(true);
    expect(isWithinReviewWindow(new Date(now.getTime() - REVIEW_WINDOW_MS - 1), now)).toBe(false);
  });

  it("rejects undelivered and future delivery timestamps", () => {
    expect(isWithinReviewWindow(null, now)).toBe(false);
    expect(isWithinReviewWindow(new Date(now.getTime() + 1), now)).toBe(false);
  });
});
