'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { ArchiveRecordRef } from '../../lib/reading-lists/types';
import { useReadingListsContext } from './ReadingListsProvider';
import styles from './reading-lists.module.css';

interface Props {
  record: ArchiveRecordRef;
  compact?: boolean;
}

export function AddToCollectionButton({ record, compact = false }: Props) {
  const {
    collections,
    addRecord,
    addToDefault,
    isInAnyCollection,
    isStorageAvailable,
    createCollection,
  } = useReadingListsContext();

  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newColName, setNewColName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const alreadySaved = isInAnyCollection(record.id);

  // Dışarı tıklandığında menüyü kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreatingNew(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleQuickAdd = async () => {
    if (!isStorageAvailable) {
      setStatus('Depolama kapalı');
      return;
    }

    try {
      if (collections.length === 0) {
        await addToDefault(record);
        setStatus('✓ Listeye Eklendi');
      } else {
        setIsOpen((prev) => !prev);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setStatus(e.message || 'Hata');
    }
  };

  const handleSelectCollection = async (collectionId: string) => {
    try {
      await addRecord(collectionId, record);
      setStatus('✓ Eklendi');
      setTimeout(() => {
        setIsOpen(false);
        setStatus(null);
      }, 1200);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setStatus(e.message || 'Hata');
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newColName.trim();
    if (!trimmed) return;

    try {
      const newCol = await createCollection(trimmed);
      await addRecord(newCol.id, record);
      setStatus('✓ Yeni listeye eklendi');
      setNewColName('');
      setIsCreatingNew(false);
      setTimeout(() => {
        setIsOpen(false);
        setStatus(null);
      }, 1200);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setStatus(e.message || 'Hata');
    }
  };

  if (compact) {
    return (
      <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={!isStorageAvailable}
          className={alreadySaved ? styles.btnSecondary : styles.btnPrimary}
          style={{ minHeight: '38px', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
          aria-label={`${record.title} okuma listesine ekle`}
          aria-expanded={isOpen}
          title={alreadySaved ? 'Zaten listenizde kayıtlı' : 'Okuma listesine ekle'}
        >
          {status || (alreadySaved ? '★ Listede' : '+ Liste')}
        </button>

        {isOpen && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: '6px',
              background: '#161010',
              border: '1px solid var(--gold, #d1a36d)',
              borderRadius: '8px',
              padding: '0.5rem',
              minWidth: '220px',
              zIndex: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--gold, #d1a36d)', fontWeight: 700, padding: '0.2rem 0.4rem' }}>
              Hangi koleksiyona eklensin?
            </div>

            {collections.map((col) => {
              const inThisCol = col.items.some((i) => i.recordId === record.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleSelectCollection(col.id)}
                  disabled={inThisCol}
                  className={styles.btnSecondary}
                  style={{
                    width: '100%',
                    justifyContent: 'space-between',
                    minHeight: '36px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📁 {col.name}
                  </span>
                  {inThisCol && <span style={{ fontSize: '0.7rem', color: 'var(--gold, #d1a36d)' }}>✓</span>}
                </button>
              );
            })}

            {!isCreatingNew ? (
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className={styles.btnSecondary}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  minHeight: '34px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  borderStyle: 'dashed',
                  marginTop: '0.25rem',
                }}
              >
                + Yeni Liste Oluştur
              </button>
            ) : (
              <form onSubmit={handleCreateAndAdd} style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="Liste adı..."
                  maxLength={80}
                  className={styles.formInput}
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    style={{ minHeight: '32px', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    Ekle
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className={styles.btnSecondary}
                    style={{ minHeight: '32px', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    Vazgeç
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={!isStorageAvailable}
        className={alreadySaved ? styles.btnSecondary : styles.btnPrimary}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`${record.title} okuma listesine ekle`}
      >
        <span>{alreadySaved ? '★' : '+'}</span>
        {status || (alreadySaved ? 'Koleksiyonlarımda' : 'Okuma Listeme Ekle')}
      </button>

      {isOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '6px',
            background: '#161010',
            border: '1px solid var(--gold, #d1a36d)',
            borderRadius: '8px',
            padding: '0.75rem',
            minWidth: '260px',
            zIndex: 200,
            boxShadow: '0 8px 24px rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--gold, #d1a36d)', fontWeight: 700 }}>
            Koleksiyon Seçin:
          </div>

          {collections.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'rgba(244, 232, 214, 0.7)' }}>
              Henüz koleksiyon bulunmuyor.
            </div>
          ) : (
            collections.map((col) => {
              const inThisCol = col.items.some((i) => i.recordId === record.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleSelectCollection(col.id)}
                  disabled={inThisCol}
                  className={styles.btnSecondary}
                  style={{ width: '100%', justifyContent: 'space-between', padding: '0.4rem 0.75rem' }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📁 {col.name}
                  </span>
                  {inThisCol && <span style={{ fontSize: '0.75rem', color: 'var(--gold, #d1a36d)' }}>✓ Listede</span>}
                </button>
              );
            })
          )}

          {!isCreatingNew ? (
            <button
              type="button"
              onClick={() => setIsCreatingNew(true)}
              className={styles.btnSecondary}
              style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed', marginTop: '0.25rem' }}
            >
              + Yeni Koleksiyon Aç ve Ekle
            </button>
          ) : (
            <form onSubmit={handleCreateAndAdd} style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <input
                type="text"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Yeni koleksiyon adı..."
                maxLength={80}
                className={styles.formInput}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button type="submit" className={styles.btnPrimary} style={{ flex: 1, justifyContent: 'center' }}>
                  Oluştur ve Ekle
                </button>
                <button type="button" onClick={() => setIsCreatingNew(false)} className={styles.btnSecondary}>
                  İptal
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
