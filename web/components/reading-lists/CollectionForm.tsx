'use client';

import React, { useState } from 'react';
import styles from './reading-lists.module.css';
import { MAX_COLLECTION_NAME_LENGTH, MAX_COLLECTION_DESC_LENGTH } from '../../lib/reading-lists/constants';

interface Props {
  initialName?: string;
  initialDescription?: string;
  submitLabel?: string;
  onSubmit: (name: string, description?: string) => Promise<void>;
  onCancel: () => void;
}

export function CollectionForm({
  initialName = '',
  initialDescription = '',
  submitLabel = 'Oluştur',
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Lütfen bir koleksiyon adı girin.');
      return;
    }
    if (trimmedName.length > MAX_COLLECTION_NAME_LENGTH) {
      setError(`Koleksiyon adı en fazla ${MAX_COLLECTION_NAME_LENGTH} karakter olabilir.`);
      return;
    }
    if (description && description.length > MAX_COLLECTION_DESC_LENGTH) {
      setError(`Açıklama en fazla ${MAX_COLLECTION_DESC_LENGTH} karakter olabilir.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(trimmedName, description.trim() || undefined);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Koleksiyon kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.toolsCard} style={{ background: '#1c1414', border: '1px solid var(--gold, #d1a36d)' }}>
      <div className={styles.toolsCardTitle}>
        <span>📁</span> {initialName ? 'Koleksiyonu Düzenle' : 'Yeni Koleksiyon Oluştur'}
      </div>

      {error && (
        <div style={{ color: '#ff9999', fontSize: '0.8rem', background: 'rgba(80, 15, 15, 0.5)', padding: '0.5rem', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <div className={styles.formGroup}>
        <label htmlFor="collection-name-input" className={styles.formLabel}>
          Koleksiyon Adı <span style={{ color: '#ff9999' }}>*</span>
        </label>
        <input
          id="collection-name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_COLLECTION_NAME_LENGTH}
          placeholder="Örn: Millî Mücadele Belgeleri"
          className={styles.formInput}
          required
          autoFocus
        />
        <div className={styles.charCount}>
          {name.length} / {MAX_COLLECTION_NAME_LENGTH}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="collection-desc-input" className={styles.formLabel}>
          Açıklama (İsteğe Bağlı)
        </label>
        <textarea
          id="collection-desc-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={MAX_COLLECTION_DESC_LENGTH}
          placeholder="Koleksiyonun kapsamı veya amacı hakkında kısa bilgi..."
          className={styles.formTextarea}
        />
        <div className={styles.charCount}>
          {description.length} / {MAX_COLLECTION_DESC_LENGTH}
        </div>
      </div>

      <div className={styles.formActions}>
        <button
          type="submit"
          disabled={isSubmitting}
          className={styles.btnPrimary}
        >
          {isSubmitting ? 'Kaydediliyor…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className={styles.btnSecondary}
        >
          İptal
        </button>
      </div>
    </form>
  );
}
