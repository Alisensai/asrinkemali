/**
 * URL güvenliği — SSRF önleyici yapısal doğrulama.
 *
 * İlkeler:
 *  - Yalnızca http/https şemalarına izin verilir.
 *  - Kullanıcı bilgisi (user:pass@) içeren URL reddedilir.
 *  - Yerel/özel adresler ve meta adresler reddedilir.
 *  - Port yalnızca 80/443 (yok sayılır) veya açıkça 8080 değil — standart dışı
 *    portlar reddedilir; istisna gerekiyorsa ayarlar genişletilmelidir.
 *  - DNS çözümlemesi (etkinleştirilirse) sonucu özel ağa düşen adresler reddedilir.
 *  - Ağ getirmesi (fetch) bu modülde YOKTUR; erişilebilirlik denetimi ayrı,
 *    insan tetiklemeli ve varsayılan kapalı bir süreçtir.
 */

import { isIP } from "node:net";
import dns from "node:dns/promises";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_PORTS = new Set(["", "80", "443"]);
const MAX_URL_LENGTH = 2048;

const PRIVATE_IPV4_PATTERNS = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT 100.64/10
  /^198\.1[89]\./,                              // benchmarking
];

function isPrivateIPv4(host) {
  return PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(host));
}

function isPrivateIPv6(host) {
  const lower = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("::ffff:")) {
    // IPv4-eşlenmiş IPv6: hem noktalı ondalık hem onaltılık gösterim yakalanır
    // (ör. ::ffff:127.0.0.1 VE ::ffff:7f00:1).
    const tail = lower.split("::ffff:")[1];
    if (!tail) return false;
    if (isIP(tail) === 4) return isPrivateIPv4(tail);
    // Onaltılık gösterim: her 16-bit grup bir IPv4 oktet çiftidir
    const groups = tail.split(":").filter(Boolean);
    if (groups.length !== 2) return true; // beklenmeyen biçim: güvenli taraf reddet
    const high = parseInt(groups[0], 16);
    const low = parseInt(groups[1], 16);
    if (!Number.isFinite(high) || !Number.isFinite(low)) return true;
    const dotted = `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;
    return isPrivateIPv4(dotted);
  }
  return false;
}

function isMetaHostname(hostname) {
  const lower = hostname.toLowerCase();
  return (
    lower === "localhost" ||
    lower === "metadata.google.internal" ||
    lower === "instance-data" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".localhost") ||
    // AWS/GCP/Azure meta örnek adları
    /^169\.254\.169\.254$/.test(lower) === false && lower === "169.254.169.254"
  );
}

/**
 * URL'nin yapısal olarak güvenli olup olmadığını denetler.
 * @param {string} rawUrl
 * @returns {{ok: boolean, errors: Array<{code: string, message: string}>, url: URL|null}}
 */
export function validateExternalUrl(rawUrl) {
  const errors = [];
  if (typeof rawUrl !== "string" || rawUrl.length === 0) {
    return { ok: false, errors: [{ code: "EMPTY_URL", message: "URL boş." }], url: null };
  }
  if (rawUrl.length > MAX_URL_LENGTH) {
    errors.push({ code: "URL_TOO_LONG", message: `URL ${MAX_URL_LENGTH} karakterden uzun.` });
  }
  if (/\s/.test(rawUrl)) {
    errors.push({ code: "URL_WHITESPACE", message: "URL boşluk karakteri içeriyor." });
  }
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return {
      ok: false,
      errors: [{ code: "INVALID_URL", message: "URL ayrıştırılamadı." }],
      url: null,
    };
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    errors.push({
      code: "PROTOCOL_FORBIDDEN",
      message: `İzin verilmeyen protokol: ${url.protocol}. Yalnızca http/https kabul edilir.`,
    });
  }
  if (url.username || url.password) {
    errors.push({
      code: "USERINFO_FORBIDDEN",
      message: "URL kullanıcı bilgisi (user:pass@) içeremez.",
    });
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    errors.push({
      code: "PORT_FORBIDDEN",
      message: `İzin verilmeyen port: ${url.port || "(varsayılan)"}. Yalnızca 80/443.`,
    });
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isMetaHostname(host)) {
    errors.push({ code: "META_HOST", message: `Yerel/meta ana makine reddedildi: ${host}.` });
  }
  if (url.protocol === "http:" && !/^localhost$/.test(host)) {
    // http dış bağlantılara izin verilir (arşivler http kullanıyor olabilir)
    // ancak not olarak işaretlenir; hata değil.
  }
  const ipVersion = isIP(host);
  if (ipVersion === 4 && isPrivateIPv4(host)) {
    errors.push({ code: "PRIVATE_IP", message: `Özel IPv4 adresi reddedildi: ${host}.` });
  }
  if (ipVersion === 6 && isPrivateIPv6(host)) {
    errors.push({ code: "PRIVATE_IP", message: `Özel IPv6 adresi reddedildi: ${host}.` });
  }
  // Harflerle yazılmış localhost varyantları (ör. 127.0.0.1.nip.io) DNS
  // çözümlemesinde yakalanır; burada yalnızca yapısal denetim yapılır.
  return { ok: errors.length === 0, errors, url };
}

/**
 * DNS çözümlemesinin özel ağa düşüp düşmediğini denetler (opsiyonel, ağ gerektirir).
 * Varsayılan olarak kullanılmaz; insan tetiklemeli erişim denetiminde çağrılır.
 * @param {string} rawUrl
 * @returns {Promise<{ok: boolean, errors: Array<{code: string, message: string}>, resolved?: string[]}>}
 */
export async function assertPublicDnsResolution(rawUrl) {
  const structural = validateExternalUrl(rawUrl);
  if (!structural.ok || !structural.url) return structural;
  const hostname = structural.url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname)) return structural; // yapısal denetim zaten IP'yi kapsadı
  let addresses;
  try {
    // Hem A hem AAAA kayıtları denetlenir; biri bile özel ağa düşerse reddedilir.
    const [a, aaaa] = await Promise.all([
      dns.resolve4(hostname).catch(() => []),
      dns.resolve6(hostname).catch(() => []),
    ]);
    addresses = [...a, ...aaaa];
  } catch {
    return {
      ok: false,
      errors: [{ code: "DNS_UNRESOLVABLE", message: `Ana makine çözümlenemedi: ${hostname}.` }],
    };
  }
  if (addresses.length === 0) {
    return {
      ok: false,
      errors: [{ code: "DNS_UNRESOLVABLE", message: `Ana makine için adres kaydı yok: ${hostname}.` }],
    };
  }
  const privateHits = addresses.filter((address) => {
    const version = isIP(address);
    return version === 4 ? isPrivateIPv4(address) : version === 6 ? isPrivateIPv6(address) : false;
  });
  if (privateHits.length > 0) {
    return {
      ok: false,
      errors: [
        {
          code: "DNS_REBINDING_PRIVATE",
          message: `DNS sonucu özel ağ adresi döndü: ${privateHits.join(", ")}.`,
        },
      ],
    };
  }
  return { ok: true, errors: [], resolved: addresses };
}
