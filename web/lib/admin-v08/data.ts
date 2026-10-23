import "server-only";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { ArchiveRecord } from "../../../schemas/archive-record.types";
import type { PublicationLedgerEntry } from "../../../schemas/publication-record.types";
import { getAllArchiveRecords } from "../archive";
import { getAllPublications } from "../publishing/repository";
import { planScheduledPublications } from "../publishing/scheduler";
import { prepareTodayBrief } from "../publishing/today";
import { isReviewForm, type ReviewForm } from "./reviews";

function projectRoot() {
  const cwd = process.cwd();
  return existsSync(path.join(cwd, "docs", "editorial", "forms")) ? cwd : path.resolve(cwd, "..");
}

export function loadEditorialForms(): { available: boolean; forms: readonly ReviewForm[] } {
  const directory = path.join(projectRoot(), "docs", "editorial", "forms");
  if (!existsSync(directory)) return { available: false, forms: [] };
  const forms = readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b, "tr"))
    .map((name) => {
      const parsed: unknown = JSON.parse(readFileSync(path.join(directory, name), "utf8"));
      if (!isReviewForm(parsed)) throw new Error(`Editörlük formu şema denetiminden geçmedi: ${name}`);
      return parsed;
    });
  return { available: true, forms };
}

export function loadEditorialForm(recordId: string): ReviewForm | undefined {
  if (!/^[a-z0-9][a-z0-9-]{1,119}$/.test(recordId)) return undefined;
  const file = path.join(projectRoot(), "docs", "editorial", "forms", `${recordId}.json`);
  if (!existsSync(file)) return undefined;
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!isReviewForm(parsed)) throw new Error(`Editörlük formu şema denetiminden geçmedi: ${recordId}`);
  return parsed;
}

export function buildTodayAdminBrief(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return prepareTodayBrief(getAllArchiveRecords(), month, day);
}

export function buildScheduleDryRun(now = new Date()) {
  const file = path.join(projectRoot(), "content", "publications", "publication-ledger.json");
  let ledger: readonly PublicationLedgerEntry[] = [];
  if (existsSync(file)) {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(parsed) || parsed.some((entry) =>
      !entry ||
      typeof entry.idempotencyKey !== "string" ||
      typeof entry.publicationId !== "string" ||
      typeof entry.publishedAt !== "string",
    )) {
      throw new Error("Yayın ledger biçimi geçersiz; dry-run güvenli biçimde durduruldu.");
    }
    ledger = parsed as PublicationLedgerEntry[];
  }
  return planScheduledPublications(getAllPublications(), ledger, now.toISOString());
}

export function findArchiveRecord(slug: string): ArchiveRecord | undefined {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return undefined;
  return getAllArchiveRecords().find((record) => record.slug === slug);
}
