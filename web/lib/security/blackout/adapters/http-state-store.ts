import type { BlackoutStateStore, CompareAndSetResult, PortDescriptor } from "../ports.ts";
import type { StoredBlackoutState } from "../state.ts";

/**
 * HTTPS üzerinden paylaşılan BLACKOUT durum deposu adaptörü (KV/REST).
 *
 * Bağlı DEĞİLDİR: bu repoda uç nokta, kimlik bilgisi ve `REGISTERED_STATE_STORE` kaydı yoktur.
 * Uygun bir hizmet (ör. sürüm/ETag destekli KV veya küçük bir kontrol API'si) kurulduğunda
 * kullanılmak üzere bağımsız test edilir. Beklenen uç nokta sözleşmesi:
 *
 *   GET  {endpoint}            → 200 + StoredBlackoutState JSON (yoksa 404 → başlangıç durumu)
 *   PUT  {endpoint}            → gövde: StoredBlackoutState; başlık `If-Match: "<expectedVersion>"`
 *                                200/204 = yazıldı · 409/412 = sürüm çakışması (gövde: { version })
 *
 * Güvenlik: yalnız `https:`; kimlik bilgisi `Authorization: Bearer` başlığında gider, hata
 * mesajlarına ve günlüğe yazılmaz; yanıt boyutu ve süresi sınırlıdır; yönlendirme izlenmez.
 * Taşıma (fetch benzeri) dışarıdan verilir; modül genel ağ çağrısı yapmaz.
 */

export interface HttpTransportResponse { status: number; text(): Promise<string> }
export type HttpTransport = (url: string, init: { method: "GET" | "PUT"; headers: Record<string, string>; body?: string; redirect: "error"; signal?: AbortSignal }) => Promise<HttpTransportResponse>;

export interface HttpStateStoreOptions {
  endpoint: string;
  token: string;
  transport: HttpTransport;
  timeoutMs?: number;
  maxBodyBytes?: number;
}

export type HttpStateStoreErrorCode = "config" | "timeout" | "http_status" | "body_too_large" | "invalid_json" | "transport";

export class HttpStateStoreError extends Error {
  readonly code: HttpStateStoreErrorCode;
  constructor(code: HttpStateStoreErrorCode) {
    super(`http-state-store:${code}`);
    this.name = "HttpStateStoreError";
    this.code = code;
  }
}

export class HttpBlackoutStateStore implements BlackoutStateStore {
  readonly descriptor: PortDescriptor = Object.freeze({ kind: "external", persistence: "remote", productionEligible: true, description: "HTTPS KV/REST durum deposu (yapılandırıldığında)" });
  private readonly endpoint: string;
  private readonly token: string;
  private readonly transport: HttpTransport;
  private readonly timeoutMs: number;
  private readonly maxBodyBytes: number;

  constructor(options: HttpStateStoreOptions) {
    let url: URL;
    try { url = new URL(options.endpoint); } catch { throw new HttpStateStoreError("config"); }
    if (url.protocol !== "https:" || url.username || url.password) throw new HttpStateStoreError("config");
    if (typeof options.token !== "string" || options.token.length < 16) throw new HttpStateStoreError("config");
    if (typeof options.transport !== "function") throw new HttpStateStoreError("config");
    this.endpoint = url.href;
    this.token = options.token;
    this.transport = options.transport;
    this.timeoutMs = options.timeoutMs ?? 250;
    this.maxBodyBytes = options.maxBodyBytes ?? 16_384;
  }

  private async call(method: "GET" | "PUT", headers: Record<string, string>, body?: string): Promise<{ status: number; text: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.transport(this.endpoint, {
        method,
        headers: { Accept: "application/json", Authorization: `Bearer ${this.token}`, ...headers },
        body,
        redirect: "error",
        signal: controller.signal,
      });
      const text = await response.text();
      if (text.length > this.maxBodyBytes) throw new HttpStateStoreError("body_too_large");
      return { status: response.status, text };
    } catch (error) {
      if (error instanceof HttpStateStoreError) throw error;
      // Hata ayrıntısı (URL, başlık, belirteç) dışarı taşınmaz.
      throw new HttpStateStoreError(controller.signal.aborted ? "timeout" : "transport");
    } finally {
      clearTimeout(timer);
    }
  }

  private parse(text: string): unknown {
    try { return JSON.parse(text); } catch { throw new HttpStateStoreError("invalid_json"); }
  }

  async read(): Promise<unknown> {
    const { status, text } = await this.call("GET", {});
    if (status === 404) return null;
    if (status !== 200) throw new HttpStateStoreError("http_status");
    return this.parse(text);
  }

  async compareAndSet(expectedVersion: number, next: StoredBlackoutState): Promise<CompareAndSetResult> {
    const { status, text } = await this.call("PUT", { "Content-Type": "application/json", "If-Match": `"${expectedVersion}"` }, JSON.stringify(next));
    if (status === 200 || status === 204) return { ok: true, version: next.version };
    if (status === 409 || status === 412) {
      const body = text ? this.parse(text) : null;
      const currentVersion = body && typeof body === "object" && Number.isInteger((body as { version?: unknown }).version) ? (body as { version: number }).version : -1;
      return { ok: false, reason: "version_conflict", currentVersion };
    }
    throw new HttpStateStoreError("http_status");
  }
}
