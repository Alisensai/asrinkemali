import { AdminModulePage } from "@/components/admin-v08/AdminModulePage";

type SearchParams = Record<string, string | string[] | undefined>;

export default function ArchiveAdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <AdminModulePage section="archive" searchParams={searchParams} />;
}
