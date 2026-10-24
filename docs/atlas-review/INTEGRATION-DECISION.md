# MKA ATLAS 2.0 — ENTEGRASYON KARARI VE HÜKÜM BELGESİ

**DOKÜMAN:** `docs/atlas-review/INTEGRATION-DECISION.md`  
**TARİH:** 24 Ekim 2026  
**AJAN:** ANTIGRAVITY  
**GÖREV KODU:** MKA-ANTIGRAVITY-21  
**HÜKÜM:** **`ACCEPT_NEW` (YENİ SÜRÜM ONAYLANDI)**  

---

## 1. Kesin Karar ve Gerekçe

### Karar: **`ACCEPT_NEW`**
Eski Gemini Atlas paketi (`asrinkemali-v07-history-atlas-paket gemini.zip`) **TAMAMEN REDDEDİLMİŞTİR**.
Yeni MKA Atlas 2.0 paketi (`MKA_ATLAS_V07_KAYNAK_KOD.zip` / `MKA_ATLAS_V07_GITHUB.patch`) **ENTEGRASYON İÇİN KABUL EDİLMİŞTİR**.

### Gerekçeler:
1. **Epistemik Dürüstlük:** Eski paketteki uydurma GPS koordinatları (`lat/lng`) ve sahte `expertVerified: true` rozetleri yeni pakette tamamen kaldırılmış, `coordinate: null` ve "şematik keşif aracı" deklarasyonu getirilmiştir.
2. **Mimari Uyumluluk:** Eski paketteki `/archive` rotası yerine Next.js 15 App Router sözleşmesine uygun `/arsiv/[slug]` kullanılmıştır.
3. **Stil İzolasyonu:** Tailwind utility bağımlılığı kaldırılarak MKA bordo/altın/siyah tasarım sistemine bağlı, 320px responsive kuralları içeren `atlas.module.css` modülüne geçilmiştir.
4. **Sıfır Çakışma:** `MKA_ATLAS_V07_GITHUB.patch` mevcut repo ağacına `git apply --check` ile hatasız ve çakışmasız olarak uygulanabilmektedir (çıkış kodu 0).
5. **Güvenlik:** Harici ücretli SDK (Google Maps, Mapbox) ve canlı OAuth bağımlılığı bulunmamaktadır; CSP sıkılığı korunmuştur.

---

## 2. Güvenli Entegrasyon Protokolü (Task 22 İçin)

1. **Uygulama Yöntemi:**
   - En temiz ve izlenebilir yöntem `MKA_ATLAS_V07_GITHUB.patch` dosyasının `git apply` ile uygulanmasıdır.
   - Alternatif olarak `MKA_ATLAS_V07_KAYNAK_KOD.zip` içindeki `web/` ve `docs/atlas/` dosyaları doğrudan kopyalanabilir.
2. **Çalıştırılacak Doğrulama Adımları:**
   - `node --test web/tests/atlas.test.mjs`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
   - `npx playwright test e2e/atlas.spec.ts` (9 viewportta sıfır taşma doğrulaması)
3. **Kapsam İzolasyonu:**
   - Var olan `web/lib/archive.ts`, `globals.css` veya `Navigation.tsx` dosyalarına dokunulmamalı; değişiklikler `/atlas` kapsamı içinde tutulmalıdır.
