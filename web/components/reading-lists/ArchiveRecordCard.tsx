'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { ReadingItem } from '../../lib/reading-lists/types';
import { getTypeLabel } from '../../lib/reading-lists/archive-adapter';
import { MAX_NOTE_LENGTH } from '../../lib/reading-lists/constants';
import styles from './reading-lists.module.css';

interface Props {
  item: ReadingItem;
  isMissing?: boolean;
  collectionsForMove?: { id: string; name: string }[];
  onRemove?: () => void;
  onToggleReadLater?: () => void;
  onEditNote?: (note: string) => void;
  onMove?: (targetCollectionId: string) => void;
}

export function ArchiveRecordCard({
  item,
  isMissing = false,
  collectionsForMove = [],
  onRemove,
  onToggleReadLater,
  onEditNote,
  onMove,
}: Props) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(item.note || '');

  const snapshot = item.snapshot;
  const title = snapshot?.title || 'Başlıksız Kayıt';
  const date = snapshot?.date;
  const institution = snapshot?.institution;
  const type = snapshot?.type;
  const targetUrl = snapshot?.url || (snapshot?.slug ? `/arsiv/${snapshot.slug}` : undefined);

  const handleSaveNote = () => {
    if (onEditNote) {
      onEditNote(noteText.trim());
    }
    setIsEditingNote(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' && onRemove && !isEditingNote) {
      onRemove();
    }
  };

  return (
    <article
      tabIndex={0}
      aria-label={`Arşiv kaydı: ${title}`}
      onKeyDown={handleKeyDown}
      className={`${styles.recordCard} ${isMissing ? styles.recordCardMissing : ''}`}
    >
      {isMissing && (
        <div
          role="alert"
          style={{
            background: 'rgba(80, 20, 20, 0.7)',
            border: '1px solid #ff7777',
            borderRadius: '6px',
            padding: '0.5rem 0.75rem',
            fontSize: '0.8rem',
            color: '#ffcccc',
          }}
        >
          ⚠️ Bu kayıt yayından kaldırılmış veya arşivde bulunamıyor. Koleksiyonunuzda yalnızca kaydedildiği andaki kısa özeti görüntülenmektedir.
        </div>
      )}

      <div className={styles.recordCardTop}>
        <h3 className={styles.recordCardTitle}>
          {title}
        </h3>
        {item.readLater && (
          <span className={styles.readLaterBadge} aria-label="Sonra okunacak olarak işaretli">
            SONRA OKU
          </span>
        )}
      </div>

      <div className={styles.recordCardMeta}>
        {type && (
          <span className={styles.metaBadge}>
            {getTypeLabel(type)}
          </span>
        )}
        {date && (
          <span>📅 {date}</span>
        )}
        {institution && (
          <span>🏛️ {institution}</span>
        )}
        <span>➕ {new Date(item.addedAt).toLocaleDateString('tr-TR')}</span>
      </div>

      {/* Kişisel Not Bölmesi */}
      {isEditingNote ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label htmlFor={`note-input-${item.recordId}`} style={{ fontSize: '0.8rem', color: 'var(--gold, #d1a36d)' }}>
            Kişisel Notunuz (Azami {MAX_NOTE_LENGTH} karakter):
          </label>
          <textarea
            id={`note-input-${item.recordId}`}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value.slice(0, MAX_NOTE_LENGTH))}
            maxLength={MAX_NOTE_LENGTH}
            className={styles.formTextarea}
            placeholder="Bu belge hakkındaki kişisel araştırma notlarınız..."
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(244, 232, 214, 0.5)' }}>
              {noteText.length} / {MAX_NOTE_LENGTH}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={handleSaveNote}
                className={styles.btnPrimary}
                style={{ minHeight: '36px', padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => {
                  setNoteText(item.note || '');
                  setIsEditingNote(false);
                }}
                className={styles.btnSecondary}
                style={{ minHeight: '36px', padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      ) : item.note ? (
        <div className={styles.noteBox}>
          <strong>Kişisel Not:</strong> {item.note}
        </div>
      ) : null}

      {/* Aksiyon Butonları */}
      <div className={styles.recordCardActions}>
        {targetUrl && !isMissing ? (
          <Link
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cardActionLink}
          >
            Arşivde İncele →
          </Link>
        ) : (
          <span style={{ fontSize: '0.85rem', color: 'rgba(244, 232, 214, 0.5)' }}>
            Detay bağlantısı mevcut değil
          </span>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' }}>
          {onToggleReadLater && (
            <button
              type="button"
              onClick={onToggleReadLater}
              className={`${styles.cardActionBtn} ${item.readLater ? styles.cardActionBtnActive : ''}`}
              aria-pressed={item.readLater}
              aria-label={item.readLater ? "Sonra okundu olarak işaretli" : "Sonra oku olarak işaretle"}
            >
              <span>{item.readLater ? '✓ İşaretli' : '🔖 Sonra oku'}</span>
            </button>
          )}

          {!isEditingNote && onEditNote && (
            <button
              type="button"
              onClick={() => setIsEditingNote(true)}
              className={styles.cardActionBtn}
            >
              <span>✏️ {item.note ? 'Notu Düzenle' : 'Not Ekle'}</span>
            </button>
          )}

          {collectionsForMove.length > 0 && onMove && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onMove(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className={styles.moveSelect}
              aria-label="Kaydı başka koleksiyona taşı"
            >
              <option value="" disabled>Başka koleksiyona taşı...</option>
              {collectionsForMove.map((c) => (
                <option key={c.id} value={c.id}>
                  📁 {c.name}
                </option>
              ))}
            </select>
          )}

          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className={styles.btnDanger}
              style={{ minHeight: '36px', padding: '0.35rem 0.65rem' }}
              aria-label={`"${title}" kaydını bu koleksiyondan kaldır`}
            >
              🗑️ Kaldır
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
