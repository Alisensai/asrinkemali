/**
 * Bağlantılı kaynak sayfasının birincil/ikincil rolünü sınıflandırır.
 *
 * Bu sınıflandırma kaydın konusunun tarihsel değerini değil, kayıtta bağlantı
 * verilen kaynak sayfasının kanıt rolünü gösterir. Örneğin Atatürk Ansiklopedisi
 * maddesi birincil belgeyi konu edinse bile bağlantılı sayfa modern bir
 * ansiklopedi yorumudur; bu nedenle ikincil sayılır.
 */

import { countBy, sortBy, toSortedEntries } from "./util.mjs";

export const SOURCE_ROLES = Object.freeze(["primary", "secondary", "reference", "unknown"]);

function classifyByInstitution(record) {
  const institution = String(record.source?.institution ?? "");
  const type = record.type;
  const institutionType = record.source?.institutionType;

  if (/Atatürk Ansiklopedisi/i.test(institution)) {
    return {
      role: "secondary",
      evidenceLevel: "interpretation",
      confidence: "high",
      basis: ["Kurumsal ansiklopedi maddesi", "Modern tarih yazımı/derleme"],
      caveats: ["Madde, birincil belge veya arşiv belgesi değildir; kaynakçadaki belgelere atıf yapabilir."],
    };
  }
  if (/Atatürk Araştırma Merkezi Yayınları/i.test(institution)) {
    return {
      role: "secondary",
      evidenceLevel: "interpretation",
      confidence: "high",
      basis: ["Modern kurumsal yayın", "Araştırma/derleme eseri"],
      caveats: ["Yayın, tarihsel belgenin kendisi değil; akademik yorum veya derlemedir."],
    };
  }
  if (/Millî Kütüphane/i.test(institution)) {
    return {
      role: "reference",
      evidenceLevel: "catalog",
      confidence: "high",
      basis: ["Kütüphane katalog kaydı", "Bibliyografik künye"],
      caveats: ["Katalog kaydı, eserin içeriğini doğrulamaz; yalnızca bibliyografik kimlik sağlar."],
    };
  }
  if (/Türkiye Büyük Millet Meclisi/i.test(institution)) {
    if (type === "document") {
      return {
        role: "primary",
        evidenceLevel: "transcription",
        confidence: "high",
        basis: ["TBMM resmî tutanağı", "Kurumsal resmî kayıt"],
        caveats: ["Tutanak metni resmî transkripsiyondur; PDF içeriği bu araç tarafından okunmaz."],
      };
    }
    if (type === "photograph") {
      return {
        role: "primary",
        evidenceLevel: "artifact",
        confidence: "high",
        basis: ["TBMM kurumsal fotoğraf arşivi", "Dijitalleştirilmiş tarihsel görsel"],
        caveats: ["Görselin telif/yeniden kullanım koşulları ayrıca doğrulanmalıdır."],
      };
    }
    return {
      role: "primary",
      evidenceLevel: "transcription",
      confidence: "medium",
      basis: ["TBMM resmî kurumsal kaynağı"],
      caveats: ["Kaynak türü ile kayıt türü arasındaki ilişki uzman tarafından doğrulanmalıdır."],
    };
  }
  if (/İstanbul Büyükşehir Belediyesi Atatürk Kitaplığı/i.test(institution)) {
    if (["document", "photograph", "publication"].includes(type)) {
      return {
        role: "primary",
        evidenceLevel: "artifact",
        confidence: "high",
        basis: ["Kurumsal arşiv/kütüphane koleksiyonu", "Dijitalleştirilmiş özgün öğe"],
        caveats: ["Katalog sayfası öğenin kendisi değil, dijitalleştirilmiş temsilidir; görsel/PDF indirilmez."],
      };
    }
    return {
      role: "reference",
      evidenceLevel: "catalog",
      confidence: "medium",
      basis: ["Kurumsal kütüphane kataloğu"],
      caveats: ["Katalog kaydı, tarihsel olayın birincil kanıtı sayılmaz."],
    };
  }
  if (type === "place") {
    return {
      role: "reference",
      evidenceLevel: "catalog",
      confidence: "medium",
      basis: ["Mekân/yer kaydı", "Kurumsal referans maddesi"],
      caveats: ["Mekânın kuruluş veya kullanım tarihi, Atatürk'ün biyografik olay tarihiyle aynı şey değildir."],
    };
  }
  if (institutionType === "official" || institutionType === "archive") {
    return {
      role: "primary",
      evidenceLevel: "transcription",
      confidence: "medium",
      basis: [`Kurum türü: ${institutionType}`],
      caveats: ["Kurum türü tek başına kanıt düzeyini garanti etmez."],
    };
  }
  return {
    role: "unknown",
    evidenceLevel: "unknown",
    confidence: "low",
    basis: ["Tanınmayan kurum/kaynak türü"],
    caveats: ["Kaynak rolü uzman tarafından sınıflandırılmalıdır."],
  };
}

