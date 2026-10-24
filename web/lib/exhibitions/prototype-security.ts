/**
 * Prototype and Third-Party Code Security Validation Utilities
 * Enforces MKA constitutional rules for inspecting, auditing, and importing prototype archives.
 */

export const MAX_UNCOMPRESSED_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_ARCHIVE_FILE_COUNT = 500;

export interface ZipValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateZipEntryPath(entryPath: string): ZipValidationResult {
  if (!entryPath || typeof entryPath !== 'string') {
    return { valid: false, reason: 'Entry path must be a non-empty string' };
  }

  // Null byte injection check
  if (entryPath.includes('\0')) {
    return { valid: false, reason: 'Null byte injection detected in path' };
  }

  // Normalize slashes
  const normalized = entryPath.replace(/\\/g, '/');

  // Zip-Slip: Path traversal check
  if (normalized.includes('../') || normalized.startsWith('../') || normalized.includes('/..')) {
    return { valid: false, reason: 'Zip-slip directory traversal (..) detected' };
  }

  // Absolute paths / root slash check
  if (normalized.startsWith('/')) {
    return { valid: false, reason: 'Absolute path is forbidden in archive member' };
  }

  // Windows drive letter check (e.g. C:)
  if (/^[a-zA-Z]:/.test(entryPath)) {
    return { valid: false, reason: 'Windows drive letter path is forbidden in archive member' };
  }

  // UNC path check (e.g. \\server\share or //server/share)
  if (entryPath.startsWith('\\\\') || normalized.startsWith('//')) {
    return { valid: false, reason: 'UNC network path is forbidden in archive member' };
  }

  return { valid: true };
}

export function validateArchiveLimits(totalBytes: number, fileCount: number): ZipValidationResult {
  if (totalBytes > MAX_UNCOMPRESSED_SIZE_BYTES) {
    return { valid: false, reason: `Total uncompressed size exceeds ${MAX_UNCOMPRESSED_SIZE_BYTES} bytes` };
  }
  if (fileCount > MAX_ARCHIVE_FILE_COUNT) {
    return { valid: false, reason: `Archive file count exceeds limit of ${MAX_ARCHIVE_FILE_COUNT} files` };
  }
  return { valid: true };
}

export function isProtocolSafe(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:') || trimmed.startsWith('file:')) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    // Relative URLs or malformed
    return !trimmed.includes(':');
  }
}

export function sanitizeCsvFormula(value: string): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${value}`;
  }
  return value;
}

export function containsUnsafeCode(content: string): { unsafe: boolean; pattern?: string } {
  if (typeof content !== 'string') return { unsafe: false };

  const unsafePatterns = [
    { regex: /dangerouslySetInnerHTML/i, name: 'dangerouslySetInnerHTML' },
    { regex: /\beval\s*\(/i, name: 'eval' },
    { regex: /new\s+Function\s*\(/i, name: 'new Function' },
    { regex: /<script[\s>]/i, name: 'inline <script>' },
    { regex: /https?:\/\/[a-zA-Z0-9.-]*cdn\b/i, name: 'external CDN' }
  ];

  for (const { regex, name } of unsafePatterns) {
    if (regex.test(content)) {
      return { unsafe: true, pattern: name };
    }
  }

  return { unsafe: false };
}

export function validateManifestItem(item: {
  id?: string;
  featureName?: string;
  category?: string;
  sourceFile?: string | null;
  sourceSha256?: string | null;
  adopted?: boolean;
  pr27BaselineReference?: string;
}): { valid: boolean; reason?: string } {
  if (!item.id || !item.featureName || !item.category) {
    return { valid: false, reason: 'Missing mandatory fields (id, featureName, category)' };
  }

  const validCategories = ['ACCEPT', 'ADAPT', 'QUARANTINE', 'REJECT', 'SOURCE_MISSING', 'DUPLICATE', 'DEFERRED'];
  if (!validCategories.includes(item.category)) {
    return { valid: false, reason: `Invalid category: ${item.category}` };
  }

  if (item.category === 'ACCEPT') {
    if (!item.sourceFile || !item.sourceSha256 || item.adopted !== true) {
      return { valid: false, reason: 'ACCEPT category strictly requires sourceFile, sourceSha256, and adopted=true' };
    }
  }

  if (item.category === 'SOURCE_MISSING') {
    if (item.adopted === true) {
      return { valid: false, reason: 'SOURCE_MISSING category cannot be marked as adopted=true' };
    }
  }

  if (item.category === 'DUPLICATE') {
    if (!item.pr27BaselineReference) {
      return { valid: false, reason: 'DUPLICATE category requires pr27BaselineReference' };
    }
  }

  return { valid: true };
}
