"use client";

import styles from "./comparison.module.css";

interface Props {
  disabled: boolean;
}

export function PrintComparison({ disabled }: Props) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <button
      type="button"
      className={styles.actionBtn}
      onClick={handlePrint}
      disabled={disabled}
      aria-label="Karşılaştırma tablosunu yazdır"
    >
      <span>🖨️</span>
      <span>Yazdır / PDF</span>
    </button>
  );
}
