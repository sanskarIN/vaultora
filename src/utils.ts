import type { EntryKind, EntrySummary, ThemePreference } from "./types";

export function filterEntries(
  entries: EntrySummary[],
  query: string,
  kind: EntryKind | "all",
  favoritesOnly: boolean,
): EntrySummary[] {
  const normalized = query.trim().toLocaleLowerCase();
  return entries.filter((entry) => {
    if (kind !== "all" && entry.kind !== kind) return false;
    if (favoritesOnly && !entry.favorite) return false;
    if (!normalized) return true;
    const haystack = [entry.name, entry.username, entry.url, ...entry.tags]
      .join("\n")
      .toLocaleLowerCase();
    return haystack.includes(normalized);
  });
}

export function kindLabel(kind: EntryKind): string {
  if (kind === "login") return "Login";
  if (kind === "secure_note") return "Secure note";
  return "Identity";
}

export function parseTags(value: string): string[] {
  return [...new Set(value.split(",").map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean))];
}

export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
}

export function shouldAutoLock(lastActivityAt: number, now: number, autoLockMinutes: number): boolean {
  if (!Number.isFinite(lastActivityAt) || !Number.isFinite(now) || !Number.isFinite(autoLockMinutes)) {
    return true;
  }
  if (autoLockMinutes <= 0 || now < lastActivityAt) {
    return true;
  }
  return now - lastActivityAt >= autoLockMinutes * 60_000;
}

export function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function safeExternalUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
