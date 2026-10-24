'use client';

import React from 'react';
import Link from 'next/link';
import styles from './reading-lists.module.css';

interface EmptyStateProps {
  onCreateClick: () => void;
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className={styles.emptyStateWrapper} role="region" aria-label="Henüz koleksiyon bulunmuyor">
      <div style={{ fontSize: '2.5rem' }}>📚</div>
      <h3 className={styles.emptyStateTitle}>Henüz Bir Koleksiyon Oluşturmadınız</h3>
      <p className={styles.emptyStateDesc}>
        Atatürk ve Cumhuriyet dönemi arşivindeki önemli belgeleri, fotoğrafları ve konuşmaları kişisel okuma listelerinize kaydedebilirsiniz.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={onCreateClick}
          className={styles.btnPrimary}
        >
          <span>+</span> İlk koleksiyonu oluştur
        </button>
        <Link href="/arsiv" className={styles.btnSecondary}>
          Arşivi Keşfet →
        </Link>
      </div>
    </div>
  );
}

interface EmptyCollectionProps {
  collectionName: string;
  onAddFromArchive?: () => void;
}

export function EmptyCollection({ collectionName, onAddFromArchive }: EmptyCollectionProps) {
  return (
    <div className={styles.emptyStateWrapper} role="region" aria-label={`"${collectionName}" koleksiyonu boş`}>
      <div style={{ fontSize: '2rem' }}>📜</div>
      <h3 className={styles.emptyStateTitle}>&ldquo;{collectionName}&rdquo; Henüz Boş</h3>
      <p className={styles.emptyStateDesc}>
        Bu koleksiyona henüz hiçbir arşiv belgesi eklenmedi. Dijital arşivden veya hızlı arama ile kayıt ekleyebilirsiniz.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {onAddFromArchive && (
          <button
            type="button"
            onClick={onAddFromArchive}
            className={styles.btnPrimary}
          >
            <span>+</span> Arşivden Kayıt Ekle
          </button>
        )}
        <Link href="/arsiv" className={styles.btnSecondary}>
          Dijital Arşive Git →
        </Link>
      </div>
    </div>
  );
}
