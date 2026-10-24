import React from "react";
import Link from "next/link";
import styles from "@/app/publishing.module.css";
import { publicationKindLabel } from "@/lib/publishing/model";
import type { PublicationKind } from "../../../schemas/publication-record.types";

export interface PublicationFiltersProps {
  categories: string[];
  kinds: PublicationKind[];
  selectedCategory?: string;
  selectedKind?: PublicationKind;
}

export function PublicationFilters({
  categories,
  kinds,
  selectedCategory,
  selectedKind,
}: PublicationFiltersProps) {
  return (
    <form action="/yayinlar" method="get" className={styles.filters} aria-label="Yayın filtreleri">
      <label>
        Kategori
        <select name="kategori" defaultValue={selectedCategory ?? ""}>
          <option value="">Tüm kategoriler</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label>
        Yayın türü
        <select name="tur" defaultValue={selectedKind ?? ""}>
          <option value="">Tüm türler</option>
          {kinds.map((item) => (
            <option key={item} value={item}>
              {publicationKindLabel(item)}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.actions}>
        <button type="submit">Filtrele</button>
        <Link href="/yayinlar">Temizle</Link>
      </div>
    </form>
  );
}
