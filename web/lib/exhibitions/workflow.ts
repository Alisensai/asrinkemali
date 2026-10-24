/**
 * ASRIN KEMALİ — MKA Immersive Museum V0.7
 * Sergi İş Akışı Durum Makinesi ve Doğrulama Kuralları
 */

import type { ExhibitionRecord, ExhibitionReviewStatus } from "./types";

const ALLOWED_TRANSITIONS: Record<ExhibitionReviewStatus, ExhibitionReviewStatus[]> = {
  draft: ["in_review"],
  in_review: ["draft", "approved"],
  approved: ["in_review", "published"],
  published: ["in_review", "draft"],
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateExhibitionRecord(record: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!record || typeof record !== "object") {
    return { valid: false, errors: ["Sergi kaydı geçerli bir nesne olmalıdır."], warnings: [] };
  }

  const ex = record as Partial<ExhibitionRecord>;

  if (!ex.id || typeof ex.id !== "string" || !/^[a-z0-9-]{3,80}$/.test(ex.id)) {
    errors.push("Geçersiz veya eksik sergi kimliği (id).");
  }

  if (!ex.slug || typeof ex.slug !== "string" || !/^[a-z0-9-]{3,100}$/.test(ex.slug)) {
    errors.push("Geçersiz veya eksik sergi uzantısı (slug).");
  }

  if (!ex.title || typeof ex.title !== "string" || ex.title.trim().length < 5) {
    errors.push("Sergi başlığı en az 5 karakter olmalıdır.");
  }

  if (!ex.summary || typeof ex.summary !== "string" || ex.summary.trim().length < 15) {
    errors.push("Sergi özeti en az 15 karakter olmalıdır.");
  }

  if (!ex.chronologicalScope || typeof ex.chronologicalScope !== "object") {
    errors.push("Kronolojik kapsam (chronologicalScope) eksik.");
  } else {
    const { startYear, endYear } = ex.chronologicalScope;
    if (typeof startYear !== "number" || typeof endYear !== "number" || startYear > endYear) {
      errors.push("Geçersiz kronolojik tarih aralığı.");
    }
  }

  if (!Array.isArray(ex.sections) || ex.sections.length < 2) {
    errors.push("Sergi en az 2 bölümden (giriş ve kapanış dahil) oluşmalıdır.");
  } else {
    const ids = new Set<string>();
    const heroSection = ex.sections.find((s) => s.type === "hero");
    if (!heroSection) {
      errors.push("Sergide bir Hero (giriş) bölümü bulunmalıdır.");
    }

    for (let i = 0; i < ex.sections.length; i++) {
      const section = ex.sections[i];
      if (!section.id || ids.has(section.id)) {
        errors.push(`Bölüm #${i + 1} için benzersiz bir id belirtilmelidir.`);
      } else {
        ids.add(section.id);
      }

      if (section.type === "archive_showcase") {
        if (!section.primaryDocument || !section.primaryDocument.institution) {
          errors.push(`Arşiv vitrininde (${section.id}) kaynak kurum bilgisi zorunludur.`);
        }
      }

      if (section.type === "timeline") {
        if (!Array.isArray(section.events) || section.events.length === 0) {
          errors.push(`Zaman şeridi bölümünde (${section.id}) en az 1 olay bulunmalıdır.`);
        }
      }
    }
  }

  if (!ex.editorialReview || typeof ex.editorialReview !== "object") {
    errors.push("Editoryal inceleme bilgisi (editorialReview) zorunludur.");
  } else {
    const { status, reviewedBy, isSyntheticPreview } = ex.editorialReview;
    if (!status || !["draft", "in_review", "approved", "published"].includes(status)) {
      errors.push("Geçersiz editoryal inceleme durumu.");
    }
    if (status === "published" && !isSyntheticPreview && !reviewedBy) {
      errors.push("Yayımlanmış sergilerde insan uzman/editör onaylayan bilgisi zorunludur.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function canTransitionWorkflow(
  current: ExhibitionReviewStatus,
  target: ExhibitionReviewStatus
): boolean {
  return ALLOWED_TRANSITIONS[current]?.includes(target) ?? false;
}

export function canExposePublicExhibition(record: ExhibitionRecord): boolean {
  if (!record || typeof record !== "object") return false;
  const validation = validateExhibitionRecord(record);
  if (!validation.valid) return false;

  const { status, isSyntheticPreview, reviewedBy } = record.editorialReview;

  // Sentetik önizlemeler ve taslaklar asla genel kamuya açık sergilenemez
  if (isSyntheticPreview) return false;
  if (status !== "published") return false;
  if (!reviewedBy || reviewedBy.trim().length === 0) return false;

  return true;
}

export function isExhibitionPublishable(record: ExhibitionRecord): boolean {
  return canExposePublicExhibition(record);
}
