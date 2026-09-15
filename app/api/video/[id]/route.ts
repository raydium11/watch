import { fetchVideoMetadata } from "@/lib/video-metadata";
import { isValidYouTubeVideoId } from "@/lib/youtube";

/**
 * GET /api/video/:id
 * Returns { id, title, channel, status }. Metadata only; never media.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isValidYouTubeVideoId(id)) {
    return Response.json({ error: "invalid_id" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const meta = await fetchVideoMetadata(id);
  const cacheControl =
    meta.status === "ok"
      ? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
      : "public, max-age=60, s-maxage=300";

  return Response.json(meta, { headers: { "Cache-Control": cacheControl } });
}
