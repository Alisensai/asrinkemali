import { ReadingListsClient } from "@/components/reading-lists/ReadingListsClient";
import { getPublishedArchiveRecords } from "@/lib/archive";
export const metadata = { title: "Okuma Listem", robots: { index: false, follow: false } };
export default function ReadingListsPage() { const records = getPublishedArchiveRecords().map((record) => ({ recordId: record.id, slug: record.slug, title: record.title, dateDisplay: record.date.display, sourceInstitution: record.source.institution, type: record.type })); return <ReadingListsClient records={records} />; }
