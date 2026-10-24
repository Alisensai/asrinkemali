/**
 * RFC 4180 CSV hücresi + hesap tablosu formül enjeksiyonu koruması.
 *
 * V0.9 güvenlik denetimi: önceki sürüm (PR #24 kökenli) önekli hücreleri (=, +, -, @, sekme,
 * boşluk) tırnaklamadan yazıyordu; hücrede virgül varsa satır fazladan sütuna bölünüyordu
 * (`'=HYPERLINK("x"),y` → 2 alan). Artık önek eklenir ve hücre HER ZAMAN tırnaklanır.
 */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r\n]/.test(text) || /^\s/u.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
