"use client";

import { useEffect, useState } from "react";
import { updateRecentVideoMeta } from "./history";
import { isValidYouTubeVideoId } from "./youtube";
import type { VideoMetadata } from "./video-metadata";

const cache = new Map<string, Promise<VideoMetadata | null>>();

function load(id: string): Promise<VideoMetadata | null> {
  let pending = cache.get(id);
  if (!pending) {
    pending = fetch(`/api/video/${id}`, { headers: { accept: "application/json" } })
      .then((res) => (res.ok ? (res.json() as Promise<VideoMetadata>) : null))
      .then((data) => {
        if (!data || data.id !== id) return null;
        return {
          id,
          title: typeof data.title === "string" ? data.title : null,
          channel: typeof data.channel === "string" ? data.channel : null,
          status: data.status,
        } satisfies VideoMetadata;
      })
      .catch(() => {
        cache.delete(id); // allow a retry later
        return null;
      });
    cache.set(id, pending);
  }
  return pending;
}

/**
 * Title and channel for a video. `undefined` while loading, `null` when
 * metadata could not be retrieved. The player never depends on this.
 */
export function useVideoMeta(id: string | null, enabled = true): VideoMetadata | null | undefined {
  const [result, setResult] = useState<{ id: string; data: VideoMetadata | null } | null>(null);

  useEffect(() => {
    if (!enabled || !id || !isValidYouTubeVideoId(id)) return;
    let active = true;
    load(id).then((data) => {
      if (!active) return;
      setResult({ id, data });
      if (data?.title) updateRecentVideoMeta(id, { title: data.title, channel: data.channel });
    });
    return () => {
      active = false;
    };
  }, [id, enabled]);

  return result && result.id === id ? result.data : undefined;
}
