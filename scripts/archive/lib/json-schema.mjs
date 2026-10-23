/**
 * Küçük, bağımlılıksız JSON Schema (draft 2020-12 alt kümesi) doğrulayıcısı.
 *
 * Desteklenen anahtar sözcükler: $ref, type, const, enum, required, properties,
 * additionalProperties, items, minItems, maxItems, uniqueItems, minLength,
 * maxLength, pattern, format (date, date-time, uri), minimum, maximum,
 * allOf, anyOf, oneOf, not, if/then/else.
 *
 * Amaç, arşiv şemasını harici bir npm bağımlılığı olmadan denetlemektir.
 */

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function matchesType(value, type) {
  switch (type) {
    case "null":
      return value === null;
    case "array":
      return Array.isArray(value);
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value);
    case "integer":
      return Number.isInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    default:
      return false;
  }
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== "object") return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidDateTime(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return false;
  }
  return Number.isFinite(Date.parse(value));
}

function isValidUri(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const url = new URL(value);
    return Boolean(url.protocol && url.protocol.endsWith(":"));
  } catch {
    return false;
  }
}

function isValidFormat(value, format) {
  switch (format) {
    case "date":
      return isValidDate(value);
    case "date-time":
      return isValidDateTime(value);
    case "uri":
      return isValidUri(value);
    default:
      return true;
  }
}

function formatPath(path, key) {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return `${path}.${key}`;
  return `${path}[${JSON.stringify(key)}]`;
}

function resolveRef(ref, rootSchema) {
  if (typeof ref !== "string" || !ref.startsWith("#/")) {
    throw new Error(`Desteklenmeyen $ref: ${String(ref)}`);
  }
  return ref
    .slice(2)
    .split("/")
    .map((part) => decodeURIComponent(part.replace(/~1/g, "/").replace(/~0/g, "~")))
    .reduce((node, part) => (node == null ? undefined : node[part]), rootSchema);
}

