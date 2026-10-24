import {
  severityRank,
  type BlackoutLevel,
  type EventKind,
  type EventSource,
  type ResponseAction,
  type SecurityEvent,
  type Severity,
} from "./types.ts";

/**
 * Olay sınıflandırma ve müdahale düzeyi kararı (saf, deterministik).
 *
 * Yanlış alarm korumaları:
 *  - Geçersiz, gelecekten gelen, pencere dışı ve yinelenen olaylar atılır.
 *  - `test_harness` kaynaklı olaylar her zaman `info` sayılır (tatbikat gerçek müdahale başlatmaz).
 *  - Düşük güvenli (confidence < 0.5) olaylar bir önem düzeyi düşürülür.
 *  - RESTRICTED/LOCKDOWN için doğrulama gerekir: en az iki bağımsız otomatik kaynak, ya da
 *    deterministik araçtan (integrity/audit/secrets) kanıt özetli, yüksek güvenli kritik olay.
 *    Tek kaynaklı veya yalnız elle bildirilen olaylar en fazla WATCH üretir.
 *  - Düşük önemli olayların çokluğu (tarayıcı gürültüsü) yalnız WATCH'a yükseltir, asla kısıtlamaz.
 */

export const BASE_SEVERITY: Record<EventKind, Severity> = {
  admin_route_probe: "low",
  csp_violation: "low",
  rate_anomaly: "medium",
  auth_failure_burst: "medium",
  dependency_critical_vuln: "high",
  privileged_session_anomaly: "high",
  approval_forgery_attempt: "high",
  integrity_unexpected_change: "critical",
  audit_chain_broken: "critical",
  secret_exposed: "critical",
  data_exfiltration_suspected: "critical",
  unknown: "low",
};

/** Bulguyu deterministik olarak yeniden üretebilen araç kaynakları. */
export const VERIFYING_SOURCES: readonly EventSource[] = ["integrity_tool", "audit_chain", "secrets_tool"];

export interface ClassifiedEvent extends SecurityEvent {
  severity: Severity;
  classificationReason: string;
}

export function classifyEvent(event: SecurityEvent): ClassifiedEvent {
  if (event.source === "test_harness") return { ...event, severity: "info", classificationReason: "tatbikat-kaynağı" };
  const base = BASE_SEVERITY[event.kind] ?? "low";
  if (event.confidence < 0.5 && severityRank(base) > 0) {
    const lowered = (["info", "low", "medium", "high", "critical"] as const)[severityRank(base) - 1];
    return { ...event, severity: lowered, classificationReason: "düşük-güven-bir-düzey-indirildi" };
  }
  return { ...event, severity: base, classificationReason: "temel-önem" };
}

export interface EvaluationOptions {
  windowMs?: number;
  minIndependentSources?: number;
  lowSeverityBurstThreshold?: number;
}

export interface IncidentAssessment {
  recommendedLevel: BlackoutLevel;
  maxSeverity: Severity;
  corroborated: boolean;
  considered: ClassifiedEvent[];
  discarded: { id: string; reason: string }[];
  reasons: string[];
  actions: ResponseAction[];
}

function isValidEvent(event: SecurityEvent, now: number, windowMs: number): string | null {
  if (!event || typeof event.id !== "string" || !event.id.trim()) return "kimliksiz";
  if (!Number.isFinite(event.observedAt)) return "zaman-damgası-geçersiz";
  if (event.observedAt > now + 60_000) return "gelecekten-gelen";
  if (now - event.observedAt > windowMs) return "pencere-dışı";
  if (!Number.isFinite(event.confidence) || event.confidence < 0 || event.confidence > 1) return "güven-aralık-dışı";
  if (!(event.kind in BASE_SEVERITY)) return "bilinmeyen-tür";
  return null;
}

export function actionsForLevel(level: BlackoutLevel): ResponseAction[] {
  if (level === 0) return [];
  const actions: ResponseAction[] = [{ type: "preserve_evidence" }, { type: "notify_responders" }];
  if (level >= 2) actions.push({ type: "revoke_sessions", scope: "suspicious" }, { type: "disable_critical_api" });
  if (level >= 3) actions.push({ type: "revoke_sessions", scope: "privileged" }, { type: "freeze_writes" }, { type: "enable_read_only_mode" });
  return actions;
}

export function evaluateIncident(events: readonly SecurityEvent[], now: number, options: EvaluationOptions = {}): IncidentAssessment {
  const windowMs = options.windowMs ?? 15 * 60_000;
  const minSources = options.minIndependentSources ?? 2;
  const burstThreshold = options.lowSeverityBurstThreshold ?? 50;

  const seen = new Set<string>();
  const discarded: IncidentAssessment["discarded"] = [];
  const considered: ClassifiedEvent[] = [];
  for (const event of events) {
    const invalid = isValidEvent(event, now, windowMs);
    if (invalid) { discarded.push({ id: String(event?.id ?? ""), reason: invalid }); continue; }
    if (seen.has(event.id)) { discarded.push({ id: event.id, reason: "yinelenen" }); continue; }
    seen.add(event.id);
    considered.push(classifyEvent(event));
  }

  const reasons: string[] = [];
  const maxSeverity = considered.reduce<Severity>((max, e) => (severityRank(e.severity) > severityRank(max) ? e.severity : max), "info");
  const serious = considered.filter((e) => severityRank(e.severity) >= severityRank("high"));
  const automaticSources = new Set(serious.filter((e) => e.source !== "manual_report").map((e) => e.source));
  const verifiedCritical = serious.some(
    (e) => e.severity === "critical" && VERIFYING_SOURCES.includes(e.source) && e.confidence >= 0.9 && /^[0-9a-f]{64}$/.test(e.evidenceSha256 ?? ""),
  );
  const corroborated = verifiedCritical || automaticSources.size >= minSources;

  let level: BlackoutLevel = 0;
  if (maxSeverity === "critical" && corroborated) { level = 3; reasons.push(verifiedCritical ? "kanıtlı-kritik-araç-bulgusu" : "bağımsız-kaynaklarca-doğrulanmış-kritik"); }
  else if (maxSeverity === "high" && corroborated) { level = 2; reasons.push("bağımsız-kaynaklarca-doğrulanmış-yüksek"); }
  else if (severityRank(maxSeverity) >= severityRank("medium")) {
    level = 1;
    reasons.push(severityRank(maxSeverity) >= severityRank("high") ? "doğrulanmamış-yüksek-önem-yalnız-izleme" : "orta-önem-izleme");
  }
  const lowCount = considered.filter((e) => e.severity === "low").length;
  if (level === 0 && lowCount >= burstThreshold) { level = 1; reasons.push("düşük-önem-yoğunluğu-yalnız-izleme"); }
  if (level === 0) reasons.push("müdahale-gerekmiyor");

  return { recommendedLevel: level, maxSeverity, corroborated, considered, discarded, reasons, actions: actionsForLevel(level) };
}
