"use client";

import { useState } from "react";
import type { ResearchCandidate } from "@/lib/research-evidence/candidates";
import styles from "./laboratuvar.module.css";

/**
 * E · Kaynak Karşılaştırma (istemci bileşeni).
 * İki adayın bibliyografik alanlarını yan yana karşılaştırır.
 * Aynı kurum + benzer başlık görüntülenirse "bağımsızlık belirsiz" uyarısı gösterilir.
 */
export default function SourceCompare({ candidates }: { candidates: ResearchCandidate[] }) {
  const [leftId, setLeftId] = useState<string>(candidates[0]?.id ?? "");
  const [rightId, setRightId] = useState<string>(candidates[1]?.id ?? "");
  const left = candidates.find((c) => c.id === leftId);
  const right = candidates.find((c) => c.id === rightId);

  const independenceWarning =
    left && right && left.id !== right.id
      ? left.institution === right.institution
        ? "UYARI: Aynı kurum — iki bağımsız tarihî kanıt sayılmaz."
        : similar(left.title, right.title)
          ? "UYARI: Farklı kurum ancak başlıklar benzer — kopya yayın olabilir; bağımsızlık belirsiz."
          : null
      : null;

  return (
    <section className={styles.section} aria-label="Kaynak karşılaştırma">
      <h2>E · Kaynak Karşılaştırma</h2>
      <p className={styles.lede}>
        İki kaynağın künyesini, niteliğini ve dönem kapsamını karşılaştırın. Sistem aynı kurum kaynaklarını
        otomatik olarak bağımsız saymaz.
      </p>
      <div className={styles.compareControls}>
        <label>
          Kaynak 1
          <select value={leftId} onChange={(e) => setLeftId(e.target.value)} data-testid="select-compare-left">
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.title.slice(0, 40)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kaynak 2
          <select value={rightId} onChange={(e) => setRightId(e.target.value)} data-testid="select-compare-right">
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.title.slice(0, 40)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {independenceWarning && <p className={styles.independenceWarn}>{independenceWarning}</p>}
      {left && right && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Alan</th>
                <th>{left.id}</th>
                <th>{right.id}</th>
              </tr>
            </thead>
            <tbody>
              <CompareRow label="Başlık" a={left.title} b={right.title} />
              <CompareRow label="Kurum" a={left.institution} b={right.institution} />
              <CompareRow
                label="Yazar(lar)"
                a={left.authors.map((a) => a.name).join(", ") || "—"}
                b={right.authors.map((a) => a.name).join(", ") || "—"}
              />
              <CompareRow label="Yayın tarihi" a={left.publishedAt ?? "—"} b={right.publishedAt ?? "—"} />
              <CompareRow
                label="Nitelik"
                a={left.sourceNature}
                b={right.sourceNature}
              />
              <CompareRow
                label="Dönem"
                a={left.periodStart !== null ? `${left.periodStart}–${left.periodEnd ?? ""}` : String(left.eventYear ?? "—")}
                b={right.periodStart !== null ? `${right.periodStart}–${right.periodEnd ?? ""}` : String(right.eventYear ?? "—")}
              />
              <CompareRow label="Durum" a={left.state} b={right.state} />
              <CompareRow
                label="Bağlantı"
                a={<a href={left.url} rel="nofollow noreferrer noopener" target="_blank">özgün bağlantı</a>}
                b={<a href={right.url} rel="nofollow noreferrer noopener" target="_blank">özgün bağlantı</a>}
              />
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CompareRow({ label, a, b }: { label: string; a: React.ReactNode; b: React.ReactNode }) {
  return (
    <tr>
      <td>{label}</td>
      <td>{a}</td>
      <td>{b}</td>
    </tr>
  );
}

/** Basit başlık benzerliği (görünüm uyarısı için; kesin analiz motor evidence/ içinde). */
function similar(a: string, b: string) {
  const wa = a.toLowerCase().split(/\s+/);
  const wb = new Set(b.toLowerCase().split(/\s+/));
  const shared = wa.filter((w) => wb.has(w)).length;
  return shared / Math.max(wa.length, 1) >= 0.6;
}
