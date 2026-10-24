'use client';

import React from 'react';
import styles from './reading-lists.module.css';

interface Props {
  isAvailable: boolean;
}

export function StorageWarning({ isAvailable }: Props) {
  if (!isAvailable) {
    return (
      <div className={styles.warningBox} role="alert" aria-live="polite" style={{ borderLeftColor: '#ff5555' }}>
        <div className={styles.warningBoxTitle} style={{ color: '#ff9999' }}>
          <span>⚠️</span> Tarayıcı Yerel Depolaması Kullanılamıyor
        </div>
        <p style={{ margin: 0 }}>
          Tarayıcınızın yerel depolama özelliği (localStorage) kapalı, gizli modda kısıtlı veya kota sınırında.
          Okuma listenize ekleyeceğiniz kayıtlar sayfayı kapattığınızda silinecektir. Lütfen tarayıcı ayarlarınızı kontrol edin.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.warningBox} role="note">
      <div className={styles.warningBoxTitle}>
        <span>🔒</span> Yerel Gizlilik ve Depolama Bildirimi
      </div>
      <p style={{ margin: 0 }}>
        Kişisel koleksiyonlarınız ve notlarınız yalnızca bu tarayıcının yerel hafızasında saklanır.
        Sunucuya herhangi bir kullanıcı verisi veya profil bilgisi aktarılmaz, cihazlar arası otomatik eşitleme yapılmaz.
        Verilerinizin kaybolmaması için <strong>JSON dışa aktar</strong> seçeneğini kullanarak yedek alabilirsiniz.
      </p>
    </div>
  );
}
