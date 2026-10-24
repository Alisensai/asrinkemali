'use client';

import React, { useRef, useState } from 'react';
import { useReadingListsContext } from './ReadingListsProvider';
import styles from './reading-lists.module.css';

export function ImportExportPanel() {
  const { exportJSON, importJSON, clearAll, isStorageAvailable } = useReadingListsContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
    warnings?: string[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async () => {
    try {
      setIsProcessing(true);
      const jsonStr = await exportJSON();
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `asrin-kemali-koleksiyonlar-${today}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setImportStatus({
        type: 'error',
        message: 'Dışa aktarma sırasında bir hata oluştu.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      setImportStatus({
        type: 'error',
        message: 'Yalnızca .json uzantılı yedek dosyaları yüklenebilir.',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsProcessing(true);
      setImportStatus(null);
      const text = await file.text();
      const res = await importJSON(text);

      if (res.success) {
        setImportStatus({
          type: 'success',
          message: `${res.importedCollections} koleksiyon ve ${res.importedItems} kayıt başarıyla içe aktarıldı.`,
          warnings: res.warnings,
        });
      } else {
        setImportStatus({
          type: 'error',
          message: res.errors.join(' ') || 'İçe aktarma doğrulanamadı.',
        });
      }
    } catch {
      setImportStatus({
        type: 'error',
        message: 'Dosya okunurken veya işlenirken bir hata oluştu.',
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClear = async () => {
    if (window.confirm('Tüm koleksiyonlarınızı ve kişisel notlarınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        setIsProcessing(true);
        await clearAll();
        setImportStatus({
          type: 'success',
          message: 'Tüm kişisel koleksiyon verileri başarıyla temizlendi.',
        });
      } catch {
        setImportStatus({
          type: 'error',
          message: 'Veriler temizlenirken bir hata oluştu.',
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className={styles.toolsSidebar}>
      {/* Yedekleme & İçe/Dışa Aktarma */}
      <div className={styles.toolsCard}>
        <div className={styles.toolsCardTitle}>
          <span>💾</span> Yedekleme & Aktarım
        </div>
        <p className={styles.toolsCardText}>
          Koleksiyonlarınızı ve kişisel notlarınızı JSON dosyası olarak kaydedebilir veya başka bir tarayıcıdan içe aktarabilirsiniz.
        </p>

        {importStatus && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '0.6rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              background: importStatus.type === 'success' ? 'rgba(20, 60, 20, 0.8)' : 'rgba(80, 15, 15, 0.8)',
              color: importStatus.type === 'success' ? '#ccffcc' : '#ffcccc',
              border: '1px solid currentColor',
            }}
          >
            <div>{importStatus.message}</div>
            {importStatus.warnings && importStatus.warnings.length > 0 && (
              <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1rem', fontSize: '0.75rem' }}>
                {importStatus.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleExport}
            disabled={isProcessing || !isStorageAvailable}
            className={styles.btnSecondary}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            📥 JSON Dışa Aktar
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="reading-lists-file-input"
            aria-label="Koleksiyon JSON dosyasını seçin"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || !isStorageAvailable}
            className={styles.btnSecondary}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            📤 JSON İçe Aktar
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={isProcessing || !isStorageAvailable}
            className={styles.btnDanger}
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}
          >
            🗑️ Tüm Verileri Sıfırla
          </button>
        </div>
      </div>

      {/* Güvenlik & Gizlilik İlkeleri */}
      <div className={styles.toolsCard} style={{ background: 'rgba(12, 9, 9, 0.9)' }}>
        <div className={styles.toolsCardTitle} style={{ fontSize: '0.9rem', color: 'var(--gold, #d1a36d)' }}>
          <span>⚖️</span> Gizlilik ve Veri Güvenliği
        </div>
        <ul className={styles.toolsList}>
          <li>Tam metin veya telifli dosya saklanmaz; yalnızca kayıt kimliği ve başlık referansı tutulur.</li>
          <li>Koleksiyonlarınız hiçbir sunucuya yüklenmez, cihazlar arası senkronize edilmez.</li>
          <li>İçe aktarılan JSON dosyaları boyut (500KB), XSS ve prototip kirlenmesine karşı otomatik taranır.</li>
          <li>Tarayıcı geçmişini temizlerseniz yerel veriler kaybolabileceğinden düzenli JSON yedeği alınız.</li>
        </ul>
      </div>
    </div>
  );
}
