import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = { title: "Hakkımızda", description: "Asrın Kemali bağımsız dijital tarih projesinin kapsamı ve yayın ilkeleri.", alternates: { canonical: "/hakkimizda" } };
export default function AboutPage() { return <ContentPage eyebrow="BAĞIMSIZ DİJİTAL PROJE" title="HAKKIMIZDA"><div className="prose"><h2>Yayın ilkeleri</h2><p>Asrın Kemali; Mustafa Kemal Atatürk, Cumhuriyet tarihi ve kültürel hafıza alanında kaynaklı içerik üretmeyi amaçlar. Bir kamu kurumu, resmî enstitü, dernek veya Atatürk&apos;ün resmî temsilcisi değildir.</p><h2>Kaynak ve görsel politikası</h2><p>Tarihî iddialar kaynak gösterilmeden yayımlanmaz. Yapay zekâ ile üretilen görseller temsili olarak işaretlenir; gerçek arşiv görsellerinde kaynak, lisans ve belge tarihi aranır.</p></div></ContentPage>; }
