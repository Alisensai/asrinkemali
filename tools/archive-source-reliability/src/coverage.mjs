/**
 * 1881-1918 erken dönem kapsam analizi.
 *
 * Önemli ayrım: bir mekânın kuruluş tarihi, Atatürk'ün o mekânla ilişkili
 * biyografik olay tarihi değildir. Bu yüzden kayıt tarihi ile biyografik
 * kapsam ayrı değerlendirilir.
 */

import {
  countBy,
  dateIntersectsPeriod,
  dateRangeYears,
  normalizeSourceIdentifier,
  parseIsoDate,
  sortBy,
  toSortedEntries,
} from "./util.mjs";

const ROLE_RANK = {
  "direct-biographical": 0,
  "associated-place": 1,
  "contextual": 2,
  "early-life-reference-outside-date": 3,
  "undated": 4,
  "out-of-period": 5,
};

function textOf(record) {
  return [
    record.title,
    record.summary,
    record.description,
    record.date?.note,
    ...(Array.isArray(record.tags) ? record.tags : []),
  ]
    .filter(Boolean)
    .join(" ");
}

function hasAtaturkSubject(record) {
  const subject = (record.people ?? []).some(
    (person) => /Atatürk|Mustafa Kemal/i.test(String(person?.name ?? "")) && /subject/i.test(String(person?.role ?? ""))
  );
  return subject || /Atatürk|Mustafa Kemal/i.test(String(record.title ?? ""));
}

function mentionsAtaturk(record) {
  return /Atatürk|Mustafa Kemal/i.test(textOf(record));
}

function isAtaturkRelated(record) {
  // Mekânlarda metin anması ilişki için yeterli olabilir; biyografik olay/belge
  // için ise özne rolü veya başlıkta Atatürk geçmesi aranır. Aksi hâlde bir
  // gazetenin sonraki paragraflarında Atatürk'ün anılması kaydı yanlışlıkla
  // "doğrudan biyografik" yapar.
  return record.type === "place" ? hasAtaturkSubject(record) || mentionsAtaturk(record) : hasAtaturkSubject(record);
}

function isEarlyLifePlace(record) {
  if (record.type !== "place" || !hasAtaturkSubject(record)) return false;
  return /okul|mektep|idadi|idadî|rüştiye|harbiye|askerî|askeri|eğitim|öğrenim|tahsil/i.test(textOf(record));
}

function inferDateRole(record) {
  const text = textOf(record);
  if (record.type === "place") {
    if (/kurul|kurulan|inşa|tamamlan|açıl|hizmet verm|eğitim.*(başla|ver)|yaptırıl|inşa edil|tesis/i.test(text)) {
      return "institutional-establishment";
    }
    // Erken dönem eğitim kurumlarında tarih çoğu zaman kuruluş yılıdır;
    // Atatürk'ün okula başlama yılı değildir.
    if (isEarlyLifePlace(record) && (parseIsoDate(record.date?.start)?.year ?? 9999) < 1881) {
      return "institutional-establishment";
    }
    return isAtaturkRelated(record) ? "associated-place" : "place-reference";
  }
  if (record.type === "publication") return "publication-date";
  if (record.type === "event" || record.type === "document" || record.type === "speech" || record.type === "photograph") {
    return isAtaturkRelated(record) ? "biographical" : "contextual-event";
  }
  return "unknown";
}

function classifyCoverage(record, period) {
  const start = record.date?.start ?? null;
  const end = record.date?.end ?? null;
  const inPeriod = dateIntersectsPeriod(start, end, period.start, period.end);
  const ataturkRelated = isAtaturkRelated(record);
  const dateRole = inferDateRole(record);
  let role;
  if (!start) {
    role = "undated";
  } else if (!inPeriod) {
    role =
      isEarlyLifePlace(record) && dateRole === "institutional-establishment"
        ? "early-life-reference-outside-date"
        : "out-of-period";
  } else if (record.type === "place") {
    role = ataturkRelated ? "associated-place" : "contextual";
  } else if (ataturkRelated) {
    role = "direct-biographical";
  } else {
    role = "contextual";
  }
  return { inPeriod, ataturkRelated, dateRole, role };
}

function phaseIdsForDate(start, end, phases) {
  return phases
    .filter((phase) => dateIntersectsPeriod(start, end, phase.start, phase.end))
    .map((phase) => phase.id);
}

