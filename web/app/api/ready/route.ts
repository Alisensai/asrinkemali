import { NextResponse } from "next/server";
import { readinessChecks } from "@/lib/server/readiness";

// Hazırlık denetimi: yalnız denetim adları ve sonuçları döner; hata ayrıntısı sunucu günlüğündedir.
export const dynamic = "force-dynamic";

export function GET() {
  const checks = readinessChecks();
  const ready = checks.every((check) => check.ok);
  return NextResponse.json({ status: ready ? "ready" : "not_ready", checks: Object.fromEntries(checks.map((check) => [check.name, check.ok])) }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store, max-age=0" } });
}
