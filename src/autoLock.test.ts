import { describe, expect, it } from "vitest";
import { autoLockDelayMs, shouldAutoLock } from "./autoLock";

describe("auto-lock timing", () => {
  it("converts configured minutes to milliseconds", () => {
    expect(autoLockDelayMs(5)).toBe(300_000);
  });

  it("never produces a delay shorter than one minute", () => {
    expect(autoLockDelayMs(0)).toBe(60_000);
  });

  it("locks at the configured inactivity threshold", () => {
    expect(shouldAutoLock(1_000, 61_000, 1)).toBe(true);
    expect(shouldAutoLock(1_000, 60_999, 1)).toBe(false);
  });

  it("detects long mobile background periods immediately on resume", () => {
    const hiddenAt = 10_000;
    const resumedAt = hiddenAt + 15 * 60_000;
    expect(shouldAutoLock(hiddenAt, resumedAt, 10)).toBe(true);
  });
});
