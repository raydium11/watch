"use client";

const API_SRC = "https://www.youtube.com/iframe_api";
const TIMEOUT_MS = 15000;

let pending: Promise<YTNamespace> | null = null;

/** Loads the official YouTube IFrame Player API once, on demand. */
export function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The YouTube player can only load in the browser"));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (pending) return pending;

  pending = new Promise<YTNamespace>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = (message: string) => {
      window.clearTimeout(timer);
      script.remove();
      pending = null;
      reject(new Error(message));
    };
    const timer = window.setTimeout(() => fail("Timed out loading the YouTube player"), TIMEOUT_MS);

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timer);
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else fail("The YouTube player failed to initialise");
    };

    script.src = API_SRC;
    script.async = true;
    script.onerror = () => fail("Could not load the YouTube player");
    document.head.appendChild(script);
  });

  return pending;
}
