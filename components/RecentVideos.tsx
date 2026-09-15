"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { clearRecentVideos, restoreRecentVideos, useRecentVideos, type RecentVideo } from "@/lib/history";
import { useVideoMeta } from "@/lib/use-video-meta";
import { getWatchPath, getYouTubeThumbnailUrl } from "@/lib/youtube";
import { LogoMark } from "./icons";
import { useToast } from "./Toast";

interface Props {
  variant: "home" | "rail";
  currentId?: string;
  limit?: number;
  /** Handle selection in place (e.g. switch the player) instead of a route change. */
  onSelect?: (id: string) => void;
}

export function RecentVideos({ variant, currentId, limit = 8, onSelect }: Props) {
  const items = useRecentVideos();
  const toast = useToast();
  const visible = items.filter((item) => item.id !== currentId).slice(0, limit);

  if (visible.length === 0) return null;

  function handleClear() {
    const previous = clearRecentVideos();
    toast("History cleared", { label: "Undo", onClick: () => restoreRecentVideos(previous) });
  }

  return (
    <section className={variant === "home" ? "recent recent-home" : "recent recent-rail"} aria-labelledby={`recent-heading-${variant}`}>
      <div className="recent-head">
        <h2 id={`recent-heading-${variant}`} className="recent-title">
          Recently watched
        </h2>
        <button type="button" className="text-btn" onClick={handleClear}>
          Clear history
        </button>
      </div>
      <ul className="recent-grid">
        {visible.map((item) => (
          <li key={item.id}>
            <RecentItem item={item} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecentItem({ item, onSelect }: { item: RecentVideo; onSelect?: (id: string) => void }) {
  // Fill in missing titles lazily; results are written back to history.
  const meta = useVideoMeta(item.id, !item.title);
  const title = item.title ?? meta?.title ?? null;
  const channel = item.channel ?? meta?.channel ?? null;
  const [thumbFailed, setThumbFailed] = useState(false);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!onSelect || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onSelect(item.id);
  }

  return (
    <Link href={getWatchPath(item.id)} prefetch={false} className="recent-item" onClick={handleClick}>
      <span className="recent-thumb">
        {thumbFailed ? (
          <span className="recent-thumb-fallback" aria-hidden="true">
            <LogoMark />
          </span>
        ) : (
          <img
            src={getYouTubeThumbnailUrl(item.id, "mq")}
            alt=""
            width={320}
            height={180}
            loading="lazy"
            decoding="async"
            onError={() => setThumbFailed(true)}
          />
        )}
      </span>
      <span className="recent-text">
        <span className="recent-name">{title ?? (meta === undefined ? "Loading title…" : "YouTube video")}</span>
        {channel ? <span className="recent-channel">{channel}</span> : null}
      </span>
    </Link>
  );
}
