/**
 * Returns the URL if it's a known-safe image origin, otherwise null.
 * Defense in depth alongside the CSP img-src directive.
 *
 * Allowed:
 * - Vercel Blob public URLs (https://*.public.blob.vercel-storage.com)
 * - Same-origin paths starting with /cosmetics/ or /uploads/ or /badges/
 */
export function safeImageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;

  // Relative path: allow /cosmetics/, /uploads/, /badges/ only.
  if (trimmed.startsWith("/")) {
    if (
      trimmed.startsWith("/cosmetics/") ||
      trimmed.startsWith("/uploads/") ||
      trimmed.startsWith("/badges/") ||
      trimmed.startsWith("/points-icon.svg")
    ) {
      return trimmed;
    }
    return null;
  }

  // Absolute URL: must be https + known host.
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.hostname.endsWith(".public.blob.vercel-storage.com")) return trimmed;
  return null;
}
