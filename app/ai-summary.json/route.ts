import { buildAiSummary } from "@/lib/seo";

export function GET() {
  return Response.json(buildAiSummary(), {
    headers: {
      "Cache-Control": "public, max-age=3600"
    }
  });
}
