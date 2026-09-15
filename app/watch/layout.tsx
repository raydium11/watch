import type { ReactNode } from "react";
import { WatchShell } from "@/components/WatchShell";

/**
 * The shell lives in the layout, not the page, so the YouTube iframe persists
 * when moving between /watch/A and /watch/B and switches videos in place.
 */
export default function WatchLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <WatchShell />
    </>
  );
}
