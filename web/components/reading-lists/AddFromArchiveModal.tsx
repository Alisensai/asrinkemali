'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { ArchiveRecordRef } from '../../lib/reading-lists/types';
import { getTypeLabel } from '../../lib/reading-lists/archive-adapter';
import styles from './reading-lists.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  availableRecords: ArchiveRecordRef[];
  currentCollectionItemIds: Set<string>;
  onAddRecord: (record: ArchiveRecordRef) => Promise<void>;
  collectionName: string;
}

export function AddFromArchiveModal({
  isOpen,
  onClose,
  availableRecords,
  currentCollectionItemIds,
  onAddRecord,
  collectionName,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return availableRecords.filter((rec) => {
      if (selectedType && rec.type !== selectedType) return false;
      if (!query) return true;
      const titleMatch = rec.title.toLowerCase().includes(query);
      const instMatch = rec.institution?.toLowerCase().includes(query);
      return titleMatch || instMatch;
    }).slice(0, 50); // Performans için ilk 50 kayıt
  }, [availableRecords, search, selectedType]);

  const handleAdd = async (record: ArchiveRecordRef) => {
    try {
      setAddingId(record.id);
      await onAddRecord(record);
      setAddedIds((prev) => new Set(prev).add(record.id));
      setStatusMessage(`"${record.title}" koleksiyona eklendi.`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setStatusMessage(`Hata: ${e.message || 'Eklenemedi'}`);
    } finally {
      setAddingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.modalContent}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-archive-modal-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="add-archive-modal-title" className={styles.modalTitle}>
            Arşivden Kayıt Ekle
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.modalCloseBtn}
            aria-label="Modalı kapat"
          >
            ✕ Kapat
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(244, 232, 214, 0.75)' }}>
          <strong>&ldquo;{collectionName}&rdquo;</strong> koleksiyonuna eklemek için yayınlanmış arşiv kayıtları arasında arama yapın.
        </p>

        {statusMessage && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.825rem',
              background: statusMessage.startsWith('Hata') ? 'rgba(80, 15, 15, 0.8)' : 'rgba(20, 60, 20, 0.8)',
              color: statusMessage.startsWith('Hata') ? '#ffcccc' : '#ccffcc',
              border: '1px solid currentColor',
            }}
          >
            {statusMessage}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Başlık veya kurum ile filtrele..."
            className={styles.formInput}
            aria-label="Arşiv kayıtlarında ara"
          />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className={styles.sortSelect}
            aria-label="Kayıt türüne göre filtrele"
          >
            <option value="">Tüm Türler</option>
            <option value="photograph">Fotoğraf</option>
            <option value="document">Belge</option>
            <option value="speech">Konuşma / Nutuk</option>
            <option value="event">Tarihî Olay</option>
            <option value="publication">Süreli Yayın</option>
            <option value="place">Tarihî Mekân</option>
          </select>
        </div>

        <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {filteredRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(244, 232, 214, 0.6)', fontSize: '0.9rem' }}>
              Aramanızla eşleşen yayınlanmış arşiv kaydı bulunamadı.
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const alreadyInCollection = currentCollectionItemIds.has(rec.id) || addedIds.has(rec.id);
              const isCurrentlyAdding = addingId === rec.id;

              return (
                <div
                  key={rec.id}
                  style={{
                    background: 'rgba(24, 18, 18, 0.8)',
                    border: '1px solid rgba(209, 163, 109, 0.2)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--cream, #f4e8d6)', lineHeight: 1.3 }}>
                      {rec.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(244, 232, 214, 0.6)', marginTop: '0.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {rec.type && <span>{getTypeLabel(rec.type)}</span>}
                      {rec.date && <span>• 📅 {rec.date}</span>}
                      {rec.institution && <span>• 🏛️ {rec.institution}</span>}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdd(rec)}
                    disabled={alreadyInCollection || isCurrentlyAdding}
                    className={alreadyInCollection ? styles.btnSecondary : styles.btnPrimary}
                    style={{ minHeight: '38px', padding: '0.4rem 0.85rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    aria-label={isCurrentlyAdding ? `${rec.title} ekleniyor` : alreadyInCollection ? `${rec.title} listede` : `${rec.title} listeye ekle`}
                  >
                    {isCurrentlyAdding ? 'Ekleniyor…' : alreadyInCollection ? '✓ Listede' : '+ Ekle'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
