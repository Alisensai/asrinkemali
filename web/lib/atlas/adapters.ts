import type { AtlasRecord } from "./model";

/** No Perplexity/OpenCode runtime dependency; these are integration contracts, not human approvals. */
export type EvidenceAnnotation = {
  provider: "evidence-engine" | "source-reliability";
  status: "unassessed" | "automated-review" | "human-review-pending";
  evidenceUrl: string | null;
  note: string | null;
};
export type AtlasEvidenceAdapter = {
  getAnnotation(recordId: string): Promise<readonly EvidenceAnnotation[]>;
};
export type AtlasSearchAdapter = {
  searchIds(query: string): Promise<readonly string[]>;
};
export type AtlasRelationProvenance = "explicit-related-id" | "record-location-field" | "record-person-field" | "record-source-field";
export type AtlasLinkedEntity = {
  recordId: string;
  kind: "record" | "city" | "person" | "institution";
  label: string;
  relationProvenance: AtlasRelationProvenance;
  sourceRecordId: string;
  href: string | null;
};

const slugPattern=/^[a-z0-9-]{1,120}$/;
export function archiveRoute(slug:string):string | null {
  return slugPattern.test(slug) ? `/arsiv/${slug}` : null;
}
/** Existing V0.6 routes only; no guessed /ataturk/[period] or /atlas/place/id. */
export const ATATURK_ROUTE="/ataturk" as const;
export const CHRONOLOGY_ROUTE="/kronoloji" as const;
export function chronologyYearRoute(year:number):string | null {
  return Number.isInteger(year)&&year>=1800&&year<=2100?`${CHRONOLOGY_ROUTE}?yil=${year}`:null;
}
export function relationEntities(record:AtlasRecord, relatedRecords:ReadonlyMap<string,AtlasRecord>):AtlasLinkedEntity[] {
  const result:AtlasLinkedEntity[]=[];
  for(const location of record.locations) result.push({recordId:record.id,kind:"city",label:`${location.city} — şehir düzeyi`,relationProvenance:"record-location-field",sourceRecordId:record.id,href:null});
  for(const person of record.people) result.push({recordId:record.id,kind:"person",label:person,relationProvenance:"record-person-field",sourceRecordId:record.id,href:null});
  if(record.institution) result.push({recordId:record.id,kind:"institution",label:record.institution,relationProvenance:"record-source-field",sourceRecordId:record.id,href:null});
  for(const id of record.relatedIds){const related=relatedRecords.get(id);if(related){result.push({recordId:related.id,kind:"record",label:related.title,relationProvenance:"explicit-related-id",sourceRecordId:record.id,href:archiveRoute(related.slug)});}}
  return result;
}
