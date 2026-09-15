"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadYouTubeIframeApi } from "@/lib/iframe-api";
import { hasModifier, isInteractiveTarget, isModalOpen } from "@/lib/dom";
import { getYouTubeWatchUrl, mapPlayerErrorCode, type PlayerErrorKind } from "@/lib/youtube";
import { ErrorMessage } from "./ErrorMessage";
import { ExternalIcon, RetryIcon } from "./icons";
import { LoadingPlayer } from "./LoadingPlayer";

type Phase = { name: "loading" } | { name: "slow" } | { name: "ready" } | { name: "error"; kind: PlayerErrorKind };

const PLAYING = 1;
const BUFFERING = 3;
const CUED = 5;
const SLOW_AFTER_MS = 10000;

const ERROR_COPY: Record<PlayerErrorKind, { title: string; body: string; retry: boolean }> = {
  invalid: { title: "This video link isn't valid", body: "Check the link and try again.", retry: false },
  playback: { title: "This video couldn't be played", body: "Try again, or watch it on YouTube.", retry: true },
  unavailable: {
    title: "This video isn't available",
    body: "It may have been removed, made private, or restricted in your region.",
    retry: false,
  },
  embedding: {
    title: "This video can only be watched on YouTube",
    body: "Its owner doesn't allow it to play on other websites.",
    retry: false,
  },
  network: { title: "Couldn't reach YouTube", body: "Check your internet connection, then try again.", retry: true },
  offline: { title: "You're offline", body: "Reconnect to the internet to keep watching.", retry: true },
  unknown: { title: "This video stopped before it could play", body: "Try again, or watch it on YouTube.", retry: true },
};

interface Props {
  videoId: string;
  title?: string | null;
}

export function YouTubePlayer({ videoId, title }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const videoIdRef = useRef(videoId);
  const titleRef = useRef(title);
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [hasShown, setHasShown] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const phaseRef = useRef(phase);
  titleRef.current = title;
  phaseRef.current = phase;

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // Create the player (and recreate it on retry).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    readyRef.current = false;
    setHasShown(false);

    if (navigator.onLine === false) {
      setPhase({ name: "error", kind: "offline" });
      return;
    }
    setPhase({ name: "loading" });

    // The API replaces this element with its iframe, so React never owns it.
    const mount = document.createElement("div");
    host.appendChild(mount);
    const initialId = videoIdRef.current;

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled) return;
        playerRef.current = new YT.Player(mount, {
          host: "https://www.youtube-nocookie.com",
          videoId: initialId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            rel: 0,
            fs: 1,
            iv_load_policy: 3,
            enablejsapi: 1,
            origin: window.location.origin,
            widget_referrer: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              readyRef.current = true;
              const iframe = event.target.getIframe();
              iframe.title = titleRef.current ? `YouTube video: ${titleRef.current}` : "YouTube video player";
              setHasShown(true);
              setPhase((current) => (current.name === "error" ? current : { name: "ready" }));
              if (videoIdRef.current !== initialId) event.target.loadVideoById(videoIdRef.current);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if (event.data === PLAYING || event.data === BUFFERING || event.data === CUED) {
                setPhase((current) => (current.name === "ready" ? current : { name: "ready" }));
              }
            },
            onError: (event) => {
              if (cancelled) return;
              setHasShown(true);
              setPhase({ name: "error", kind: mapPlayerErrorCode(event.data) });
            },
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setPhase({ name: "error", kind: navigator.onLine === false ? "offline" : "network" });
      });

    return () => {
      cancelled = true;
      readyRef.current = false;
      try {
        playerRef.current?.destroy();
      } catch {
        // The iframe may already be gone.
      }
      playerRef.current = null;
      host.replaceChildren();
    };
  }, [attempt]);

  // Switch videos in place, without rebuilding the iframe.
  useEffect(() => {
    if (videoIdRef.current === videoId) return;
    videoIdRef.current = videoId;
    const player = playerRef.current;
    if (player && readyRef.current) {
      setPhase({ name: "ready" });
      player.loadVideoById(videoId);
    } else if (phaseRef.current.name === "error") {
      setAttempt((n) => n + 1);
    }
  }, [videoId]);

  // Keep the iframe's accessible name in sync with the loaded title.
  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    try {
      playerRef.current.getIframe().title = title ? `YouTube video: ${title}` : "YouTube video player";
    } catch {
      // ignore
    }
  }, [title]);

  // Flag a slow start.
  useEffect(() => {
    if (phase.name !== "loading" || hasShown) return;
    const timer = window.setTimeout(() => setPhase({ name: "slow" }), SLOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [phase.name, hasShown]);

  // Retry automatically when the connection comes back.
  useEffect(() => {
    const onOnline = () => {
      const current = phaseRef.current;
      if (current.name === "error" && (current.kind === "offline" || current.kind === "network")) retry();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [retry]);

  // Keyboard shortcuts when focus is on the page (the iframe handles its own when focused).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const player = playerRef.current;
      if (!player || !readyRef.current || event.defaultPrevented || hasModifier(event)) return;
      if (isInteractiveTarget(event.target) || isModalOpen()) return;

      try {
        switch (event.key) {
          case "k":
          case "K":
          case " ":
            event.preventDefault();
            if (player.getPlayerState() === PLAYING) player.pauseVideo();
            else player.playVideo();
            break;
          case "m":
          case "M":
            event.preventDefault();
            if (player.isMuted()) player.unMute();
            else player.mute();
            break;
          case "ArrowLeft":
          case "j":
          case "J": {
            event.preventDefault();
            const step = event.key === "ArrowLeft" ? 5 : 10;
            player.seekTo(Math.max(0, player.getCurrentTime() - step), true);
            break;
          }
          case "ArrowRight":
          case "l":
          case "L": {
            event.preventDefault();
            const step = event.key === "ArrowRight" ? 5 : 10;
            player.seekTo(player.getCurrentTime() + step, true);
            break;
          }
          case "f":
          case "F": {
            const frame = frameRef.current;
            if (!frame || !document.fullscreenEnabled) break;
            event.preventDefault();
            if (document.fullscreenElement) void document.exitFullscreen();
            else void frame.requestFullscreen().catch(() => {});
            break;
          }
        }
      } catch {
        // The player can briefly reject calls while switching videos.
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const error = phase.name === "error" ? ERROR_COPY[phase.kind] : null;
  const showLoading = !hasShown && (phase.name === "loading" || phase.name === "slow");

  return (
    <div ref={frameRef} className="player-box" data-phase={phase.name}>
      <div ref={hostRef} className="player-host" data-visible={hasShown && !error ? "" : undefined} />

      {showLoading ? <LoadingPlayer videoId={videoId} slow={phase.name === "slow"} onRetry={retry} /> : null}

      {error ? (
        <div className="player-overlay">
          <ErrorMessage
            title={error.title}
            actions={
              <>
                {error.retry ? (
                  <button type="button" className="btn btn-quiet" onClick={retry}>
                    <RetryIcon width={18} height={18} />
                    Try again
                  </button>
                ) : null}
                {phase.name === "error" && phase.kind !== "invalid" && phase.kind !== "offline" ? (
                  <a className="btn btn-quiet" href={getYouTubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer">
                    <ExternalIcon width={18} height={18} />
                    Watch on YouTube
                  </a>
                ) : null}
              </>
            }
          >
            {error.body}
          </ErrorMessage>
        </div>
      ) : null}
    </div>
  );
}
