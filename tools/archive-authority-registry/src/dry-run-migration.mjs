/**
 * ASRIN KEMALİ — Arşiv Otorite Geçişi Salt-Okunur Simülasyonu (Dry-Run Migration)
 * 
 * Güvenlik İlkesi:
 * - Asla diskteki data/archive veya content/archive dosyalarına yazmaz.
 * - Sadece önerilen authorityId eşleştirmelerini ve etki analizini raporlar.
 */

import { computeContentHash } from "./model.mjs";
import { resolveAliasToAuthorityId } from "./matcher.mjs";

export function simulateMigration(records) {
  const affectedRecords = [];
  let totalPeopleMapped = 0;
  let totalLocationsMapped = 0;
  let totalInstitutionsMapped = 0;
  let unmappedObservations = 0;

  for (const rec of records) {
    const recordId = rec.id || rec.slug;
    const initialHash = computeContentHash(rec);

    const proposedModifications = {
      recordId,
      peopleMappings: [],
      locationMappings: [],
      institutionMappings: [],
    };

    // People
    if (Array.isArray(rec.people)) {
      rec.people.forEach((p, idx) => {
        const name = typeof p === "string" ? p : p?.name;
        if (!name) return;
        const targetAuthId = resolveAliasToAuthorityId(name, "person");
        if (targetAuthId) {
          proposedModifications.peopleMappings.push({
            index: idx,
            originalName: name,
            proposedAuthorityId: targetAuthId,
          });
          totalPeopleMapped++;
        } else {
          unmappedObservations++;
        }
      });
    }

    // Locations
    if (Array.isArray(rec.locations)) {
      rec.locations.forEach((loc, idx) => {
        const name = typeof loc === "string" ? loc : loc?.city || loc?.name;
        if (!name) return;
        const targetAuthId = resolveAliasToAuthorityId(name, "place");
        if (targetAuthId) {
          proposedModifications.locationMappings.push({
            index: idx,
            originalLocation: name,
            proposedAuthorityId: targetAuthId,
          });
          totalLocationsMapped++;
        } else {
          unmappedObservations++;
        }
      });
    }

    // Institution
    if (rec.source && rec.source.institution) {
      const instName = rec.source.institution;
      const targetAuthId = resolveAliasToAuthorityId(instName, "institution");
      if (targetAuthId) {
        proposedModifications.institutionMappings.push({
          originalInstitution: instName,
          proposedAuthorityId: targetAuthId,
        });
        totalInstitutionsMapped++;
      }
    }

    const hasProposals =
      proposedModifications.peopleMappings.length > 0 ||
      proposedModifications.locationMappings.length > 0 ||
      proposedModifications.institutionMappings.length > 0;

    if (hasProposals) {
      affectedRecords.push({
        ...proposedModifications,
        recordHashBefore: initialHash,
        recordHashAfterSimulation: computeContentHash(rec), // Değişiklik yapılmadığını kanıtlar
        diskFilesModified: 0,
      });
    }
  }

  return {
    isDryRun: true,
    diskWritesAttempted: 0,
    totalRecordsAnalyzed: records.length,
    affectedRecordsCount: affectedRecords.length,
    totalPeopleMapped,
    totalLocationsMapped,
    totalInstitutionsMapped,
    unmappedObservations,
    affectedRecordsPreview: affectedRecords.slice(0, 10),
  };
}
