/**
 * MKA FORTRESS — sunucu tarafı yapılandırılmış günlük ve hassas bilgi redaksiyonu.
 * Günlüklere parola, belirteç, çerez veya anahtar yazılmaz; hata yığınları ziyaretçiye gösterilmez.
 */
export type LogLevel = "info" | "warn" | "error";
export type ErrorClass = "input" | "data" | "config" | "dependency" | "internal";

const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|api[-_]?key|session|credential|private/i;
const SENSITIVE_VALUE: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /\bBasic\s+[A-Za-z0-9+/]{8,}=*/gi,
  /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}\b/g,
  /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[DERİN]";
  if (typeof value === "string") return SENSITIVE_VALUE.reduce((text, pattern) => text.replace(pattern, "[REDACTED]"), value);
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(item, depth + 1)]));
  return value;
}

/** Hata sınıflandırması: yanıt kodu ve uyarı kararı için; mesaj ziyaretçiye gösterilmez. */
export function classifyError(error: unknown): ErrorClass {
  const code = (error as { code?: string })?.code ?? "";
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof SyntaxError || /JSON/i.test(message)) return "data";
  if (["ENOENT", "EACCES", "EISDIR"].includes(code)) return "config";
  if (["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"].includes(code)) return "dependency";
  if (error instanceof RangeError || error instanceof TypeError && /invalid|geçersiz/i.test(message)) return "input";
  return "internal";
}

export function logEvent(level: LogLevel, event: string, fields: Record<string, unknown> = {}, sink: (line: string) => void = (line) => (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line)) {
  const safe = redact(fields) as Record<string, unknown>;
  sink(JSON.stringify({ at: new Date().toISOString(), level, event, ...safe }));
}

/** Hata nesnesini günlük için güvenli alanlara indirger (yığın yalnız sunucu günlüğünde, redakte). */
export function errorFields(error: unknown) {
  const base = { errorClass: classifyError(error), errorName: error instanceof Error ? error.name : typeof error };
  return { ...base, errorMessage: redact(error instanceof Error ? error.message : String(error)), stack: process.env.NODE_ENV === "development" && error instanceof Error ? redact(error.stack) : undefined };
}
