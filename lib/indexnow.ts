// IndexNow — notify Bing (and partners) when public URLs change.
// Key file lives at /{key}.txt on the site root (see public/).

const SITE_ORIGIN = "https://whosmarter.com";
const INDEXNOW_KEY = "ee32464a2569426e9e6718542efb1006";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** Stable public pages from the sitemap (not ephemeral /game/ rooms). */
export const PUBLIC_SITE_URLS = [
  `${SITE_ORIGIN}/`,
  `${SITE_ORIGIN}/support`,
  `${SITE_ORIGIN}/privacy`,
  `${SITE_ORIGIN}/terms`,
  `${SITE_ORIGIN}/refund-policy`,
] as const;

/**
 * Fire-and-forget IndexNow submission. Never throws to callers.
 * Safe to call with `void notifyIndexNow([...])`.
 */
export async function notifyIndexNow(urls: string[]): Promise<void> {
  const urlList = [...new Set(urls.filter((u) => u.startsWith(SITE_ORIGIN)))];
  if (urlList.length === 0) return;

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: "whosmarter.com",
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[indexnow] ${res.status} ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn("[indexnow] submit failed:", err);
  }
}

/** Ping the homepage (where open/public games are listed). */
export function notifyPublicGamesListingChanged(): void {
  void notifyIndexNow([`${SITE_ORIGIN}/`]);
}
