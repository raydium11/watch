"use client";

import { getYouTubeThumbnailUrl } from "@/lib/youtube";
import { RetryIcon, Spinner } from "./icons";

interface Props {
  videoId: string;
  slow?: boolean;
  onRetry?: () => void;
}

/** Placeholder that fills the 16:9 frame while the YouTube player starts. */
export function LoadingPlayer({ videoId, slow = false, onRetry }: Props) {
  return (
    <div className="player-loading">
      {/* Poster from YouTube's image CDN so the frame never looks empty. */}
      <img
        src={getYouTubeThumbnailUrl(videoId, "hq")}
        alt=""
        className="player-poster"
        decoding="async"
        fetchPriority="high"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
      <div className="player-loading-content">
        <Spinner className="spinner-lg" />
        <p className={slow ? "player-loading-text" : "sr-only"}>
          {slow ? "YouTube is taking longer than usual to respond." : "Loading video"}
        </p>
        {slow && onRetry ? (
          <button type="button" className="btn btn-quiet" onClick={onRetry}>
            <RetryIcon width={18} height={18} />
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}