function normalizeOverride(override) {
  if (!override || typeof override !== "object") return null;
  const role = SOURCE_ROLES.includes(override.role) ? override.role : null;
  if (!role) return null;
  return {
    role,
    evidenceLevel: typeof override.evidenceLevel === "string" ? override.evidenceLevel : "unknown",
    confidence: ["high", "medium", "low"].includes(override.confidence) ? override.confidence : "medium",
    basis: Array.isArray(override.basis) && override.basis.length > 0 ? override.basis : ["Uzman geçersiz kılması"],
    caveats: Array.isArray(override.caveats) ? override.caveats : ["Sınıflandırma, araç veri dosyasındaki uzman geçersiz kılmasına dayanır."],
  };
}

export function classifyRecordSource(record, overrides = {}) {
  const override = normalizeOverride(overrides?.[record.id]);
  const base = override ?? classifyByInstitution(record);
  return {
    recordId: record.id ?? null,
    title: record.title ?? null,
    type: record.type ?? null,
    status: record.verification?.status ?? null,
    institution: record.source?.institution ?? null,
    institutionType: record.source?.institutionType ?? null,
    sourceUrl: record.source?.url ?? null,
    role: base.role,
    evidenceLevel: base.evidenceLevel,
    confidence: base.confidence,
    basis: [...base.basis],
    caveats: [...base.caveats],
    overridden: Boolean(override),
  };
}

export function buildSourceClassification(records, { overrides = {} } = {}) {
  const rows = sortBy(
    records.map((record) => classifyRecordSource(record, overrides)),
    (a, b) => String(a.recordId).localeCompare(String(b.recordId), "tr")
  );
  const roleCounts = countBy(rows, (row) => row.role);
  const evidenceCounts = countBy(rows, (row) => row.evidenceLevel);
  const byInstitution = [...countBy(rows, (row) => row.institution ?? "(bilinmiyor)").entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "tr"))
    .map(([institution, count]) => {
      const institutionRows = rows.filter((row) => (row.institution ?? "(bilinmiyor)") === institution);
      const roleBreakdown = toSortedEntries(countBy(institutionRows, (row) => row.role));
      return { institution, count, roleBreakdown };
    });
  const byType = [...countBy(rows, (row) => row.type ?? "(bilinmiyor)").entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "tr"))
    .map(([type, count]) => {
      const typeRows = rows.filter((row) => (row.type ?? "(bilinmiyor)") === type);
      return { type, count, roleBreakdown: toSortedEntries(countBy(typeRows, (row) => row.role)) };
    });
  const primaryCount = roleCounts.get("primary") ?? 0;
  const secondaryCount = roleCounts.get("secondary") ?? 0;
  const referenceCount = roleCounts.get("reference") ?? 0;
  const unknownCount = roleCounts.get("unknown") ?? 0;
  const classifiedCount = primaryCount + secondaryCount + referenceCount + unknownCount;

  return {
    schemaVersion: "1.0.0",
    policy: {
      question: "Bağlantılı kaynak sayfası hangi kanıt rolündedir?",
      notAQuestionOf: "Kaydın konusunun tarihsel değeri veya doğruluğu.",
      roleDefinitions: {
        primary: "Dönem belgesi, resmî tutanak, özgün görsel veya kurumsal arşiv öğesi.",
        secondary: "Modern araştırma, ansiklopedi maddesi, derleme veya yorum.",
        reference: "Katalog/künye/mekân referansı; içerik kanıtı değil.",
        unknown: "Rolü güvenilir biçimde belirlenemeyen kaynak.",
      },
    },
    summary: {
      total: rows.length,
      primaryCount,
      secondaryCount,
      referenceCount,
      unknownCount,
      classifiedCount,
      primaryShare: classifiedCount > 0 ? primaryCount / classifiedCount : null,
      secondaryShare: classifiedCount > 0 ? secondaryCount / classifiedCount : null,
      byRole: toSortedEntries(roleCounts),
      byEvidenceLevel: toSortedEntries(evidenceCounts),
      byInstitution,
      byType,
      overrideCount: rows.filter((row) => row.overridden).length,
    },
    records: rows,
  };
}
