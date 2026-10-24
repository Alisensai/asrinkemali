/**
 * MKA FORTRESS X — PROJECT BLACKOUT ortak tipleri.
 *
 * BLACKOUT bir karar motorudur: olayları sınıflandırır, müdahale planı önerir, yüksek etkili
 * adımlar için doğrulanmış insan onayı ister ve yalnız açık arayüzler (port) üzerinden yürütür.
 * Hiçbir eylem veri silmez, yedek imha etmez veya günlük yok etmez; bu tür eylemler tip
 * düzeyinde tanımlı değildir ve yürütücü çalışma anında da reddeder.
 */

export const SEVERITIES = ["info", "low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];
export const severityRank = (severity: Severity): number => SEVERITIES.indexOf(severity);

export type EventKind =
  | "admin_route_probe"
  | "csp_violation"
  | "rate_anomaly"
  | "auth_failure_burst"
  | "integrity_unexpected_change"
  | "audit_chain_broken"
  | "secret_exposed"
  | "privileged_session_anomaly"
  | "approval_forgery_attempt"
  | "dependency_critical_vuln"
  | "data_exfiltration_suspected"
  | "unknown";

export type EventSource =
  | "proxy"
  | "csp_report"
  | "integrity_tool"
  | "secrets_tool"
  | "supply_chain_tool"
  | "audit_chain"
  | "identity_provider"
  | "waf"
  | "ids"
  | "siem"
  | "manual_report"
  | "test_harness";

export interface SecurityEvent {
  id: string;
  kind: EventKind;
  source: EventSource;
  /** Epoch ms. */
  observedAt: number;
  /** Kaynağın kendi güven puanı, 0..1. */
  confidence: number;
  /** Etkilenen oturum/kullanıcı/kayıt kimliği (varsa). */
  subject?: string;
  detail?: string;
  /** Deterministik araç kanıtının SHA-256 özeti (ör. integrity diff raporu). */
  evidenceSha256?: string;
}

/** 0 NORMAL · 1 WATCH (izleme) · 2 RESTRICTED (kritik API kapalı) · 3 LOCKDOWN (salt-okunur güvenli mod). */
export type BlackoutLevel = 0 | 1 | 2 | 3;
export const LEVEL_NAMES = ["NORMAL", "WATCH", "RESTRICTED", "LOCKDOWN"] as const;
export type LevelName = (typeof LEVEL_NAMES)[number];

export type SessionScope = "suspicious" | "privileged" | "all";

export type ResponseAction =
  | { type: "preserve_evidence" }
  | { type: "notify_responders" }
  | { type: "revoke_sessions"; scope: SessionScope }
  | { type: "disable_critical_api" }
  | { type: "enable_critical_api" }
  | { type: "freeze_writes" }
  | { type: "unfreeze_writes" }
  | { type: "enable_read_only_mode" }
  | { type: "disable_read_only_mode" };

export type ActionType = ResponseAction["type"];

export const ALLOWED_ACTION_TYPES: readonly ActionType[] = [
  "preserve_evidence",
  "notify_responders",
  "revoke_sessions",
  "disable_critical_api",
  "enable_critical_api",
  "freeze_writes",
  "unfreeze_writes",
  "enable_read_only_mode",
  "disable_read_only_mode",
];

/** Asla yürütülmeyecek eylemler. Yürütücü bu adları (ve listede olmayan her şeyi) reddeder. */
export const FORBIDDEN_ACTION_TYPES = [
  "delete_data",
  "destroy_backups",
  "purge_logs",
  "disable_logging",
  "wipe_storage",
  "drop_database",
  "rotate_and_discard_keys",
] as const;

export type ActionImpact = "automatic" | "single_approval" | "dual_approval";
