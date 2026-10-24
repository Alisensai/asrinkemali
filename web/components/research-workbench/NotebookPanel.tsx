"use client";

import { useState } from "react";
import type { WorkbenchNote } from "@/lib/research-evidence/workbench";
import styles from "@/app/arastirma-laboratuvari/laboratuvar.module.css";

interface NotebookPanelProps {
  notes: WorkbenchNote[];
}

/**
 * H · Araştırma Notları (istemci bileşeni).
 *
 * - Kayıtlı notlar (staging) salt-okunur listelenir.
 * - Yeni not yalnızca tarayıcı durumunda (React state) tutulur; kalıcı yazma yoktur.
 * - Yorum ile kaynak alıntısı açıkça ayrı etiketlenir; notlar tarihî bilgi DEĞİLDİR.
 */
export function NotebookPanel({ notes }: NotebookPanelProps) {
  const [drafts, setDrafts] = useState<Array<{ id: string; kind: string; text: string }>>([]);
  const [kind, setKind] = useState("commentary");
  const [text, setText] = useState("");

  const addDraft = () => {
    if (!text.trim()) return;
    setDrafts((prev) => [
      ...prev,
      { id: `draft-${prev.length + 1}`, kind, text: text.trim() },
    ]);
    setText("");
  };

  const exportDrafts = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { note: "Tarayıcı taslak notları — arşive otomatik aktarılmaz", drafts },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "arastirma-notlari-taslak.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className={styles.section} aria-label="Araştırma notları">
      <h2>H · Araştırma Notları</h2>
      <p className={styles.lede}>
        Notlar güvenilir tarihî bilgi değildir. “Kaynak alıntısı” etiketli satırlar kaynakta geçen
        ifadelerdir; “Yorum” etiketli satırlar araştırmacı yorumudur.
      </p>
      <ul className={styles.noteList}>
        {notes.map((note) => (
          <li key={note.id} className={styles.noteCard}>
            <div className={styles.claimHead}>
              <strong>{note.id}</strong>
              <span>{kindLabel(note.kind)}</span>
              <span>{note.author}</span>
            </div>
            <p>{note.text}</p>
            <p className={styles.claimMeta}>
              Hedef: {note.target.claimId ?? note.target.candidateId ?? note.target.evidenceId ?? "genel"} ·
              {note.linkedRecordIds.length > 0 ? ` bağlantılı: ${note.linkedRecordIds.join(", ")}` : ""}
            </p>
          </li>
        ))}
      </ul>
      <h3>Yeni not (tarayıcı taslağı)</h3>
      <div className={styles.noteForm}>
        <label>
          Tür
          <select value={kind} onChange={(e) => setKind(e.target.value)} data-testid="select-note-kind">
            <option value="commentary">Yorum</option>
            <option value="source_quotation">Kaynak alıntısı</option>
            <option value="research_question">Araştırma sorusu</option>
            <option value="missing_info">Eksik bilgi</option>
          </select>
        </label>
        <label>
          Not
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            data-testid="input-note-text"
            placeholder="Notunuzu yazın — bu not arşive otomatik aktarılmaz"
          />
        </label>
        <button type="button" onClick={addDraft} data-testid="button-add-note">
          Taslağa ekle
        </button>
        {drafts.length > 0 && (
          <button type="button" onClick={exportDrafts} data-testid="button-export-notes">
            Taslakları JSON indir
          </button>
        )}
      </div>
      {drafts.length > 0 && (
        <ul className={styles.noteList}>
          {drafts.map((draft) => (
            <li key={draft.id} className={styles.noteCard}>
              <div className={styles.claimHead}>
                <strong>{draft.id}</strong>
                <span>{kindLabel(draft.kind)}</span>
              </div>
              <p>{draft.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function kindLabel(kind: string) {
  switch (kind) {
    case "source_quotation":
      return "Kaynak alıntısı";
    case "research_question":
      return "Araştırma sorusu";
    case "missing_info":
      return "Eksik bilgi";
    case "comparison":
      return "Karşılaştırma";
    default:
      return "Yorum";
  }
}
