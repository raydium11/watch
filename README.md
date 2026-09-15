# Watch

Paste a YouTube link, press **Play Video**, and watch in a clean, distraction-free player.

Built with Next.js (App Router), React, TypeScript and Tailwind CSS. The only runtime dependencies are `next`, `react` and `react-dom`.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm test           # URL parser unit tests (Node's built-in test runner, Node 22+)
npm run typecheck  # TypeScript
npm run build      # production build
npm start          # serve the production build
```

Requires Node.js 20.9 or newer (22+ for `npm test`).

## Deploy to Vercel

The project needs no Vercel-specific configuration.

**Option A: Git import.** Push this folder to a GitHub, GitLab or Bitbucket repository, then choose **Add New → Project** at vercel.com and import it. The defaults are correct.

**Option B: CLI.**

```bash
npx vercel login
npx vercel --prod
```

Environment variables are optional (see below). Add them under **Project → Settings → Environment Variables** and redeploy.

## Environment variables

Copy `.env.example` to `.env.local` for local use. Everything works with none of these set.

| Variable | Purpose |
| --- | --- |
| `YOUTUBE_API_KEY` | Optional YouTube Data API v3 key. When set, titles, channels and embeddable status come from the Data API. Without it, titles and channels come from YouTube's keyless oEmbed endpoint. |
| `NEXT_PUBLIC_SITE_URL` | Optional public URL for canonical links and Open Graph. On Vercel it falls back to the production domain automatically. |

The player never depends on metadata. If both sources fail, videos still play and show "YouTube video" as the title.

## How it works

**Routes**

- `/`: home page with the link box and recently watched videos.
- `/watch/VIDEO_ID`: shareable watch page. Visiting it directly loads the video.
- `/api/video/VIDEO_ID`: returns `{ id, title, channel, status }` as JSON. It fetches metadata only, never media, and is cached at the edge for a day.

**Instant switching.** The watch UI (`components/WatchShell.tsx`) is rendered from `app/watch/layout.tsx`, not the page. Layouts persist between `/watch/A` and `/watch/B`, so the YouTube iframe is created once and later videos load into it with `loadVideoById`. The UI switches optimistically on submit, before the route change finishes.

**Player.** `components/YouTubePlayer.tsx` loads the official YouTube IFrame Player API on demand, using the privacy-enhanced `youtube-nocookie.com` host. Nothing from YouTube loads on the home page. Video and audio are always delivered by YouTube; this server never downloads, proxies or relays them.

**Playback features.**

- YouTube's own controls provide play and pause, seeking, volume, playback speed, captions and fullscreen.
- The iframe is granted `autoplay`, `fullscreen` and `picture-in-picture`. Picture-in-picture is only available when the browser and YouTube's player offer it.
- When the page has focus, these shortcuts work: `K` or `Space` to play or pause, `J` / `L` to jump 10 seconds, `←` / `→` to jump 5 seconds, `M` to mute and `F` for fullscreen.
- `/` focuses the link box anywhere.

**URL parsing.** `lib/youtube.ts` exports:

- `extractYouTubeVideoId(url)`
- `isValidYouTubeVideoId(id)`
- `getYouTubeWatchUrl(id)`
- `getEmbedUrl(id)`
- `getYouTubeThumbnailUrl(id)`
- `getWatchPath(id)`
- `mapPlayerErrorCode(code)`

It accepts these formats:

- `youtube.com/watch?v=` (including `m.` and `music.`)
- `youtu.be/`
- `/shorts/`
- `/embed/` (including `youtube-nocookie.com`)
- `/live/`
- links pasted without `https://`
- bare 11-character IDs

Extra query parameters are ignored. Every other URL scheme is rejected, including `javascript:` and `data:`.

**Recently watched.** Up to 12 videos are stored in `localStorage` under `watch.recent.v1`. Stored data is validated on every read, so corrupted entries are dropped. History stays in sync across tabs. Clearing it can be undone from the toast.

## Security

- Iframe, thumbnail and outbound URLs are built only from IDs matching `^[A-Za-z0-9_-]{11}$`. User input is never used as a URL.
- Titles and channel names are rendered as text, so React escapes them.
- `next.config.ts` sets these headers:
  - a Content-Security-Policy that allows frames only from YouTube's embed hosts and scripts only from this site and YouTube's API
  - `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS and COOP

  The referrer policy is `strict-origin-when-cross-origin` because YouTube embeds require a referrer.
- The metadata route validates the ID before making any outbound request, with a 4-second timeout.

## Error states

| Situation | What the user sees |
| --- | --- |
| Invalid or empty link | Inline message under the field; no navigation |
| Malformed `/watch/…` ID | "This link doesn't point to a video" with a way back |
| Removed, private or region-blocked video (error 100) | "This video isn't available" |
| Embedding disabled (errors 101 / 150) | "This video can only be watched on YouTube" with a link |
| Playback error (5) or unknown error | Retry, plus a link to YouTube |
| YouTube script blocked or unreachable | "Couldn't reach YouTube" with retry; retries automatically when back online |
| Offline | "You're offline" |
| Slow start (over 10 seconds) | Notice with a retry button over the poster image |

## Project structure

```
app/
  layout.tsx               fonts, metadata, viewport, toast provider
  page.tsx                 home
  watch/layout.tsx         persistent watch shell
  watch/page.tsx           /watch redirects home
  watch/[id]/page.tsx      per-video metadata (Open Graph, title)
  api/video/[id]/route.ts  metadata JSON
  not-found.tsx, error.tsx
  globals.css              design tokens and component styles
  icon.svg, opengraph-image.png
components/
  HomeView, WatchShell, Header, VideoUrlInput, YouTubePlayer,
  LoadingPlayer, ErrorMessage, RecentVideos, ShortcutsDialog, Toast, icons
lib/
  youtube.ts               parser and URL builders
  video-metadata.ts        server: oEmbed or Data API lookup
  history.ts               localStorage history hook
  use-video-meta.ts        client metadata hook
  iframe-api.ts            IFrame API loader
  dom.ts                   keyboard and clipboard helpers
types/youtube-iframe-api.d.ts
tests/youtube.test.ts
```

## Design

The site uses black and charcoal surfaces with one warm accent (`#f4c27a`). The typeface is Bricolage Grotesque, self-hosted through `next/font`.

- **Home:** the oversized "Watch" wordmark sits under a soft wash of light from above.
- **Watch page:** the current video's thumbnail glows, blurred, behind the player. The player is sized to the largest 16:9 frame that fits the viewport. On phones it runs edge to edge.
- **Motion:** one entrance sequence on the home page, plus feedback animations for the player fade-in, toasts and dialogs. All motion respects `prefers-reduced-motion`.
