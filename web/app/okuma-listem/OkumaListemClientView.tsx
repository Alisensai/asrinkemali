'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  ReadingListsProvider,
  CollectionPanel,
  ImportExportPanel,
  StorageWarning,
} from '../../components/reading-lists';
import { useReadingLists } from '../../lib/reading-lists/use-reading-lists';
import type { ArchiveRecordRef } from '../../lib/reading-lists/types';
import styles from '../../components/reading-lists/reading-lists.module.css';

const emptySubscribe = () => () => {};

interface Props {
  publishedRecords: ArchiveRecordRef[];
}

function InnerView() {
  const { isStorageAvailable } = useReadingLists();
  const hasMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );


  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Okuma Listem & Kişisel Koleksiyonlar</h1>
            <p className={styles.description}>
              Atatürk ve Cumhuriyet dönemi arşivindeki önemli belgeleri, fotoğrafları ve konuşmaları kişisel okuma listelerinize ekleyin,
              özel araştırma notları düşün ve sonra okumak üzere düzenleyin.
            </p>
          </div>
          <Link href="/arsiv" className={styles.backLink}>
            <span>←</span> Dijital Arşive Dön
          </Link>
        </div>
      </header>

      {hasMounted && <StorageWarning isAvailable={isStorageAvailable} />}

      <div className={styles.mainLayout}>
        <CollectionPanel />
        <ImportExportPanel />
      </div>
    </div>
  );
}

export function OkumaListemClientView({ publishedRecords }: Props) {
  return (
    <ReadingListsProvider availableArchiveRecords={publishedRecords}>
      <InnerView />
    </ReadingListsProvider>
  );
}
