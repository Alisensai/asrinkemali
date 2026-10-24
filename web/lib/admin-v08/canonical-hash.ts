import { createHash } from "node:crypto";

function encodeCanonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Kanonik JSON sonlu sayı gerektirir.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(encodeCanonicalJson).join(",")}]`;
  }
  if (!value || typeof value !== "object") {
    throw new TypeError("Kanonik JSON yalnızca JSON veri türlerini kabul eder.");
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Kanonik JSON düz nesne gerektirir.");
  }

  const fields = Object.keys(value).sort();
  return `{${fields.map((key) => `${JSON.stringify(key)}:${encodeCanonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

export function canonicalJson(value: unknown): string {
  return encodeCanonicalJson(value);
}

export function sha256CanonicalJson(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}
