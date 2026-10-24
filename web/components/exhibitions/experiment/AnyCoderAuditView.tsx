'use client';

import React, { useState } from 'react';
import styles from './anycoder-experiment.module.css';

export interface AuditDecision {
  id: string;
  featureName: string;
  category: 'SOURCE_MISSING' | 'DUPLICATE' | 'REJECT' | 'DEFERRED' | 'ACCEPT' | 'ADAPT' | 'QUARANTINE';
  rationale: string;
  securityPosture: string;
  pr27BaselineReference: string;
  adopted: boolean;
}

const DEFAULT_DECISIONS: AuditDecision[] = [
  {
    id: 'AC-DEC-001',
    featureName: 'AnyCoder Orijinal Kaynak Kodu ve ZIP Teslimi',
    category: 'SOURCE_MISSING',
    rationale: 'Yerel dosya sisteminde, Git geçmişinde ve GitHub PR kayıtlarında AnyCoder prototip paketi bulunamamıştır. MKA anayasası uyarınca sahte kod oluşturulamaz.',
    securityPosture: 'NO_EXTERNAL_CODE',
    pr27BaselineReference: 'PR #27 feature/antigravity-v07-immersive-museum',
    adopted: false
  },
  {
    id: 'AC-DEC-002',
    featureName: '3D Sanal Galeri Odası (Virtual Gallery Room)',
    category: 'DUPLICATE',
    rationale: 'PR #27 içerisinde saf CSS 3D Transforms ve klavye destekli salon perspektifi zaten tam erişilebilir şekilde hayata geçirilmiştir. Fazladan WebGL/Three.js bağımlılığı gereksizdir.',
    securityPosture: 'CLEAN',
    pr27BaselineReference: 'web/components/exhibitions/VirtualGalleryRoom.tsx',
    adopted: false
  },
  {
    id: 'AC-DEC-003',
    featureName: 'Birincil Belge Vitrini (Document Showcase)',
    category: 'DUPLICATE',
    rationale: 'PR #27\'de arşiv fon numarası, belge tarihi ve transkripsiyon gösterimi mevcuttur.',
    securityPosture: 'CLEAN',
    pr27BaselineReference: 'web/components/exhibitions/DocumentShowcase.tsx',
    adopted: false
  },
  {
    id: 'AC-DEC-004',
    featureName: 'Haricî CDN / Three.js Script Yükleyicisi',
    category: 'REJECT',
    rationale: 'Haricî script yükleme CSP (Content Security Policy) ihlalidir. Veri sızıntısı ve SSRF riski taşır.',
    securityPosture: 'CSP_RISK',
    pr27BaselineReference: 'N/A (PR #27 uses native CSS 3D, no CDN)',
    adopted: false
  },
  {
    id: 'AC-DEC-005',
    featureName: 'Yanıltıcı \'BİRİNCİL TARİHÎ KAYNAK\' ve \'DOĞRULANMIŞ\' Rozetleri',
    category: 'REJECT',
    rationale: 'İnsan uzman onayı olmaksızın koşulsuz doğruluk veya birincil belge damgası vurulamaz. Bu düzeltme Prompt 26\'ya devredilmiştir.',
    securityPosture: 'PROVENANCE_RISK',
    pr27BaselineReference: 'web/components/exhibitions/SourceInspector.tsx',
    adopted: false
  },
  {
    id: 'AC-DEC-006',
    featureName: 'Staging Önizleme Sızıntısı (Staging Bypass in Production)',
    category: 'REJECT',
    rationale: 'Üretim ortamında onaylanmamış staging sergilerinin public kullanıcılara sunulması yayın etiğine aykırıdır. Düzeltme Prompt 26\'ya aittir.',
    securityPosture: 'PUBLICATION_GATE_RISK',
    pr27BaselineReference: 'web/lib/exhibitions/repository.ts',
    adopted: false
  },
  {
    id: 'AC-DEC-007',
    featureName: 'İnteraktif Sergi Zaman Çizelgesi (Exhibition Timeline)',
    category: 'DUPLICATE',
    rationale: 'PR #27\'de tarihsel olay tarihi ile arşiv muhafaza tarihini ayıran çift tarihli zaman çizgisi halihazırda mevcuttur.',
    securityPosture: 'CLEAN',
    pr27BaselineReference: 'web/components/exhibitions/ExhibitionTimeline.tsx',
    adopted: false
  },
  {
    id: 'AC-DEC-008',
    featureName: 'Müze Hardening ve İnsan Onayı Kapıları Entegrasyonu',
    category: 'DEFERRED',
    rationale: 'Prompt 26 (MKA-ANTIGRAVITY-26) doğrudan sergi motorunun güvenliğini sağlamak ve staging sızıntılarını kapatmak üzere görevlendirilmiştir.',
    securityPosture: 'DEFERRED_TO_TASK_26',
    pr27BaselineReference: 'MKA-ANTIGRAVITY-26',
    adopted: false
  }
];

