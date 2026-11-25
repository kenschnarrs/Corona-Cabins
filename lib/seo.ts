export const SITE_URL = "https://cabanascorona.vercel.app";

/**
 * Social preview images should be about 1200x630. Unsplash URLs resize on the
 * fly; other hosts (Vercel Blob uploads) are used as-is. Relative paths are
 * made absolute because crawlers need full URLs.
 */
export function ogImageUrl(url: string): string {
  if (url.startsWith("/")) return `${SITE_URL}${url}`;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "images.unsplash.com") {
      parsed.searchParams.set("w", "1200");
      parsed.searchParams.set("h", "630");
      parsed.searchParams.set("fit", "crop");
      parsed.searchParams.set("q", "80");
      return parsed.toString();
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
