export function autoLockDelayMs(minutes: number): number {
  return Math.max(1, minutes) * 60_000;
}

export function shouldAutoLock(lastActivityAt: number, now: number, minutes: number): boolean {
  return now - lastActivityAt >= autoLockDelayMs(minutes);
}
