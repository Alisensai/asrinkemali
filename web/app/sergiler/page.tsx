import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { getExhibitions, getExhibitionThemes } from "@/lib/exhibitions/repository";
import { ExhibitionsDirectoryClient } from "@/components/exhibitions/ExhibitionsDirectoryClient";
import styles from "@/components/exhibitions/exhibitions.module.css";

import Link from "next/link";

export const metadata: Metadata = {
  title: "Dijital Sergiler | Küratöryel Müze Deneyimi",
  description:
    "Mustafa Kemal Atatürk ve Cumhuriyet devrimlerinin tarihsel belgelerle anlatıldığı, 3D sanal salon ve belge odaklı dijital sergiler.",
  alternates: { canonical: "/sergiler" },
};

export default function ExhibitionsPage() {
  const isDev = process.env.NODE_ENV !== "production";
  const exhibitions = getExhibitions({ includeStaging: isDev });
  const themes = getExhibitionThemes({ includeStagingInDev: isDev });

  return (
    <ContentPage eyebrow="DİJİTAL MÜZE" title="KÜRATÖRYEL SERGİLER">
      <div className={styles.directoryStack}>
        <div className={styles.directoryHero}>
          <h2>Bir Asrın Belgeleriyle Tarihe Yolculuk</h2>
          <p>
            Asrın Kemali Dijital Müzesi, Mustafa Kemal Atatürk ve Cumhuriyet döneminin
            dönüm noktalarını birincil tarihî kaynaklar, yüksek çözünürlüklü arşiv kayıtları
            ve bilimsel küratöryel anlatımlarla sunar. Sergileri sanal galeri odasında 3D
            perspektifle veya tam liste modunda inceleyebilirsiniz.
          </p>
        </div>

        {exhibitions.length > 0 ? (
          <ExhibitionsDirectoryClient
            initialExhibitions={exhibitions}
            themes={themes}
          />
        ) : (
          <div className={styles.emptyStateContainer} data-testid="exhibitions-empty-state">
            <div className={styles.emptyStateCard}>
              <span className={styles.emptyStateEyebrow}>KÜRATÖRYEL ARŞİV</span>
              <h2>Yayınlanmış Sergi Hazırlanıyor</h2>
              <p>
                Şu anda bu ortamda halka açık yayınlanmış sergi bulunmamaktadır. Tüm sergilerimiz
                bağımsız tarihî kaynak doğrulama ve küratöryel inceleme süreçlerinden geçtikten sonra
                yayına alınmaktadır.
              </p>
              <div className={styles.emptyStateActions}>
                <Link href="/arsiv" className={styles.emptyStateBtnPrimary}>
                  Dijital Arşivi İncele
                </Link>
                <Link href="/donemler" className={styles.emptyStateBtnSecondary}>
                  Tarihsel Dönemleri Keşfet
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </ContentPage>
  );
}
