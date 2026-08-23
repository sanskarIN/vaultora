import { describe, expect, it } from "vitest";
import { filterEntries, parseTags, safeExternalUrl, shouldAutoLock } from "./utils";
import type { EntrySummary } from "./types";

const entries: EntrySummary[] = [
  { id: "1", kind: "login", name: "Example", username: "alice", url: "https://example.com", tags: ["work"], favorite: true, updated_at: "2026-08-22T00:00:00Z" },
  { id: "2", kind: "secure_note", name: "Recovery note", username: "", url: "", tags: ["personal"], favorite: false, updated_at: "2026-08-22T00:00:00Z" },
];

describe("filterEntries", () => {
  it("searches non-secret summary fields", () => {
    expect(filterEntries(entries, "alice", "all", false).map((entry) => entry.id)).toEqual(["1"]);
  });
  it("combines type and favorite filters", () => {
    expect(filterEntries(entries, "", "login", true).map((entry) => entry.id)).toEqual(["1"]);
    expect(filterEntries(entries, "", "secure_note", true)).toEqual([]);
  });
});

describe("parseTags", () => {
  it("normalizes and deduplicates tags", () => {
    expect(parseTags("Work, personal, work,  ")).toEqual(["work", "personal"]);
  });
});

describe("safeExternalUrl", () => {
  it("allows only http and https", () => {
    expect(safeExternalUrl("https://example.com")).toMatch(/^https:/);
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("shouldAutoLock", () => {
  it("locks exactly at the configured inactivity boundary", () => {
    const start = 1_000_000;
    expect(shouldAutoLock(start, start + 9 * 60_000 + 59_999, 10)).toBe(false);
    expect(shouldAutoLock(start, start + 10 * 60_000, 10)).toBe(true);
  });

  it("fails closed for invalid or backwards time inputs", () => {
    expect(shouldAutoLock(Number.NaN, 1_000, 10)).toBe(true);
    expect(shouldAutoLock(2_000, 1_000, 10)).toBe(true);
    expect(shouldAutoLock(1_000, 2_000, 0)).toBe(true);
  });
});
