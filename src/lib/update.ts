// Thaili ships as an APK on GitHub Releases (tag vX.Y, asset thaili.apk). The app asks GitHub for
// the latest release and offers its APK when that is newer than the installed versionName.
export type AppUpdate = { version: string; url: string };

const LATEST = "https://api.github.com/repos/georgeMaharjan/Thaili/releases/latest";
const DOWNLOADS = "https://github.com/georgeMaharjan/Thaili/releases/download/";

/** "1.10" > "1.9"; a leading "v" and missing parts ("1.1" vs "1.1.0") are ignored. */
export function isNewer(latest: string, current: string) {
  const parts = (v: string) => v.replace(/^v/i, "").split(".").map(n => parseInt(n, 10) || 0);
  const a = parts(latest), b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  return false;
}

/** The newer release, or null when up to date. Only this repo's own thaili.apk is ever offered. */
export function updateFrom(release: unknown, current: string): AppUpdate | null {
  const r = release as { tag_name?: unknown; assets?: { name?: unknown; browser_download_url?: unknown }[] } | null;
  if (!r || typeof r.tag_name !== "string" || !Array.isArray(r.assets)) return null;
  const apk = r.assets.find(a => a?.name === "thaili.apk");
  const url = apk?.browser_download_url;
  if (typeof url !== "string" || !url.startsWith(DOWNLOADS)) return null;
  return isNewer(r.tag_name, current) ? { version: r.tag_name.replace(/^v/i, ""), url } : null;
}

export async function checkForUpdate(current: string, get: typeof fetch = fetch): Promise<AppUpdate | null> {
  const res = await get(LATEST, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error("Update check failed: " + res.status);
  return updateFrom(await res.json(), current);
}
