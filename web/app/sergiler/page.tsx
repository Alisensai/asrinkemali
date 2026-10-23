import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { getExhibitions, getExhibitionThemes } from "@/lib/exhibitions/repository";
import { ExhibitionsDirectoryClient } from "@/components/exhibitions/ExhibitionsDirectoryClient";
import styles from "@/components/exhibitions/exhibitions.module.css";

export const metadata: Metadata = {
  title: "Dijital Sergiler | Küratöryel Müze Deneyimi",
  description:
    "Mustafa Kemal Atatürk ve Cumhuriyet devrimlerinin tarihsel belgelerle anlatıldığı, 3D sanal salon ve belge odaklı dijital sergiler.",
  alternates: { canonical: "/sergiler" },
};

export default function ExhibitionsPage() {
  const exhibitions = getExhibitions({ includeStaging: true });
  const themes = getExhibitionThemes();

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

        <ExhibitionsDirectoryClient
          initialExhibitions={exhibitions}
          themes={themes}
        />
      </div>
    </ContentPage>
  );
}
