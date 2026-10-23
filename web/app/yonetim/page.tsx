import { AdminControlCenter } from "@/components/AdminControlCenter";
import { AdminSectionGate } from "@/components/admin-v08/AdminShell";
import { getAllArchiveRecords } from "@/lib/archive";
import { getCurrentAdminSession } from "@/lib/admin-v08/auth";

export default async function AdminPage() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  return (
    <AdminSectionGate section="overview" session={session}>
      <AdminControlCenter session={session} records={getAllArchiveRecords()} />
    </AdminSectionGate>
  );
}
