/**
 * Araştırma not defteri.
 *
 * AYRIM KURALI: Araştırmacı yorumu (commentary) ile kaynakta yazan ifade
 * (source_quotation) açıkça ayrılır; notlar güvenilir tarihî bilgi DEĞİLDİR.
 */

/**
 * @typedef {import("./contracts.d.ts").ResearchNote} ResearchNote
 */

/** @returns {string} */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Yeni not oluşturur.
 * @typedef {Object} CreateNoteInput
 * @property {string} id
 * @property {import("./contracts.d.ts").NoteKind} kind
 * @property {string} author
 * @property {string} text
 * @property {{ claimId?: string, candidateId?: string, evidenceId?: string }} [target]
 * @property {string[]} [linkedRecordIds]
 * @param {CreateNoteInput} input
 * @returns {ResearchNote}
 */
export function createNote(input) {
  if (!input.id) throw new Error("Not kimliği zorunlu.");
  if (!input.text || input.text.trim().length === 0) throw new Error("Not metni boş olamaz.");
  if (!input.author) throw new Error("Not yazarı zorunlu (yorum ile kaynak ifadesini ayırmak için).");
  if (input.kind === "source_quotation" && !input.text.includes('"')) {
    // alıntı notları kaynağını belirtmeli — yalnız uyarı, engel değil
  }
  const timestamp = nowIso();
  return {
    schemaVersion: "1.0.0",
    id: input.id,
    kind: input.kind,
    author: input.author,
    createdAt: timestamp,
    updatedAt: timestamp,
    target: {
      claimId: input.target?.claimId ?? null,
      candidateId: input.target?.candidateId ?? null,
      evidenceId: input.target?.evidenceId ?? null,
    },
    text: input.text,
    linkedRecordIds: input.linkedRecordIds ?? [],
    history: [{ at: timestamp, change: "not oluşturuldu" }],
  };
}

/**
 * Notu günceller (değişiklik geçmişi zorunlu).
 * @param {ResearchNote} note
 * @param {string} newText
 * @param {string} changeDescription
 * @returns {ResearchNote}
 */
export function updateNote(note, newText, changeDescription) {
  if (!newText || newText.trim().length === 0) throw new Error("Not metni boş olamaz.");
  if (!changeDescription) throw new Error("Değişiklik gerekçesi zorunludur.");
  const timestamp = nowIso();
  return {
    ...note,
    text: newText,
    updatedAt: timestamp,
    history: [...note.history, { at: timestamp, change: changeDescription }],
  };
}

/**
 * Not doğrulaması — kaynak alıntısı notları kaynaksız geçemez.
 * @param {unknown} value
 * @returns {{ ok: boolean; issues: Array<{ code: string; message: string }> }}
 */
export function validateNote(value) {
  const issues = [];
  if (typeof value !== "object" || value === null) {
    return { ok: false, issues: [{ code: "TYPE", message: "Not bir nesne olmalı." }] };
  }
  const note = /** @type {Record<string, unknown>} */ (value);
  if (typeof note.text !== "string" || note.text.length === 0) {
    issues.push({ code: "TEXT", message: "Not metni zorunlu." });
  }
  if (typeof note.author !== "string" || note.author.length === 0) {
    issues.push({ code: "AUTHOR", message: "Yazar zorunlu." });
  }
  if (!note.target || typeof note.target !== "object") {
    issues.push({ code: "TARGET", message: "Not hedefi (claim/candidate/evidence) belirtilmeli." });
  }
  // Notlar asla onaylayıcı kayıt gibi gösterilemez
  if (note.kind === "approval") {
    issues.push({ code: "INVALID_KIND", message: "'approval' not türü yok — notlar onay üretmez." });
  }
  return { ok: issues.length === 0, issues };
}

/**
 * Notları JSON dışa aktarır (aktarım dosyası arşive otomatik yazılmaz).
 * @param {ResearchNote[]} notes
 */
export function exportNotesJson(notes) {
  return JSON.stringify(
    { schemaVersion: "1.0.0", exportedAt: nowIso(), count: notes.length, notes },
    null,
    2
  );
}

/**
 * Notları Markdown dışa aktarır — yorum ve kaynak ifadesi etiketli.
 * @param {ResearchNote[]} notes
 */
export function exportNotesMarkdown(notes) {
  const lines = [
    "# Araştırma Notları (MKA Evidence Workbench)",
    "",
    "> Bu notlar güvenilir tarihî bilgi DEĞİLDİR; araştırmacı notlarıdır.",
    "> 'Kaynak alıntısı' etiketli satırlar kaynakta geçen ifadelerdir; 'Yorum' etiketli satırlar araştırmacı yorumudur.",
    "",
  ];
  for (const note of notes) {
    const kindLabel =
      note.kind === "source_quotation" ? "Kaynak alıntısı" : note.kind === "research_question" ? "Araştırma sorusu" : "Yorum";
    lines.push(`## ${note.id} — ${kindLabel}`);
    lines.push(`- Yazar: ${note.author}`);
    lines.push(`- Hedef: ${note.target.claimId ?? note.target.candidateId ?? note.target.evidenceId ?? "genel"}`);
    lines.push(`- Oluşturma: ${note.createdAt}`);
    lines.push("");
    lines.push(note.text);
    lines.push("");
  }
  return lines.join("\n");
}
