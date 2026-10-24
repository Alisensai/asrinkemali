import { NextResponse } from "next/server";
import { researchLabEnabled } from "@/lib/research-evidence/candidates";
import { loadWorkbench, formatCsvCell } from "@/lib/research-evidence/workbench";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
  "pragma": "no-cache",
};

/**
 * Dışa aktarım API'si (yalnız geliştirme ortamı kapısı arkasında).
 * Production'da her durumda 404. Çıktılar gerçek arşive otomatik yazılmaz.
 * CSV hücreleri formül enjeksiyonuna karşı öneklenir.
 */
export async function GET(request: Request) {
  if (!researchLabEnabled()) {
    return NextResponse.json({ error: "not found" }, { status: 404, headers: NO_CACHE_HEADERS });
  }
  const format = new URL(request.url).searchParams.get("format") ?? "";
  const workbench = loadWorkbench();

  switch (format) {
    case "claims-v2":
      return NextResponse.json(
        { schemaVersion: "2.0.0", claims: workbench.claims },
        {
          headers: {
            ...NO_CACHE_HEADERS,
            "content-disposition": 'attachment; filename="claims-v2.json"',
          },
        }
      );
    case "evidence":
      return NextResponse.json(
        { schemaVersion: "1.0.0", evidence: workbench.evidence },
        {
          headers: {
            ...NO_CACHE_HEADERS,
            "content-disposition": 'attachment; filename="evidence.json"',
          },
        }
      );
    case "audits":
      return NextResponse.json(
        { schemaVersion: "1.0.0", audits: workbench.audits },
        {
          headers: {
            ...NO_CACHE_HEADERS,
            "content-disposition": 'attachment; filename="candidate-audits.json"',
          },
        }
      );
    case "evidence-csv": {
      const header = "id,claimId,claimVersion,relation,institution,title,author,verificationLevel,supports,quote";
      const rows = workbench.evidence.map((e) =>
        [
          e.id,
          e.claimId,
          e.claimVersion,
          e.relation,
          e.locator.institution,
          e.locator.title,
          e.locator.author ?? "",
          e.verificationLevel,
          e.supportAssessment.actuallySupports ?? "",
          e.shortQuote ?? "",
        ]
          .map((cell) => formatCsvCell(cell))
          .join(",")
      );
      const csv = [header, ...rows].join("\r\n");
      return new NextResponse(csv, {
        headers: {
          ...NO_CACHE_HEADERS,
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="evidence.csv"',
        },
      });
    }
    default:
      return NextResponse.json({ error: "unknown format" }, { status: 400, headers: NO_CACHE_HEADERS });
  }
}

export async function HEAD() {
  if (!researchLabEnabled()) {
    return new NextResponse(null, { status: 404, headers: NO_CACHE_HEADERS });
  }
  return new NextResponse(null, { status: 200, headers: NO_CACHE_HEADERS });
}
