import { Icon, type IconName } from "@/components/Icon";
import type { ArchiveRecordType } from "../../../schemas/archive-record.types";
import styles from "./ataturk-experience.module.css";

const ICONS: Record<ArchiveRecordType, IconName> = { photograph: "image", document: "document", speech: "speech", event: "calendar", publication: "book", place: "map" };

/** Belge ve fotoğraf türlerini metin + simgeyle ayırır; renk tek ayırt edici değildir. */
export function TypeBadge({ type, label }: { type: ArchiveRecordType; label: string }) {
  return <span className={styles.typeBadge} data-type={type}><Icon name={ICONS[type]} size={13} /><span>{label}</span></span>;
}