function collect(value, schema, path, rootSchema) {
  const errors = [];
  if (schema === true || schema === undefined) return errors;
  if (schema === false) {
    errors.push({ path, message: "Şema bu değeri kabul etmiyor." });
    return errors;
  }
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) {
    errors.push({ path, message: "Geçersiz şema düğümü." });
    return errors;
  }

  if (typeof schema.$ref === "string") {
    const target = resolveRef(schema.$ref, rootSchema);
    if (target === undefined) {
      errors.push({ path, message: `Çözülemeyen $ref: ${schema.$ref}` });
    } else {
      errors.push(...collect(value, target, path, rootSchema));
    }
  }

  if (hasOwn(schema, "type")) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(value, type))) {
      errors.push({
        path,
        message: `Beklenen tür ${types.join(" | ")}, gelen ${typeOf(value)}.`,
      });
      return errors;
    }
  }

  if (hasOwn(schema, "const") && !deepEqual(value, schema.const)) {
    errors.push({ path, message: `Sabit değer ${JSON.stringify(schema.const)} olmalı.` });
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((item) => deepEqual(value, item))) {
    errors.push({
      path,
      message: `Değer izin verilenlerden biri olmalı: ${schema.enum
        .map((item) => JSON.stringify(item))
        .join(", ")}.`,
    });
  }

  if (typeof value === "string") {
    const length = [...value].length;
    if (typeof schema.minLength === "number" && length < schema.minLength) {
      errors.push({ path, message: `En az ${schema.minLength} karakter olmalı (${length}).` });
    }
    if (typeof schema.maxLength === "number" && length > schema.maxLength) {
      errors.push({ path, message: `En çok ${schema.maxLength} karakter olmalı (${length}).` });
    }
    if (typeof schema.pattern === "string") {
      let pattern;
      try {
        pattern = new RegExp(schema.pattern, "u");
      } catch {
        errors.push({ path, message: `Geçersiz şema deseni: ${schema.pattern}` });
      }
      if (pattern && !pattern.test(value)) {
        errors.push({ path, message: `Değer desene uymuyor: ${schema.pattern}` });
      }
    }
    if (typeof schema.format === "string" && !isValidFormat(value, schema.format)) {
      errors.push({ path, message: `Geçersiz ${schema.format} biçimi: ${value}` });
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      errors.push({ path, message: `En az ${schema.minimum} olmalı (${value}).` });
    }
    if (typeof schema.maximum === "number" && value > schema.maximum) {
      errors.push({ path, message: `En çok ${schema.maximum} olmalı (${value}).` });
    }
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      errors.push({ path, message: `En az ${schema.minItems} öğe olmalı (${value.length}).` });
    }
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
      errors.push({ path, message: `En çok ${schema.maxItems} öğe olmalı (${value.length}).` });
    }
    if (schema.uniqueItems === true) {
      const seen = new Set();
      value.forEach((item, index) => {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          errors.push({ path: `${path}[${index}]`, message: "Yinelenen dizi öğesi." });
        }
        seen.add(key);
      });
    }
    if (schema.items !== undefined) {
      value.forEach((item, index) => {
        errors.push(...collect(item, schema.items, `${path}[${index}]`, rootSchema));
      });
    }
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!hasOwn(value, key)) {
          errors.push({ path: formatPath(path, key), message: "Zorunlu alan eksik." });
        }
      }
    }
    const properties = schema.properties && typeof schema.properties === "object" ? schema.properties : {};
    for (const [key, childSchema] of Object.entries(properties)) {
      if (hasOwn(value, key)) {
        errors.push(...collect(value[key], childSchema, formatPath(path, key), rootSchema));
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!hasOwn(properties, key)) {
          errors.push({ path: formatPath(path, key), message: "Şemada tanımsız alan." });
        }
      }
    } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      for (const key of Object.keys(value)) {
        if (!hasOwn(properties, key)) {
          errors.push(
            ...collect(value[key], schema.additionalProperties, formatPath(path, key), rootSchema)
          );
        }
      }
    }
    if (typeof schema.minProperties === "number" && Object.keys(value).length < schema.minProperties) {
      errors.push({ path, message: `En az ${schema.minProperties} alan olmalı.` });
    }
    if (typeof schema.maxProperties === "number" && Object.keys(value).length > schema.maxProperties) {
      errors.push({ path, message: `En çok ${schema.maxProperties} alan olmalı.` });
    }
  }

  if (Array.isArray(schema.allOf)) {
    schema.allOf.forEach((subSchema, index) => {
      errors.push(...collect(value, subSchema, `${path}.allOf[${index}]`, rootSchema));
    });
  }

  if (Array.isArray(schema.anyOf)) {
    const results = schema.anyOf.map((subSchema) => collect(value, subSchema, path, rootSchema));
    if (!results.some((result) => result.length === 0)) {
      errors.push({ path, message: "anyOf: hiçbir alt şema eşleşmedi." });
    }
  }

  if (Array.isArray(schema.oneOf)) {
    const results = schema.oneOf.map((subSchema) => collect(value, subSchema, path, rootSchema));
    const matches = results.filter((result) => result.length === 0).length;
    if (matches !== 1) {
      errors.push({ path, message: `oneOf: tam olarak 1 eşleşme gerekli, ${matches} bulundu.` });
    }
  }

  if (schema.not !== undefined) {
    const result = collect(value, schema.not, path, rootSchema);
    if (result.length === 0) {
      errors.push({ path, message: "not: değer yasaklı şemayla eşleşiyor." });
    }
  }

  if (schema.if !== undefined) {
    const condition = collect(value, schema.if, path, rootSchema);
    if (condition.length === 0 && schema.then !== undefined) {
      errors.push(...collect(value, schema.then, path, rootSchema));
    }
    if (condition.length > 0 && schema.else !== undefined) {
      errors.push(...collect(value, schema.else, path, rootSchema));
    }
  }

  return errors;
}

export function validateSchema(value, schema, options = {}) {
  const rootSchema = options.rootSchema ?? schema;
  const errors = collect(value, schema, options.path ?? "$", rootSchema);
  return { valid: errors.length === 0, errors };
}
