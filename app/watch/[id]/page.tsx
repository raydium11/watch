import type { Metadata } from "next";
import { fetchVideoMetadata } from "@/lib/video-metadata";
import { getYouTubeThumbnailUrl, isValidYouTubeVideoId } from "@/lib/youtube";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  if (!isValidYouTubeVideoId(id)) {
    return { title: "Video not found", robots: { index: false, follow: false } };
  }

  const meta = await fetchVideoMetadata(id);
  const title = meta.title ?? "Now playing";
  const description = meta.title
    ? `Watch “${meta.title}”${meta.channel ? ` from ${meta.channel}` : ""} in a distraction-free player.`
    : "Watch this YouTube video in a distraction-free player.";
  const image = getYouTubeThumbnailUrl(id, "hq");

  return {
    title,
    description,
    alternates: { canonical: `/watch/${id}` },
    openGraph: {
      type: "video.other",
      title,
      description,
      url: `/watch/${id}`,
      images: [{ url: image, width: 480, height: 360 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/** Rendering happens in the persistent layout shell (components/WatchShell). */
export default function WatchPage() {
  return null;
}
