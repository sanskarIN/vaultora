export type EntryKind = "login" | "secure_note" | "identity";
export type ThemePreference = "system" | "light" | "dark";
export type AuditSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface VaultSettings {
  auto_lock_minutes: number;
  clipboard_clear_seconds: number;
  reveal_seconds: number;
  theme: ThemePreference;
}

export interface EntrySummary {
  id: string;
  kind: EntryKind;
  name: string;
  username: string;
  url: string;
  tags: string[];
  favorite: boolean;
  updated_at: string;
}

export interface PasswordHistoryItem {
  secret: string;
  changed_at: string;
}

export interface VaultEntry extends EntrySummary {
  secret: string;
  password_history: PasswordHistoryItem[];
  notes: string;
  fields: Record<string, string>;
  created_at: string;
}

export interface EntryInput {
  id?: string;
  kind: EntryKind;
  name: string;
  username: string;
  url: string;
  secret: string;
  notes: string;
  fields: Record<string, string>;
  tags: string[];
  favorite: boolean;
}

export interface SessionSnapshot {
  entries: EntrySummary[];
  settings: VaultSettings;
}

export interface CommandError {
  code: string;
  message: string;
}

export interface PasswordOptions {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
}

export interface PassphraseOptions {
  words: number;
  separator: string;
  capitalize: boolean;
  append_number: boolean;
}

export interface PasswordStrength {
  score: number;
  entropy_bits: number;
  label: string;
  suggestions: string[];
}

export interface SecurityAuditFinding {
  code: string;
  severity: AuditSeverity;
  entry_id: string;
  entry_name: string;
  message: string;
}

export interface SecurityAuditReport {
  total_entries: number;
  login_entries: number;
  findings: SecurityAuditFinding[];
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  healthy_login_count: number;
}

export type AppScreen = "vault" | "audit" | "generator" | "settings" | "about";
