import "server-only";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type {
  ExhibitionDTO,
  ExhibitionFilters,
  ExhibitionRecord,
  ExhibitionTheme,
} from "./types";
import { validateExhibitionRecord, canExposePublicExhibition } from "./workflow";

function repositoryRoot(): string {
  const cwd = process.cwd();
  return existsSync(path.join(cwd, "content", "exhibitions")) ? cwd : path.resolve(cwd, "..");
}

function loadDirectoryExhibitions(dirPath: string): ExhibitionRecord[] {
  if (!existsSync(dirPath)) return [];
  const files = readdirSync(dirPath).filter((f) => f.endsWith(".json"));
  const exhibitions: ExhibitionRecord[] = [];

  for (const file of files) {
    try {
      const fullPath = path.join(dirPath, file);
      const content = readFileSync(fullPath, "utf8");
      if (!content || !content.trim()) continue;
      const parsed = JSON.parse(content) as unknown;
      const validation = validateExhibitionRecord(parsed);

      if (validation.valid) {
        exhibitions.push(parsed as ExhibitionRecord);
      } else {
        console.warn(`[ExhibitionRepository] Geçersiz sergi dosyası atlandı (${file}):`, validation.errors);
      }
    } catch (err) {
      console.error(`[ExhibitionRepository] Sergi dosyası okuma hatası (${file}):`, err);
    }
  }

  return exhibitions;
}

let cachedExhibitions: readonly ExhibitionRecord[] | null = null;
let cachedStagingExhibitions: readonly ExhibitionRecord[] | null = null;

export function fetchAllRawExhibitions(): {
  published: readonly ExhibitionRecord[];
  staging: readonly ExhibitionRecord[];
} {
  const isProd = process.env.NODE_ENV === "production";

  if (cachedExhibitions && cachedStagingExhibitions && isProd) {
    return {
      published: cachedExhibitions,
      staging: cachedStagingExhibitions,
    };
  }

  const root = repositoryRoot();
  const stagingDir = path.join(root, "content", "exhibitions", "staging");
  const publishedDir = path.join(root, "content", "exhibitions", "published");

  const rawPublished = loadDirectoryExhibitions(publishedDir);
  const rawStaging = loadDirectoryExhibitions(stagingDir);

  // 1. Published koleksiyonunu tekilleştir
  const publishedMap = new Map<string, ExhibitionRecord>();
  for (const item of rawPublished) {
    if (publishedMap.has(item.slug)) {
      console.warn(`[ExhibitionRepository] Çakışan yayındaki sergi slug'ı atlandı: ${item.slug}`);
      continue;
    }
    publishedMap.set(item.slug, item);
  }

  // 2. Staging koleksiyonunu tekilleştir ve yayındaki sergileri ezmesini engelle (Fail-Closed Quarantine)
  const stagingMap = new Map<string, ExhibitionRecord>();
  for (const item of rawStaging) {
    if (publishedMap.has(item.slug)) {
      console.warn(`[ExhibitionRepository] Güvenlik Karantinası: Staging sergisi '${item.slug}', yayındaki serginin üzerine yazamaz.`);
      continue;
    }
    if (stagingMap.has(item.slug)) {
      console.warn(`[ExhibitionRepository] Mükerrer staging slug'ı atlandı: ${item.slug}`);
      continue;
    }
    stagingMap.set(item.slug, item);
  }

  const published = Object.freeze(Array.from(publishedMap.values()));
  const staging = Object.freeze(Array.from(stagingMap.values()));

  if (isProd) {
    cachedExhibitions = published;
    cachedStagingExhibitions = staging;
  }

  return { published, staging };
}

export function toDTO(record: ExhibitionRecord, isStagingDraft = false): ExhibitionDTO {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    summary: record.summary,
    theme: record.theme,
    themeLabel: record.themeLabel,
    chronologicalScope: record.chronologicalScope,
    coverImage: record.coverImage,
    curator: record.curator,
    sections: record.sections,
    relatedArchiveRecordSlugs: record.relatedArchiveRecordSlugs,
    isSyntheticPreview: Boolean(record.editorialReview.isSyntheticPreview),
    isStagingDraft,
    editorialReview: {
      status: record.editorialReview.status,
      reviewedBy: record.editorialReview.reviewedBy,
      version: record.editorialReview.version,
    },
  };
}

export function getExhibitions(filters?: ExhibitionFilters): ExhibitionDTO[] {
  const { published, staging } = fetchAllRawExhibitions();
  const isProd = process.env.NODE_ENV === "production";

  // Üretim ortamında staging ASLA dahil edilemez (includeStaging veya env parametreleri production'da devre dışıdır)
  const allowStaging = !isProd && Boolean(filters?.includeStaging);

  const pool: Array<{ record: ExhibitionRecord; isStaging: boolean }> = [
    ...published.map((r) => ({ record: r, isStaging: false })),
    ...(allowStaging ? staging.map((r) => ({ record: r, isStaging: true })) : []),
  ];

  const filtered = pool.filter(({ record, isStaging }) => {
    // Üretim kapısı: Yalnızca canExposePublicExhibition onayından geçen sergiler yayımlanabilir
    if (!isStaging && !canExposePublicExhibition(record)) {
      return false;
    }

    if (filters?.theme && record.theme !== filters.theme) return false;
    if (filters?.yearFrom && record.chronologicalScope.endYear < filters.yearFrom) return false;
    if (filters?.yearTo && record.chronologicalScope.startYear > filters.yearTo) return false;

    if (filters?.q) {
      const query = filters.q.toLowerCase().trim();
      const haystack = `${record.title} ${record.summary} ${record.themeLabel} ${record.curator.name}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  return filtered
    .sort((a, b) => b.record.chronologicalScope.startYear - a.record.chronologicalScope.startYear)
    .map(({ record, isStaging }) => toDTO(record, isStaging));
}

export function getExhibitionBySlug(
  slug: string,
  options?: { allowStagingInDev?: boolean }
): ExhibitionDTO | undefined {
  if (!slug || !/^[a-z0-9-]{3,100}$/.test(slug)) return undefined;

  const isProd = process.env.NODE_ENV === "production";
  const allowStaging = !isProd && (options?.allowStagingInDev ?? true);

  const list = getExhibitions({ includeStaging: allowStaging });
  return list.find((item) => item.slug === slug);
}

export function getExhibitionThemes(options?: {
  includeStagingInDev?: boolean;
}): Array<{ theme: ExhibitionTheme; label: string; count: number }> {
  const isProd = process.env.NODE_ENV === "production";
  const allowStaging = !isProd && (options?.includeStagingInDev ?? true);

  const exhibitions = getExhibitions({ includeStaging: allowStaging });
  const map = new Map<ExhibitionTheme, { label: string; count: number }>();

  for (const ex of exhibitions) {
    const existing = map.get(ex.theme) || { label: ex.themeLabel, count: 0 };
    existing.count += 1;
    map.set(ex.theme, existing);
  }

  return Array.from(map.entries()).map(([theme, data]) => ({
    theme,
    label: data.label,
    count: data.count,
  }));
}

export function getRelatedExhibitions(
  currentSlug: string,
  theme: ExhibitionTheme,
  options?: { includeStagingInDev?: boolean }
): ExhibitionDTO[] {
  const isProd = process.env.NODE_ENV === "production";
  const allowStaging = !isProd && (options?.includeStagingInDev ?? true);

  return getExhibitions({ theme, includeStaging: allowStaging })
    .filter((ex) => ex.slug !== currentSlug)
    .slice(0, 3);
}
