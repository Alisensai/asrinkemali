import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-v08/AdminShell";
import { getCurrentAdminSession } from "@/lib/admin-v08/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Yönetim Merkezi", template: "%s | ASRIN KEMALİ Yönetim" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getCurrentAdminSession();
  if (!session) notFound();
  return <AdminShell session={session}>{children}</AdminShell>;
}
