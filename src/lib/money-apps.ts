// Android supplies the installed apps. These identities preserve existing account/SMS keys;
// they are recognition hints, never the list shown during setup.
import { INSTITUTIONS, institutionForName, institutionForAccount } from "./institutions.ts";
export type InstalledApp = { pkg: string; label: string };
export type MoneyApp = { key: string; app: string; base: string; kind: "bank" | "wallet"; packages: string[] };

// Recognize new banks without having to ship their package names in the manifest.
const BANK = /bank(?:ing)?|mbank|बैंक|बैंकिङ/i;
const NEPAL_BANK = /\b(?:prabhu|kumari|siddhartha|sanima|machhapuchchhre|laxmi|sunrise|himalayan|nmb|nimb|nibl|nbl|adbl|rbb|sbi|sangrila|muktinath|garima|jyoti|mahalaxmi|kamana\s*sewa|shine\s*resunga)\b/i;
const WALLET = /\b(?:wallet|mobile\s*money|fonepay|connect\s*ips|moruu?|namaste\s*pay|prabhu\s*pay|cell\s*pay|qr\s*pay|paypal|venmo|cash\s*app|google\s*pay|samsung\s*pay)\b|वालेट/i;
const PACKAGE_WALLET = /(?:^|\.)(?:wallet|fonepay|connectips|moru|namastepay|prabhupay|cellpay|paypal|venmo)(?:\.|$)/i;

export function detectMoneyApps(installed: InstalledApp[]): MoneyApp[] {
  const found = new Map<string, MoneyApp>();
  const seen = new Set<string>();
  for (const { pkg, label } of installed) {
    if (!pkg || seen.has(pkg)) continue;
    seen.add(pkg);
    const app = label.trim() || pkg;
    const identity = INSTITUTIONS.find(d => d.packages?.includes(pkg)) || institutionForName(app);
    const wallet = WALLET.test(app) || PACKAGE_WALLET.test(pkg);
    if (!identity && !wallet && !BANK.test(app + " " + pkg) && !NEPAL_BANK.test(app)) continue;
    const key = identity?.key || "app:" + pkg;
    const existing = found.get(key);
    if (existing) existing.packages.push(pkg);
    else found.set(key, {
      key, app, base: identity?.name || app,
      kind: identity?.kind || (wallet ? "wallet" : "bank"), packages: [pkg],
    });
  }
  return [...found.values()].sort((a, b) => a.app.localeCompare(b.app));
}

type Account = { key: string; base?: string; name?: string; type?: string; packages?: string[] };
const accountName = (name: string) => name.toLowerCase().replace(/\b(?:bank|limited|ltd)\b|[^\p{L}\p{N}]/gu, "");

// Also recognize accounts added by hand, which have generated keys rather than app keys.
export function sourceForMoneyApp<T extends Account>(app: MoneyApp, sources: T[]): T | undefined {
  const identity = INSTITUTIONS.find((d) => d.key === app.key);
  return sources.find((s) => !/manual/i.test(s.type || "") && (s.key === app.key || app.packages.some((pkg) => s.key === "app:" + pkg || s.packages?.includes(pkg))))
    || sources.find((s) => {
      const name = s.base || s.name || "";
      return !!name && !/manual/i.test(s.type || "") && (accountName(name) === accountName(app.base) || institutionForAccount(s)?.key === identity?.key && !!identity);
    });
}

// Persist actual packages from discovery, including label-only institutions and
// accounts added by hand. A later failed scan must not disable their capture.
export function rememberMoneyPackages<T extends Account>(sources: T[], apps: MoneyApp[]): T[] {
  let changed = false;
  const remembered = sources.map(source => {
    const packages = [...new Set([...(source.packages || []), ...apps
      .filter(app => sourceForMoneyApp(app, [source]))
      .flatMap(app => app.packages)])];
    if (packages.length === (source.packages?.length || 0)) return source;
    changed = true;
    return { ...source, packages };
  });
  return changed ? remembered : sources;
}

// Adding scan results never replaces an existing account or its balance/role.
export function appendMoneyAccounts<T extends Account>(sources: T[], additions: T[], roles: Record<string, string>) {
  const keys = new Set(sources.map((s) => s.key));
  const added = additions.filter((s) => {
    if (keys.has(s.key)) return false;
    keys.add(s.key);
    return true;
  });
  return {
    sources: sources.concat(added),
    roles: { ...roles, ...Object.fromEntries(added.map((s) => [s.key, "spending"])) },
    added,
  };
}

// Saved package metadata and legacy app: keys keep capture available after restart.
export function capturePackages(sources: Account[], discovered: MoneyApp[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  INSTITUTIONS.forEach((d) => {
    const source = sourceForMoneyApp({ key: d.key, kind: d.kind, base: d.name, app: d.name, packages: d.packages || [] }, sources);
    if (source) d.packages?.forEach(pkg => { out[pkg] = source.key; });
  });
  for (const source of sources) {
    if (/manual/i.test(source.type || "")) continue;
    if (source.key.startsWith("app:")) out[source.key.slice(4)] = source.key;
    source.packages?.forEach(pkg => { out[pkg] = source.key; });
  }
  discovered.forEach((d) => {
    const source = sourceForMoneyApp(d, sources);
    if (source) d.packages.forEach((pkg) => { out[pkg] = source.key; });
  });
  return out;
}

export function allMoneyPackages(sources: Account[], discovered: MoneyApp[]): Record<string, string> {
  const out = capturePackages(sources, discovered);
  discovered.forEach((app) => app.packages.forEach((pkg) => { out[pkg] ||= app.key; }));
  return out;
}

// Reading history is optional; its failure must not discard a successful app scan.
export async function scanMoneyApps(
  listApps: () => Promise<InstalledApp[]>,
  history: () => Promise<{ sender: string; body: string; at: number }[]>,
) {
  const [apps, messages] = await Promise.all([listApps(), history().catch(() => [])]);
  return { apps: detectMoneyApps(apps), messages };
}
