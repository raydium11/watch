import { getYouTubeWatchUrl, isValidYouTubeVideoId } from "./youtube";

export type VideoStatus = "ok" | "unavailable" | "restricted" | "unknown";

export interface VideoMetadata {
  id: string;
  title: string | null;
  channel: string | null;
  status: VideoStatus;
}

const TIMEOUT_MS = 4000;
const REVALIDATE_SECONDS = 60 * 60 * 24;

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return text ? text.slice(0, 300) : null;
}

/**
 * Server-only. Looks up a video's title and channel.
 *
 * With YOUTUBE_API_KEY set, uses the YouTube Data API v3. Without it, uses
 * YouTube's public oEmbed endpoint, which needs no key. Only small JSON
 * metadata is requested; video and audio are never fetched or relayed.
 * Never throws: failures resolve to status "unknown".
 */
export async function fetchVideoMetadata(id: string): Promise<VideoMetadata> {
  const empty: VideoMetadata = { id, title: null, channel: null, status: "unknown" };
  if (!isValidYouTubeVideoId(id)) return { ...empty, status: "unavailable" };

  const apiKey = process.env.YOUTUBE_API_KEY?.trim();

  try {
    return apiKey ? await fromDataApi(id, apiKey) : await fromOEmbed(id);
  } catch {
    return empty;
  }
}

async function fromOEmbed(id: string): Promise<VideoMetadata> {
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("url", getYouTubeWatchUrl(id));

  const res = await fetch(endpoint, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (res.status === 401 || res.status === 403) {
    return { id, title: null, channel: null, status: "restricted" };
  }
  if (res.status === 400 || res.status === 404) {
    return { id, title: null, channel: null, status: "unavailable" };
  }
  if (!res.ok) return { id, title: null, channel: null, status: "unknown" };

  const data: unknown = await res.json();
  const record = (data ?? {}) as Record<string, unknown>;
  return {
    id,
    title: cleanText(record.title),
    channel: cleanText(record.author_name),
    status: "ok",
  };
}

async function fromDataApi(id: string, apiKey: string): Promise<VideoMetadata> {
  const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
  endpoint.searchParams.set("part", "snippet,status");
  endpoint.searchParams.set("id", id);
  endpoint.searchParams.set("key", apiKey);

  const res = await fetch(endpoint, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) return fromOEmbed(id);

  const data = (await res.json()) as {
    items?: Array<{
      snippet?: { title?: unknown; channelTitle?: unknown };
      status?: { embeddable?: unknown; privacyStatus?: unknown };
    }>;
  };
  const item = data.items?.[0];
  if (!item) return { id, title: null, channel: null, status: "unavailable" };

  const restricted =
    item.status?.embeddable === false || item.status?.privacyStatus === "private";

  return {
    id,
    title: cleanText(item.snippet?.title),
    channel: cleanText(item.snippet?.channelTitle),
    status: restricted ? "restricted" : "ok",
  };
}