export function AnyCoderAuditView(): React.JSX.Element {
  const [filter, setFilter] = useState<string>('ALL');

  const filteredDecisions = filter === 'ALL'
    ? DEFAULT_DECISIONS
    : DEFAULT_DECISIONS.filter(d => d.category === filter);

  function getBadgeClass(cat: AuditDecision['category']) {
    switch (cat) {
      case 'SOURCE_MISSING':
        return styles.badgeMissing;
      case 'DUPLICATE':
        return styles.badgeDuplicate;
      case 'REJECT':
        return styles.badgeReject;
      case 'DEFERRED':
        return styles.badgeDeferred;
      default:
        return styles.badgeMissing;
    }
  }

  return (
    <div className={styles.container} role="region" aria-label="AnyCoder Sergi Prototipi Denetim Paneli">
      <header className={styles.header}>
        <div className={styles.badgeMissing} role="status">
          DURUM: SOURCE_MISSING (KAYNAK BULUNAMADI)
        </div>
        <h1 className={styles.title}>AnyCoder Sergi Prototipi Denetim Merkezi</h1>
        <p className={styles.subtitle}>
          Görev 25 kapsamında AnyCoder kaynak kodu ve teslim arşivi taranmış, bulunamadığı kanıtlanmıştır.
          Mevcut PR #27 müze sistemiyle karşılaştırma ve seçici aktarım kararları aşağıda sunulmuştur.
        </p>
      </header>

      <nav className={styles.filterBar} aria-label="Karar Filtreleri">
        <button
          type="button"
          className={`${styles.filterBtn} ${filter === 'ALL' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilter('ALL')}
          aria-pressed={filter === 'ALL'}
        >
          Tümü ({DEFAULT_DECISIONS.length})
        </button>
        <button
          type="button"
          className={`${styles.filterBtn} ${filter === 'SOURCE_MISSING' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilter('SOURCE_MISSING')}
          aria-pressed={filter === 'SOURCE_MISSING'}
        >
          Eksik Kaynak (1)
        </button>
        <button
          type="button"
          className={`${styles.filterBtn} ${filter === 'DUPLICATE' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilter('DUPLICATE')}
          aria-pressed={filter === 'DUPLICATE'}
        >
          PR #27 Mükerrer (3)
        </button>
        <button
          type="button"
          className={`${styles.filterBtn} ${filter === 'REJECT' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilter('REJECT')}
          aria-pressed={filter === 'REJECT'}
        >
          Reddedilen (3)
        </button>
        <button
          type="button"
          className={`${styles.filterBtn} ${filter === 'DEFERRED' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilter('DEFERRED')}
          aria-pressed={filter === 'DEFERRED'}
        >
          Devredilen (1)
        </button>
      </nav>

      <div className={styles.grid} role="list" aria-label="Denetim Kararları">
        {filteredDecisions.map((decision) => (
          <article key={decision.id} className={styles.card} role="listitem">
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{decision.featureName}</h2>
              <span className={getBadgeClass(decision.category)}>{decision.category}</span>
            </div>
            <p className={styles.cardRationale}>{decision.rationale}</p>
            <div className={styles.cardMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Karar No:</span>
                <span>{decision.id}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Güvenlik Durumu:</span>
                <span>{decision.securityPosture}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>PR #27 Karşılığı:</span>
                <span>{decision.pr27BaselineReference}</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className={styles.sandboxSection} aria-labelledby="sandbox-heading">
        <h2 id="sandbox-heading" className={styles.sandboxTitle}>
          Prototip Güvenlik ve İzolasyon Sınırları
        </h2>
        <ul className={styles.sandboxList}>
          <li>
            <strong>Zip-Slip Koruması:</strong> Üçüncü taraf arşiv girdilerinde yol aşımı (<code>../</code>, mutlak sürücü, UNC) tespitinde fail-closed mekanizması devreye girer.
          </li>
          <li>
            <strong>CSP ve Haricî CDN İzolasyonu:</strong> Script ve fontlar için üçüncü taraf CDN kullanımı engellenmiştir; Next.js güvenlik duvarı korunur.
          </li>
          <li>
            <strong>Telif ve AI Bildirimi:</strong> Tarihî belge olmayan yapay zekâ görselleri için <em>&ldquo;Yapay zekâ ile oluşturulmuş temsili görsel&rdquo;</em> ibaresi zorunludur.
          </li>
          <li>
            <strong>Sıfır Sahte Kod Taahhüdü:</strong> Doğrulanabilir AnyCoder kaynağı mevcut olmadığından sahte implementasyon oluşturulmamıştır.
          </li>
        </ul>
        <div className={styles.securityNote}>
          MKA Anayasası (AGENTS.md) gereğince: Tarihî arşiv belgeleri uydurulamaz; insan tarihçi onayı bulunmayan alanlara sahte onay mühürleri konulamaz.
        </div>
      </section>
    </div>
  );
}
