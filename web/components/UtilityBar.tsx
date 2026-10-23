type UtilityBarProps = { dateLabel: string; quote: string; onSearch?: () => void };

export function UtilityBar({ dateLabel, quote, onSearch }: UtilityBarProps) {
  return <aside aria-label="Yardımcı gezinme"><time>{dateLabel}</time><q>{quote}</q><button type="button" onClick={onSearch}>Arşivde ara</button></aside>;
}
