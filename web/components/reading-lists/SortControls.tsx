'use client';

import type { SortBy, SortConfig } from '../../lib/reading-lists/types';

import styles from './reading-lists.module.css';

interface Props {
  value: SortConfig;
  onChange: (config: SortConfig) => void;
}

export function SortControls({ value, onChange }: Props) {
  const handleByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...value,
      by: e.target.value as SortBy,
    });
  };

  const toggleOrder = () => {
    onChange({
      ...value,
      order: value.order === 'asc' ? 'desc' : 'asc',
    });
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <label htmlFor="reading-list-sort-select" style={{ fontSize: '0.85rem', color: 'var(--gold, #d1a36d)' }}>
        Sırala:
      </label>
      <select
        id="reading-list-sort-select"
        value={value.by}
        onChange={handleByChange}
        className={styles.sortSelect}
        aria-label="Kayıtları sıralama ölçütü"
      >
        <option value="addedAt">Eklenme Tarihi</option>
        <option value="title">Başlık (A-Z)</option>
        <option value="date">Belge / Olay Tarihi</option>
        <option value="type">Kayıt Türü</option>
      </select>

      <button
        type="button"
        onClick={toggleOrder}
        className={styles.btnSecondary}
        title={value.order === 'asc' ? 'Artan sıra (A-Z / Eskiden yeniye)' : 'Azalan sıra (Z-A / Yeniden eskiye)'}
        aria-label={value.order === 'asc' ? 'Sıralama yönü: Artan' : 'Sıralama yönü: Azalan'}
      >
        <span>{value.order === 'asc' ? '▲ Artan' : '▼ Azalan'}</span>
      </button>
    </div>
  );
}

export { sortItems } from '../../lib/reading-lists/sorting';

