import { NextResponse } from "next/server";

import { archiveStats } from "@/lib/archive";

export const dynamic = "force-static";

export async function GET() {
  const stats = await archiveStats();

  return NextResponse.json({
    application: "asrin-kemali-web",
    releaseCandidate: "v0.6",
    archive: {
      total: stats.total,
      published: stats.published,
      reviewed: stats.reviewed,
      draft: stats.draft,
    },
    humanExpertReviewComplete: false,
  });
}
