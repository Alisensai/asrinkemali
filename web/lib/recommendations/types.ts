import type { ArchiveRecordType } from "../../../schemas/archive-record.types";

export type RecommendationItem = { recordId: string; slug: string; title: string; type: ArchiveRecordType; dateDisplay: string; summary: string; reasonCodes: readonly string[]; reasons: readonly string[]; score: number; sourceInstitution: string };
export type RecommendationResult = { algorithmVersion: "v1"; items: readonly RecommendationItem[] };