function keywordPhaseIds(record, phases) {
  const text = textOf(record).toLocaleLowerCase("tr-TR");
  return phases
    .filter((phase) => (phase.keywords ?? []).some((keyword) => text.includes(String(keyword).toLocaleLowerCase("tr-TR"))))
    .map((phase) => phase.id);
}

function contiguousRanges(years) {
  if (years.length === 0) return [];
  const sorted = [...years].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let previous = sorted[0];
  for (const year of sorted.slice(1)) {
    if (year === previous + 1) {
      previous = year;
      continue;
    }
    ranges.push({ start, end: previous, years: previous - start + 1 });
    start = year;
    previous = year;
  }
  ranges.push({ start, end: previous, years: previous - start + 1 });
  return ranges;
}

export function analyzeEarlyPeriodCoverage(records, config, { candidateSeeds = [] } = {}) {
  const period = config.period;
  const phases = config.phases ?? [];
  const periodStartYear = parseIsoDate(period.start)?.year;
  const periodEndYear = parseIsoDate(period.end)?.year;
  const existingIdentifiers = new Set(
    records.map((record) => normalizeSourceIdentifier(record.source?.archiveIdentifier)).filter(Boolean)
  );
  const existingUrls = new Set(records.map((record) => record.source?.url).filter(Boolean));
  const eligibleCandidates = candidateSeeds.filter((candidate) => {
    const identifier = normalizeSourceIdentifier(String(candidate.sourceId ?? ""));
    if (identifier && existingIdentifiers.has(identifier)) return false;
    if (candidate.url && existingUrls.has(candidate.url)) return false;
    return true;
  });

  const rows = records.map((record) => {
    const coverage = classifyCoverage(record, period);
    const inPeriodPhaseIds = coverage.inPeriod
      ? phaseIdsForDate(record.date?.start, record.date?.end, phases)
      : [];
    const referencePhaseIds =
      coverage.role === "early-life-reference-outside-date" ? keywordPhaseIds(record, phases) : [];
    return {
      recordId: record.id ?? null,
      title: record.title ?? null,
      type: record.type ?? null,
      status: record.verification?.status ?? null,
      institution: record.source?.institution ?? null,
      sourceUrl: record.source?.url ?? null,
      date: {
        start: record.date?.start ?? null,
        end: record.date?.end ?? null,
        precision: record.date?.precision ?? null,
        certainty: record.date?.certainty ?? null,
        display: record.date?.display ?? null,
      },
      ataturkRelated: coverage.ataturkRelated,
      dateRole: coverage.dateRole,
      coverageRole: coverage.role,
      inPeriod: coverage.inPeriod,
      phaseIds: inPeriodPhaseIds,
      referencePhaseIds,
      years: coverage.inPeriod ? dateRangeYears(record.date?.start, record.date?.end) : [],
    };
  });

  const sortedRows = sortBy(
    rows,
    (a, b) =>
      (ROLE_RANK[a.coverageRole] ?? 99) - (ROLE_RANK[b.coverageRole] ?? 99) ||
      String(a.date.start ?? "9999").localeCompare(String(b.date.start ?? "9999")) ||
      String(a.recordId).localeCompare(String(b.recordId), "tr")
  );
  const inPeriodRows = sortedRows.filter((row) => row.inPeriod);
  const directRows = sortedRows.filter((row) => row.coverageRole === "direct-biographical");
  const associatedRows = sortedRows.filter((row) => row.coverageRole === "associated-place");
  const contextualRows = sortedRows.filter((row) => row.coverageRole === "contextual");
  const referenceRows = sortedRows.filter((row) => row.coverageRole === "early-life-reference-outside-date");
  const undatedRows = sortedRows.filter((row) => row.coverageRole === "undated");
  const outOfPeriodRows = sortedRows.filter((row) => row.coverageRole === "out-of-period");

  const yearMatrix = [];
  for (let year = periodStartYear; year <= periodEndYear; year += 1) {
    const yearRows = inPeriodRows.filter((row) => row.years.includes(year));
    yearMatrix.push({
      year,
      total: yearRows.length,
      direct: yearRows.filter((row) => row.coverageRole === "direct-biographical").length,
      associated: yearRows.filter((row) => row.coverageRole === "associated-place").length,
      contextual: yearRows.filter((row) => row.coverageRole === "contextual").length,
      recordIds: yearRows.map((row) => row.recordId),
      types: toSortedEntries(countBy(yearRows, (row) => row.type ?? "(bilinmiyor)")),
    });
  }
  const emptyYears = yearMatrix.filter((row) => row.total === 0).map((row) => row.year);
  const yearsWithAnyRecord = yearMatrix.filter((row) => row.total > 0).map((row) => row.year);

  const phaseMatrix = phases.map((phase) => {
    const phaseRows = inPeriodRows.filter((row) => row.phaseIds.includes(phase.id));
    const direct = phaseRows.filter((row) => row.coverageRole === "direct-biographical");
    const associated = phaseRows.filter((row) => row.coverageRole === "associated-place");
    const contextual = phaseRows.filter((row) => row.coverageRole === "contextual");
    const referenceOnly = referenceRows.filter((row) => row.referencePhaseIds.includes(phase.id));
    const candidates = eligibleCandidates.filter((candidate) => (candidate.gapPhases ?? []).includes(phase.id));
    const candidateCoverage =
      candidates.length === 0
        ? "none"
        : candidates.every((candidate) => candidate.coverageType === "context")
          ? "context-only"
          : candidates.every((candidate) => candidate.coverageType === "broad")
            ? "broad-only"
            : "dedicated";
    const status =
      direct.length > 0
        ? "covered"
        : associated.length > 0
          ? "associated-only"
          : contextual.length > 0
            ? "context-only"
            : referenceOnly.length > 0
              ? "reference-only"
              : "missing";
    return {
      id: phase.id,
      label: phase.label,
      start: phase.start,
      end: phase.end,
      status,
      inPeriodRecordCount: phaseRows.length,
      directCount: direct.length,
      associatedCount: associated.length,
      contextualCount: contextual.length,
      referenceOnlyCount: referenceOnly.length,
      recordIds: phaseRows.map((row) => row.recordId),
      directRecordIds: direct.map((row) => row.recordId),
      associatedRecordIds: associated.map((row) => row.recordId),
      contextualRecordIds: contextual.map((row) => row.recordId),
      referenceOnlyRecordIds: referenceOnly.map((row) => row.recordId),
      candidateIds: candidates.map((candidate) => candidate.sourceId),
      candidateTitles: candidates.map((candidate) => candidate.title),
      candidateCoverage,
    };
  });

  const directTypeCounts = countBy(directRows, (row) => row.type ?? "(bilinmiyor)");
  const allTypes = ["event", "document", "speech", "photograph", "publication", "place"];
  const missingDirectTypes = allTypes.filter((type) => !directTypeCounts.has(type));
  const phasesWithoutDirect = phaseMatrix.filter((phase) => phase.directCount === 0);
  const phasesWithoutAnyEvidence = phaseMatrix.filter((phase) => phase.status === "missing");
  const phasesWithReferenceOnly = phaseMatrix.filter((phase) => phase.status === "reference-only");
  const phasesWithoutCandidates = phaseMatrix.filter((phase) => phase.candidateIds.length === 0);
  const broadOnlyPhases = phaseMatrix.filter((phase) => phase.candidateCoverage === "broad-only");

  const gaps = [];
  if (directRows.length === 0) {
    gaps.push({
      id: "no-direct-biographical-records",
      severity: "high",
      label: "1881-1918 için doğrudan biyografik kayıt yok",
      detail:
        "Dönemle kesişen kayıtlar mekân/yayın bağlamıdır; doğrudan olay, belge, konuşma veya fotoğraf kaydı bulunmuyor.",
    });
  }
  for (const phase of phasesWithoutDirect) {
    gaps.push({
      id: `phase-no-direct:${phase.id}`,
      severity: "medium",
      label: `${phase.label}: doğrudan biyografik kayıt yok`,
      detail:
        phase.status === "missing"
          ? "Bu evrede dönem içi kayıt ve erken yaşam referansı bulunmuyor."
          : "Bu evrede yalnızca bağlam/mekân kaydı var; doğrudan biyografik kayıt yok.",
      phaseId: phase.id,
    });
  }
  for (const phase of phasesWithoutAnyEvidence) {
    gaps.push({
      id: `phase-no-evidence:${phase.id}`,
      severity: "high",
      label: `${phase.label}: arşivde dönem içi veya referans kayıt yok`,
      detail: "Bu evre için mevcut arşivde tarih aralığına giren ya da erken yaşam referansı sayılan kayıt yok.",
      phaseId: phase.id,
    });
  }
  for (const phase of broadOnlyPhases) {
    gaps.push({
      id: `phase-broad-candidate-only:${phase.id}`,
      severity: "medium",
      label: `${phase.label}: yalnızca genel biyografi adayı var`,
      detail: "Bu evreye özel bir aday bulunamadı; genel Atatürk biyografisi adayı uzman incelemesi için işaretlendi.",
      phaseId: phase.id,
    });
  }
  if (emptyYears.length > 0) {
    gaps.push({
      id: "empty-year-ranges",
      severity: "low",
      label: `1881-1918 arasında ${emptyYears.length} yıl kayıtsız`,
      detail: `Kayıt bulunan yıllar: ${yearsWithAnyRecord.join(", ")}. Boş yıl aralıkları: ${contiguousRanges(emptyYears)
        .map((range) => (range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`))
        .join(", ")}.`,
    });
  }
  if (missingDirectTypes.length > 0) {
    gaps.push({
      id: "missing-direct-types",
      severity: "high",
      label: "Dönemde doğrudan tür çeşitliliği yok",
      detail: `Doğrudan biyografik kaydı bulunmayan türler: ${missingDirectTypes.join(", ")}.`,
    });
  }
  for (const phase of phasesWithoutCandidates) {
    gaps.push({
      id: `phase-no-candidate:${phase.id}`,
      severity: "medium",
      label: `${phase.label}: doğrulanmamış aday kaynak yok`,
      detail: "Bu evre için aday kaynak listesinde eşleşen bir öğe bulunmuyor.",
      phaseId: phase.id,
    });
  }

  const recommendations = [];
  if (directRows.length === 0) {
    recommendations.push(
      "Dönem için doğrudan biyografik kayıt üretmeden önce uzman onaylı kaynaklarla olay/belge/fotoğraf türlerinde en az birer kayıt hedeflenmeli."
    );
  }
  for (const phase of phasesWithoutAnyEvidence) {
    recommendations.push(`${phase.label} evresi için arşivde hiç kayıt yok; aday kaynaklar uzman incelemesinden geçirilmeli.`);
  }
  for (const phase of broadOnlyPhases) {
    recommendations.push(
      `${phase.label} evresi yalnızca genel biyografi adayıyla temsil ediliyor; evreye özel kurumsal kaynak aranmalı.`
    );
  }
  recommendations.push(
    "Aday kaynaklar `ingest: false` ve `status: unverified` olarak kalmalı; insan uzman doğrulaması olmadan arşive eklenmemeli."
  );

  return {
    schemaVersion: "1.0.0",
    period,
    policy: {
      dateVsBiography:
        "Kayıt tarihi, Atatürk'ün biyografik olay tarihi değildir. Mekânın kuruluş yılı ve yayının ilk sayı tarihi bağlam olarak sayılır.",
      directDefinition:
        "Doğrudan biyografik: Atatürk ile ilişkili olay, belge, konuşma veya fotoğraf kaydı ve tarih aralığı 1881-1918 ile kesişiyor.",
      associatedDefinition:
        "İlişkili mekân: Atatürk ile ilişkili mekân kaydı; tarih çoğu zaman kuruluş/kullanım tarihidir, biyografik olay tarihi değildir.",
      referenceDefinition:
        "Erken yaşam referansı: tarih alanı dönem dışında (ör. okulun kuruluş yılı) ama içerik Atatürk'ün erken yaşamıyla ilgili.",
    },
    summary: {
      totalRecords: sortedRows.length,
      periodRecordCount: inPeriodRows.length,
      directBiographicalRecords: directRows.length,
      associatedPlaceRecords: associatedRows.length,
      contextualRecords: contextualRows.length,
      earlyLifeReferenceOutsideDate: referenceRows.length,
      undatedRecords: undatedRows.length,
      outOfPeriodRecords: outOfPeriodRows.length,
      yearsWithAnyRecord,
      emptyYearCount: emptyYears.length,
      phaseCount: phaseMatrix.length,
      phasesWithDirect: phaseMatrix.filter((phase) => phase.directCount > 0).length,
      phasesWithAnyInPeriodRecord: phaseMatrix.filter((phase) => phase.inPeriodRecordCount > 0).length,
      phasesWithReferenceOnly: phasesWithReferenceOnly.length,
      phasesWithoutAnyEvidence: phasesWithoutAnyEvidence.length,
      phasesWithCandidates: phaseMatrix.filter((phase) => phase.candidateIds.length > 0).length,
      phasesWithoutCandidates: phasesWithoutCandidates.length,
      missingDirectTypes,
      directTypeCounts: toSortedEntries(directTypeCounts),
      coveragePercentOfYears: yearsWithAnyRecord.length / (periodEndYear - periodStartYear + 1),
    },
    yearMatrix,
    phaseMatrix,
    records: sortedRows,
    gaps,
    recommendations,
  };
}
