'use client';

import React, { useState, useMemo } from 'react';
import type { SortConfig } from '../../lib/reading-lists/types';
import { useReadingListsContext } from './ReadingListsProvider';
import { ArchiveRecordCard } from './ArchiveRecordCard';
import { SortControls, sortItems } from './SortControls';
import { EmptyCollection, EmptyState } from './EmptyState';
import { CollectionForm } from './CollectionForm';
import { AddFromArchiveModal } from './AddFromArchiveModal';
import styles from './reading-lists.module.css';

export function CollectionPanel() {
  const {
    collections,
    isLoading,
    createCollection,
    deleteCollection,
    updateCollection,
    removeRecord,
    toggleReadLater,
    updateNote,
    moveItem,
    addRecord,
    availableArchiveRecords,
    isRecordPublished,
  } = useReadingListsContext();

  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddFromArchive, setShowAddFromArchive] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ by: 'addedAt', order: 'desc' });
  const [filterReadLater, setFilterReadLater] = useState(false);

  const activeCollection = useMemo(() => {
    if (activeCollectionId) {
      const found = collections.find((c) => c.id === activeCollectionId);
      if (found) return found;
    }
    return collections[0] || null;
  }, [collections, activeCollectionId]);

  const sortedItems = useMemo(() => {
    if (!activeCollection) return [];
    let items = [...activeCollection.items];
    if (filterReadLater) {
      items = items.filter((i) => i.readLater);
    }
    return sortItems(items, sortConfig);
  }, [activeCollection, sortConfig, filterReadLater]);

  const currentItemIds = useMemo(() => {
    if (!activeCollection) return new Set<string>();
    return new Set(activeCollection.items.map((i) => i.recordId));
  }, [activeCollection]);

  if (isLoading) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'rgba(244, 232, 214, 0.6)' }}>
        Koleksiyonlar yükleniyor…
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <EmptyState onCreateClick={() => setShowCreateForm(true)} />
        {showCreateForm && (
          <CollectionForm
            onSubmit={async (name, desc) => {
              await createCollection(name, desc);
              setShowCreateForm(false);
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.collectionSplit}>
      {/* Sol Sütun: Koleksiyon Listesi */}
      <aside className={styles.collectionsSidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>
            Koleksiyonlar ({collections.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className={styles.btnPrimary}
            style={{ minHeight: '34px', padding: '0.25rem 0.65rem', fontSize: '0.8rem' }}
            aria-label="Yeni koleksiyon oluştur"
          >
            + Yeni
          </button>
        </div>

        {showCreateForm && (
          <div style={{ marginBottom: '0.5rem' }}>
            <CollectionForm
              onSubmit={async (name, desc) => {
                await createCollection(name, desc);
                setShowCreateForm(false);
              }}
              onCancel={() => setShowCreateForm(false)}
              submitLabel="Oluştur"
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '65vh', overflowY: 'auto' }}>
          {collections.map((col) => {
            const isActive = activeCollection?.id === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => {
                  setActiveCollectionId(col.id);
                  setEditingId(null);
                }}
                className={`${styles.collectionButton} ${isActive ? styles.collectionButtonActive : ''}`}
                aria-current={isActive ? 'true' : undefined}
              >
                <div className={styles.collectionName}>
                  📁 {col.name}
                </div>
                <div className={styles.collectionMeta}>
                  {col.items.length} kayıt • {new Date(col.updatedAt).toLocaleDateString('tr-TR')}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Sağ Sütun: Aktif Koleksiyon İçeriği */}
      <section className={styles.activeCollectionPane}>
        {activeCollection ? (
          <>
            <div className={styles.collectionCardHeader}>
              <div className={styles.collectionTitleRow}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  {editingId === activeCollection.id ? (
                    <CollectionForm
                      initialName={activeCollection.name}
                      initialDescription={activeCollection.description}
                      submitLabel="Kaydet"
                      onSubmit={async (name, desc) => {
                        await updateCollection(activeCollection.id, { name, description: desc });
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      <h2 className={styles.activeColTitle}>{activeCollection.name}</h2>
                      {activeCollection.description && (
                        <p className={styles.activeColDesc}>{activeCollection.description}</p>
                      )}
                      <p className={styles.activeColDates}>
                        Oluşturulma: {new Date(activeCollection.createdAt).toLocaleDateString('tr-TR')} •
                        Son Güncelleme: {new Date(activeCollection.updatedAt).toLocaleDateString('tr-TR')}
                      </p>
                    </>
                  )}
                </div>

                {editingId !== activeCollection.id && (
                  <div className={styles.colActionBtns}>
                    <button
                      type="button"
                      onClick={() => setShowAddFromArchive(true)}
                      className={styles.btnPrimary}
                      aria-label="Arşivden kayıt ekle"
                    >
                      <span>+</span> Arşivden Ekle
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(activeCollection.id)}
                      className={styles.btnSecondary}
                    >
                      ✏️ Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`"${activeCollection.name}" koleksiyonunu silmek istediğinize emin misiniz?`)) {
                          await deleteCollection(activeCollection.id);
                          setActiveCollectionId(null);
                        }
                      }}
                      className={styles.btnDanger}
                    >
                      🗑️ Sil
                    </button>
                  </div>
                )}
              </div>

              {/* Kontroller Çubuğu */}
              <div className={styles.controlsRow}>
                <SortControls value={sortConfig} onChange={setSortConfig} />

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={filterReadLater}
                    onChange={(e) => setFilterReadLater(e.target.checked)}
                  />
                  <span>Sadece sonra oku</span>
                </label>

                <div className={styles.recordCount}>
                  {sortedItems.length} / {activeCollection.items.length} kayıt
                </div>
              </div>
            </div>

            {/* Kayıtlar Listesi */}
            {sortedItems.length === 0 ? (
              activeCollection.items.length === 0 ? (
                <EmptyCollection
                  collectionName={activeCollection.name}
                  onAddFromArchive={() => setShowAddFromArchive(true)}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(244, 232, 214, 0.6)' }}>
                  Seçilen filtrelere uygun kayıt bulunamadı.
                </div>
              )
            ) : (
              <div className={styles.recordsList}>
                {sortedItems.map((item) => {
                  const isMissing = !isRecordPublished(item.recordId);
                  const otherCollections = collections
                    .filter((c) => c.id !== activeCollection.id)
                    .map((c) => ({ id: c.id, name: c.name }));

                  return (
                    <ArchiveRecordCard
                      key={`${activeCollection.id}-${item.recordId}`}
                      item={item}
                      isMissing={isMissing}
                      collectionsForMove={otherCollections}
                      onRemove={() => removeRecord(activeCollection.id, item.recordId)}
                      onToggleReadLater={() => toggleReadLater(activeCollection.id, item.recordId)}
                      onEditNote={(note) => updateNote(activeCollection.id, item.recordId, note)}
                      onMove={(targetId) => moveItem(activeCollection.id, targetId, item.recordId)}
                    />
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'rgba(244, 232, 214, 0.6)' }}>
            Lütfen sol menüden bir koleksiyon seçin.
          </div>
        )}
      </section>

      {/* Arşivden Ekleme Modalı */}
      {showAddFromArchive && activeCollection && (
        <AddFromArchiveModal
          isOpen={showAddFromArchive}
          onClose={() => setShowAddFromArchive(false)}
          availableRecords={availableArchiveRecords}
          currentCollectionItemIds={currentItemIds}
          collectionName={activeCollection.name}
          onAddRecord={async (rec) => {
            await addRecord(activeCollection.id, rec);
          }}
        />
      )}
    </div>
  );
}
