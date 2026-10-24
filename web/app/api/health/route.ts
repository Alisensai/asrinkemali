import { NextResponse } from "next/server";

// Herkese açık canlılık denetimi: yalnız hassas olmayan temel bilgi. Ayrıntılı durum /api/ready'de ad/boolean düzeyindedir.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", service: "asrin-kemali-web" }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
