import "server-only";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type {
  ExhibitionDTO,
  ExhibitionFilters,
  ExhibitionRecord,
  ExhibitionTheme,
} from "./types";
import { validateExhibitionRecord } from "./workflow";

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

export function fetchAllRawExhibitions(): readonly ExhibitionRecord[] {
  if (cachedExhibitions && process.env.NODE_ENV === "production") {
    return cachedExhibitions;
  }

  const root = repositoryRoot();
  const stagingDir = path.join(root, "content", "exhibitions", "staging");
  const publishedDir = path.join(root, "content", "exhibitions", "published");

  const rawList: ExhibitionRecord[] = [
    ...loadDirectoryExhibitions(publishedDir),
    ...loadDirectoryExhibitions(stagingDir),
  ];

  // Benzersiz slug'a göre deduplicate
  const map = new Map<string, ExhibitionRecord>();
  for (const item of rawList) {
    map.set(item.slug, item);
  }

  const result = Object.freeze(Array.from(map.values()));
  cachedExhibitions = result;
  return result;
}

export function toDTO(record: ExhibitionRecord): ExhibitionDTO {
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
    editorialReview: {
      status: record.editorialReview.status,
      reviewedBy: record.editorialReview.reviewedBy,
      version: record.editorialReview.version,
    },
  };
}

export function getExhibitions(filters?: ExhibitionFilters): ExhibitionDTO[] {
  const raw = fetchAllRawExhibitions();
  const isProd = process.env.NODE_ENV === "production";
  const allowStaging = Boolean(process.env.ALLOW_STAGING_EXHIBITIONS || !isProd || filters?.includeStaging);

  const filtered = raw.filter((item) => {
    // Üretim ortamı güvenlik kapısı: Onaysız veya sentetik sergileri gizle
    if (!allowStaging) {
      if (item.editorialReview.isSyntheticPreview) return false;
      if (item.editorialReview.status !== "published" && item.editorialReview.status !== "approved") {
        return false;
      }
    }

    if (filters?.theme && item.theme !== filters.theme) return false;
    if (filters?.yearFrom && item.chronologicalScope.endYear < filters.yearFrom) return false;
    if (filters?.yearTo && item.chronologicalScope.startYear > filters.yearTo) return false;

    if (filters?.q) {
      const query = filters.q.toLowerCase().trim();
      const haystack = `${item.title} ${item.summary} ${item.themeLabel} ${item.curator.name}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  return filtered
    .sort((a, b) => b.chronologicalScope.startYear - a.chronologicalScope.startYear)
    .map(toDTO);
}

export function getExhibitionBySlug(slug: string): ExhibitionDTO | undefined {
  if (!slug || !/^[a-z0-9-]{3,100}$/.test(slug)) return undefined;
  const list = getExhibitions({ includeStaging: true });
  return list.find((item) => item.slug === slug);
}

export function getExhibitionThemes(): Array<{ theme: ExhibitionTheme; label: string; count: number }> {
  const exhibitions = getExhibitions({ includeStaging: true });
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

export function getRelatedExhibitions(currentSlug: string, theme: ExhibitionTheme): ExhibitionDTO[] {
  return getExhibitions({ theme, includeStaging: true })
    .filter((ex) => ex.slug !== currentSlug)
    .slice(0, 3);
}
