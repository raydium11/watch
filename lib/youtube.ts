/**
 * YouTube helpers.
 *
 * Every URL this app hands to YouTube (iframe, thumbnail, outbound link) is
 * constructed from a video ID that has passed `isValidYouTubeVideoId`. User
 * input is never used as a URL directly.
 */

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const LONG_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);

/** Path prefixes of the form /<prefix>/<VIDEO_ID>. */
const ID_PATH_PREFIXES = new Set(["shorts", "embed", "live", "v", "e"]);

const MAX_INPUT_LENGTH = 2048;

export type ThumbnailQuality = "default" | "mq" | "hq" | "sd" | "maxres";

export function isValidYouTubeVideoId(id: unknown): id is string {
  return typeof id === "string" && VIDEO_ID_PATTERN.test(id);
}

function assertValidId(id: string): void {
  if (!isValidYouTubeVideoId(id)) {
    throw new Error("Invalid YouTube video ID");
  }
}

/**
 * Extracts a YouTube video ID from a pasted link. Returns `null` for anything
 * that is not a recognisable YouTube video URL.
 *
 * Accepts:
 *   https://www.youtube.com/watch?v=ID   (plus m., music., extra query params)
 *   https://youtu.be/ID
 *   https://youtube.com/shorts/ID
 *   https://www.youtube.com/embed/ID     (and youtube-nocookie.com)
 *   https://www.youtube.com/live/ID
 *   Links pasted without a scheme, e.g. youtu.be/ID
 *   A bare 11-character video ID
 */
export function extractYouTubeVideoId(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const raw = input.trim();
  if (!raw || raw.length > MAX_INPUT_LENGTH) return null;

  if (isValidYouTubeVideoId(raw)) return raw;

  // Whitespace inside a URL means it is not a single link.
  if (/\s/.test(raw)) return null;

  let candidate: string;
  if (/^https?:\/\//i.test(raw)) {
    candidate = raw;
  } else if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(raw)) {
    // Any other scheme (javascript:, data:, file:, vbscript: ...) is rejected.
    // "host:port" forms such as youtube.com:443 are allowed through.
    return null;
  } else {
    candidate = `https://${raw.replace(/^\/\//, "")}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  let id: string | null = null;

  if (SHORT_HOSTS.has(host)) {
    id = segments[0] ?? null;
  } else if (LONG_HOSTS.has(host)) {
    const [first, second] = segments;
    if (first === "watch" && segments.length === 1) {
      id = url.searchParams.get("v");
    } else if (first && second && ID_PATH_PREFIXES.has(first)) {
      id = second;
    } else if (segments.length === 0) {
      id = url.searchParams.get("v");
    }
  }

  return isValidYouTubeVideoId(id) ? id : null;
}

/** Canonical link to the video on youtube.com. */
export function getYouTubeWatchUrl(id: string): string {
  assertValidId(id);
  return `https://www.youtube.com/watch?v=${id}`;
}

/** Privacy-enhanced embed URL (youtube-nocookie.com). */
export function getEmbedUrl(
  id: string,
  options: { autoplay?: boolean; origin?: string } = {},
): string {
  assertValidId(id);
  const params = new URLSearchParams({
    playsinline: "1",
    rel: "0",
    enablejsapi: "1",
  });
  if (options.autoplay) params.set("autoplay", "1");
  if (options.origin && /^https?:\/\/[^/\s]+$/i.test(options.origin)) {
    params.set("origin", options.origin);
  }
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

/** Thumbnail served from YouTube's image CDN. No API key needed. */
export function getYouTubeThumbnailUrl(
  id: string,
  quality: ThumbnailQuality = "mq",
): string {
  assertValidId(id);
  const file = quality === "default" ? "default" : `${quality}default`;
  return `https://i.ytimg.com/vi/${id}/${file}.jpg`;
}

/** Path of the in-app watch page. */
export function getWatchPath(id: string): string {
  assertValidId(id);
  return `/watch/${id}`;
}

export type PlayerErrorKind =
  | "invalid"
  | "playback"
  | "unavailable"
  | "embedding"
  | "network"
  | "offline"
  | "unknown";

/** Maps YouTube IFrame API error codes to user-facing categories. */
export function mapPlayerErrorCode(code: number): PlayerErrorKind {
  switch (code) {
    case 2:
      return "invalid";
    case 5:
      return "playback";
    case 100:
      return "unavailable";
    case 101:
    case 150:
      return "embedding";
    default:
      return "unknown";
  }
}
