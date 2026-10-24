/**
 * ASRIN KEMALİ — Web Otorite Kayıt Defteri DTO Tipleri
 */

export type AuthorityKind =
  | "person"
  | "place"
  | "institution"
  | "event"
  | "source_work"
  | "source_manifestation"
  | "source_item";

export interface AuthorityEntityDTO {
  authorityId: string;
  kind: AuthorityKind;
  preferredLabel: string;
  aliases: string[];
  recordReferencesCount: number;
  status: "provisional" | "review_required" | "rejected" | "approved_from_verified_human_workflow";
  roles?: string[];
  city?: string;
  country?: string;
}

export interface AtlasPlaceDTO {
  placeAuthorityId: string;
  preferredLabel: string;
  aliases: string[];
  city: string;
  country: string;
  geoStatus: "unknown" | "sourced";
  coords: { lat: number; lng: number } | null;
  linkedArchiveRecordIds: string[];
}

export interface ChronologyEventDTO {
  eventAuthorityId: string;
  title: string;
  date: string | null;
  linkedArchiveRecordIds: string[];
}

export interface AuthorityRegistrySummaryDTO {
  totalEntities: number;
  persons: number;
  places: number;
  institutions: number;
  events: number;
  sourceWorks: number;
  totalRecordReferences: number;
  totalObservations: number;
  adapterStatus: "active" | "cached_fallback";
}
