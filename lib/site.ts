function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const SITE = {
  name: "Watch",
  description: "Paste a YouTube link and watch it in a clean, distraction-free player.",
  url: resolveSiteUrl(),
} as const;
