"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { hasModifier, isInteractiveTarget } from "@/lib/dom";
import { getWatchPath } from "@/lib/youtube";
import { RecentVideos } from "./RecentVideos";
import { VideoUrlInput } from "./VideoUrlInput";

export function HomeView() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || hasModifier(event) || isInteractiveTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function play(id: string) {
    startTransition(() => router.push(getWatchPath(id)));
  }

  return (
    <main id="content" className="home">
      <div className="home-light" aria-hidden="true" />
      <section className="home-hero">
        <h1 className="wordmark">Watch</h1>
        <p className="home-subtitle">Paste a YouTube link to start watching.</p>
        <div className="home-form">
          <VideoUrlInput variant="hero" onSubmitId={play} pending={pending} autoFocus inputRef={inputRef} />
          <p className="home-hint">
            Press <kbd>/</kbd> to focus the link box
          </p>
        </div>
      </section>
      <RecentVideos variant="home" limit={8} />
    </main>
  );
}
