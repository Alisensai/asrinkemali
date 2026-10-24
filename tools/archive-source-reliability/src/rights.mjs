/**
 * Görsel kullanım hakkı denetimi.
 *
 * `official_link_only` bir gösterim politikasıdır; yeniden kullanım lisansı
 * değildir. Bu nedenle lisans/koşul kanıtı olmayan bağlantı-only görseller
 * "kullanım hakkı doğrulanmamış" olarak işaretlenir.
 */

import { countBy, sortBy, toSortedEntries } from "./util.mjs";

const KNOWN_RIGHTS = new Set([
  "public_domain",
  "open_license",
  "official_link_only",
  "institutional_terms",
  "permission_required",
  "ai_representative",
]);

function hasLicenseEvidence(rights) {
  return Boolean(
    (typeof rights?.license === "string" && rights.license.trim()) ||
      (typeof rights?.licenseUrl === "string" && rights.licenseUrl.trim())
  );
}

function hasTermsEvidence(rights) {
  return typeof rights?.termsUrl === "string" && rights.termsUrl.trim().length > 0;
}

export function classifyImageRights(record) {
  if (!record.image) return null;
  const rights = record.rights ?? {};
  const image = record.image ?? {};
  const status = rights.status ?? "unknown";
  const imageReuse = rights.imageReuse ?? "unknown";
  const displayPolicy = image.displayPolicy ?? "unknown";
  const licenseEvidence = hasLicenseEvidence(rights);
  const termsEvidence = hasTermsEvidence(rights);
  let classification = "unknown";
  let reuseVerified = false;
  let reuseStatus = "unverified";

  if (status === "public_domain" || status === "open_license") {
    if (licenseEvidence || status === "public_domain") {
      classification = "verified_reuse";
      reuseVerified = true;
      reuseStatus = "verified";
    } else {
      classification = "claimed_open_without_license";
      reuseStatus = "claim_only";
    }
  } else if (status === "permission_required") {
    classification = "permission_required";
    reuseStatus = "permission_required";
  } else if (status === "unknown" || !KNOWN_RIGHTS.has(status)) {
    classification = "unknown";
    reuseStatus = "unknown";
  } else if (status === "ai_representative" || image.kind === "ai_representative") {
    classification = "ai_representative";
    reuseStatus = "not_applicable";
  } else if (imageReuse === "permitted" && licenseEvidence) {
    classification = "verified_reuse";
    reuseVerified = true;
    reuseStatus = "verified";
  } else if (displayPolicy === "not_displayed") {
    classification = "not_displayed";
    reuseStatus = "not_displayed";
  } else if (termsEvidence) {
    classification = "link_only_terms";
    reuseStatus = "terms_known_reuse_unverified";
  } else {
    classification = "link_only_unverified";
    reuseStatus = "reuse_unverified";
  }

  const flags = [];
  if (!KNOWN_RIGHTS.has(status)) flags.push("unknown_rights_status");
  if (!reuseVerified && classification !== "ai_representative" && classification !== "not_displayed") {
    flags.push("reuse_rights_not_verified");
  }
  if (!licenseEvidence && classification !== "ai_representative") flags.push("missing_license_evidence");
  if (!image.sourcePageUrl) flags.push("missing_source_page_url");
  if (displayPolicy === "source_link_only") flags.push("link_only_display_policy");
  if (image.kind === "ai_representative") flags.push("ai_representative_image");

  return {
    recordId: record.id ?? null,
    title: record.title ?? null,
    type: record.type ?? null,
    status: record.verification?.status ?? null,
    institution: record.source?.institution ?? null,
    sourceUrl: record.source?.url ?? null,
    image: {
      kind: image.kind ?? null,
      url: image.url ?? null,
      sourcePageUrl: image.sourcePageUrl ?? null,
      displayPolicy,
      credit: image.credit ?? null,
      alt: image.alt ?? null,
    },
    rights: {
      status,
      imageReuse,
      license: rights.license ?? null,
      licenseUrl: rights.licenseUrl ?? null,
      termsUrl: rights.termsUrl ?? null,
      credit: rights.credit ?? null,
      note: rights.note ?? null,
    },
    evidence: {
      licenseEvidence,
      termsEvidence,
      reuseVerified,
    },
    classification,
    reuseStatus,
    flags,
  };
}

export function auditImageRights(records) {
  const images = sortBy(
    records.map((record) => classifyImageRights(record)).filter(Boolean),
    (a, b) => {
      const rank = (row) => (row.classification === "verified_reuse" ? 2 : row.classification === "ai_representative" ? 1 : 0);
      return rank(a) - rank(b) || String(a.recordId).localeCompare(String(b.recordId), "tr");
    }
  );
  const flagged = images.filter((row) => !row.evidence.reuseVerified && row.classification !== "ai_representative" && row.classification !== "not_displayed");
  const unknownRightsRecords = sortBy(
    records
      .filter((record) => ["unknown", "permission_required"].includes(record.rights?.status))
      .map((record) => ({
        recordId: record.id,
        title: record.title,
        type: record.type,
        status: record.verification?.status,
        institution: record.source?.institution ?? null,
        rightsStatus: record.rights?.status ?? "unknown",
        imageReuse: record.rights?.imageReuse ?? "unknown",
        hasImage: Boolean(record.image),
        note: record.rights?.note ?? null,
      })),
    (a, b) => String(a.recordId).localeCompare(String(b.recordId), "tr")
  );

  return {
    schemaVersion: "1.0.0",
    policy: {
      distinction:
        "Gösterim politikası (ör. yalnızca kaynağa bağlantı) ile yeniden kullanım hakkı aynı şey değildir.",
      flagging: "Lisans/koşul kanıtı olmadan yeniden kullanım hakkı doğrulanmış sayılmaz.",
      legalDisclaimer: "Bu rapor hukuki görüş değildir; yayın öncesi kurum koşulları ve uzman görüşü gerekir.",
    },
    summary: {
      totalImages: images.length,
      verifiedReuseImages: images.filter((row) => row.classification === "verified_reuse").length,
      flaggedImages: flagged.length,
      unknownRightsImages: images.filter((row) => row.classification === "unknown").length,
      linkOnlyUnverifiedImages: images.filter((row) => row.classification === "link_only_unverified").length,
      linkOnlyTermsImages: images.filter((row) => row.classification === "link_only_terms").length,
      permissionRequiredImages: images.filter((row) => row.classification === "permission_required").length,
      aiRepresentativeImages: images.filter((row) => row.classification === "ai_representative").length,
      missingSourcePageImages: images.filter((row) => !row.image.sourcePageUrl).length,
      recordsWithUnknownRights: unknownRightsRecords.length,
      byClassification: toSortedEntries(countBy(images, (row) => row.classification)),
      byRightsStatus: toSortedEntries(countBy(images, (row) => row.rights.status)),
      byDisplayPolicy: toSortedEntries(countBy(images, (row) => row.image.displayPolicy)),
      byImageReuse: toSortedEntries(countBy(images, (row) => row.rights.imageReuse)),
      byInstitution: [...countBy(images, (row) => row.institution ?? "(bilinmiyor)").entries()]
        .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "tr"))
        .map(([institution, count]) => ({ institution, count })),
    },
    images,
    flagged,
    unknownRightsRecords,
  };
}
