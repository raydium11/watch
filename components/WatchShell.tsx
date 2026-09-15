"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { copyText } from "@/lib/dom";
import { addRecentVideo, useRecentVideos } from "@/lib/history";
import { useVideoMeta } from "@/lib/use-video-meta";
import { getWatchPath, getYouTubeThumbnailUrl, getYouTubeWatchUrl, isValidYouTubeVideoId } from "@/lib/youtube";
import { ErrorMessage } from "./ErrorMessage";
import { Header } from "./Header";
import { CopyIcon, ExternalIcon, KeyboardIcon } from "./icons";
import { RecentVideos } from "./RecentVideos";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { useToast } from "./Toast";
import { YouTubePlayer } from "./YouTubePlayer";

/**
 * Persistent watch experience. Lives in the /watch layout so the player
 * survives navigation between videos and switches in place.
 */
export function WatchShell() {
  const params = useParams<{ id: string }>();
  const routeId = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
  const toast = useToast();
  const shortcutsRef = useRef<HTMLDialogElement>(null);

  // Switch the player immediately on submit, before the route change settles.
  const [pendingId, setPendingId] = useState<string | null>(null);
  useEffect(() => setPendingId(null), [routeId]);
  const videoId = pendingId ?? routeId;
  const valid = isValidYouTubeVideoId(videoId);

  const history = useRecentVideos();
  const known = valid ? history.find((item) => item.id === videoId) : undefined;
  const meta = useVideoMeta(valid ? videoId : null);
  const title = meta?.title ?? known?.title ?? null;
  const channel = meta?.channel ?? known?.channel ?? null;

  useEffect(() => {
    if (valid) addRecentVideo(videoId);
  }, [valid, videoId]);

  function switchTo(id: string) {
    if (id === videoId) return;
    setPendingId(id);
    router.push(getWatchPath(id), { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyLink() {
    const ok = await copyText(`${window.location.origin}${getWatchPath(videoId)}`);
    toast(ok ? "Link copied" : "Couldn't copy the link");
  }

  return (
    <>
      <Header onSubmitId={switchTo} />
      <main id="content" className="watch-main">
        {valid ? (
          <>
            <div className="stage">
              <div
                className="ambient"
                aria-hidden="true"
                style={{ backgroundImage: `url(${getYouTubeThumbnailUrl(videoId, "mq")})` }}
              />
              <YouTubePlayer videoId={videoId} title={title} />
            </div>

            <div className="stage-meta">
              <div className="stage-meta-text">
                {title ? (
                  <h1 className="video-title">{title}</h1>
                ) : meta === undefined ? (
                  <span className="video-title-skeleton" aria-hidden="true" />
                ) : (
                  <h1 className="video-title">YouTube video</h1>
                )}
                {channel ? <p className="video-channel">{channel}</p> : null}
              </div>
              <div className="stage-actions">
                <button type="button" className="btn btn-quiet" onClick={copyLink}>
                  <CopyIcon width={18} height={18} />
                  <span>Copy link</span>
                </button>
                <a className="btn btn-quiet" href={getYouTubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer">
                  <ExternalIcon width={18} height={18} />
                  <span>YouTube</span>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                <button
                  type="button"
                  className="btn btn-quiet shortcuts-btn"
                  onClick={() => shortcutsRef.current?.showModal()}
                  aria-label="Keyboard shortcuts"
                  aria-haspopup="dialog"
                >
                  <KeyboardIcon width={18} height={18} />
                </button>
              </div>
            </div>

            <RecentVideos variant="rail" currentId={videoId} limit={10} onSelect={switchTo} />
            <ShortcutsDialog ref={shortcutsRef} />
          </>
        ) : (
          <div className="stage-invalid">
            <ErrorMessage
              title="This link doesn't point to a video"
              actions={
                <Link href="/" className="btn btn-primary">
                  Paste a new link
                </Link>
              }
            >
              The video ID in this address isn&apos;t valid. Paste a YouTube link above, or start again.
            </ErrorMessage>
          </div>
        )}
      </main>
    </>
  );
}
