import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "Asrın Kemali bağımsız dijital tarih projesinin kapsamı ve yayın ilkeleri.",
  alternates: { canonical: "/hakkimizda" },
};

export default function AboutPage() {
  return (
    <ContentPage eyebrow="BAĞIMSIZ DİJİTAL PROJE" title="HAKKIMIZDA">
      <div className="prose">
        <h2>Yayın ilkeleri</h2>
        <p>
          Asrın Kemali; Mustafa Kemal Atatürk, Cumhuriyet tarihi ve kültürel hafıza alanında kaynaklı içerik üretmeyi amaçlayan bağımsız bir dijital kültür platformudur. Resmî bir kamu kurumu, kurulmamış dernek veya Atatürk&apos;ün resmî temsilcisi değildir.
        </p>

        <blockquote>
          “Tarihî hakikat, yalnızca doğrulanmış birincil belgeler ve kurum arşivleri üzerinden inşa edilebilir. Belgesi ve kaynağı bulunmayan anlatı, tarih değil ancak temennidir.”
          <footer>— Asrın Kemali Yayın ve Arşiv İlkesi</footer>
        </blockquote>

        <div className="prose-pillars">
          <div className="prose-pillar">
            <h3>Bağımsız Kültür İnisiyatifi</h3>
            <p>
              Hiçbir resmî unvan, kamu kurumu veya enstitü izlenimi oluşturmadan, sivil bir saygı ve şeffaflıkla hareket eder.
            </p>
          </div>
          <div className="prose-pillar">
            <h3>Birincil Kaynak Titizliği</h3>
            <p>
              TBMM, TTK, Devlet Arşivleri ve Atatürk Ansiklopedisi gibi kurumsal arşiv envanterlerine ve açık erişim kayıtlarına dayanır.
            </p>
          </div>
          <div className="prose-pillar">
            <h3>Şeffaf Dijital Temsil</h3>
            <p>
              Yapay zekâ canlandırmaları açıkça &ldquo;temsilî&rdquo; olarak etiketlenir; tarihî belgelerde provenans, lisans ve belge tarihi aranır.
            </p>
          </div>
        </div>

        <h2>Kaynak ve görsel politikası</h2>
        <p>
          Tarihî iddialar kaynak gösterilmeden yayımlanmaz. Yapay zekâ ile üretilen görseller temsili olarak işaretlenir; gerçek arşiv görsellerinde kaynak, lisans ve belge tarihi aranır.
        </p>

        <h2>Dijital Müze ve Arşiv Standartları</h2>
        <p>
          Koleksiyonumuzdaki her kayıt; birincil arşiv kodu, saklama kurumu ve kullanım hakkı sözleşmesiyle kataloglanır. Açık arşiv kapısından geçen tüm veriler, bağımsız tarih araştırmacıları ve kültür mirasçıları için şeffaf bir dijital hafıza sunar.
        </p>
      </div>
    </ContentPage>
  );
}
