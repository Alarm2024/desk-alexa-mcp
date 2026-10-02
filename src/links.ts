import { NOT_A_CLEARANCE } from "./scam.js";
import { reportedHostMap, type ReportedHost } from "./reported-hosts.js";

export type LinkVerdict = "scam" | "unclear" | "official" | "no_known_pattern";

export type LinkReason =
  | "reported_host"
  | "lookalike_domain"
  | "punycode_host"
  | "brand_and_lure"
  | "brand_in_host"
  | "lure_words_in_host"
  | "short_link"
  | "official_domain"
  | "no_url"
  | "no_known_pattern";

export interface LinkReport {
  refused: false;
  verdict: LinkVerdict;
  reason: LinkReason;
  host: string | null;
  brand: string | null;
  why: string;
  next_steps: string[];
}

/**
 * Brand → official registrable domains. A host equals the domain or ends with
 * "." + domain. Shared hosting roots are never listed here.
 */
export const OFFICIAL_DOMAINS: Record<string, string[]> = {
  phantom: ["phantom.com", "phantom.app"],
  solflare: ["solflare.com"],
  backpack: ["backpack.app"],
  jupiter: ["jup.ag"],
  raydium: ["raydium.io"],
  orca: ["orca.so"],
  kamino: ["kamino.com"],
  jito: ["jito.network"],
  marinade: ["marinade.finance"],
  drift: ["drift.trade"],
  sanctum: ["sanctum.so"],
  tensor: ["tensor.trade"],
  magiceden: ["magiceden.us"],
  pump: ["pump.fun"],
  save: ["save.finance"],
  solana: ["solana.com"],
  ledger: ["ledger.com"],
  tangem: ["tangem.com"],
  trezor: ["trezor.io"],
  metamask: ["metamask.io"],
};

/** Shared hosting: never official as a whole, never blocked as a whole. */
export const SHARED_HOSTING = new Set([
  "pages.dev",
  "vercel.app",
  "netlify.app",
  "github.io",
  "web.app",
  "firebaseapp.com",
  "workers.dev",
]);

/** Brands checked for misspelling. Length drives the edit budget. */
export const SPELLING_BRANDS = [
  "phantom",
  "solflare",
  "backpack",
  "jupiter",
  "raydium",
  "metamask",
  "tangem",
  "trezor",
  "ledger",
] as const;

const BRAND_MARKERS: Record<string, RegExp> = {
  phantom: /phantom|phant0m|fantom/,
  solflare: /solflare|s0lflare|solfare/,
  backpack: /backpack|backpak/,
  jupiter: /jupiter|jupiterag|^jup$|^jupag$/,
  raydium: /raydium|rayd1um|radyium/,
  metamask: /metamask|metamaskio/,
  ledger: /ledger/,
  tangem: /tangem/,
  trezor: /trezor/,
  solana: /solana|s0lana|salana/,
  orca: /^orca$/,
  kamino: /kamino/,
  jito: /^jito$/,
  marinade: /marinade/,
  drift: /^drift$/,
  sanctum: /sanctum/,
  tensor: /tensor/,
  magiceden: /magiceden|magic-eden/,
  pump: /^pump$/,
  save: /^save$/,
};

export const SHORT_LINK_HOSTS = new Set([
  "bit.ly",
  "bitly.com",
  "t.co",
  "tinyurl.com",
  "goo.gl",
  "is.gd",
  "cutt.ly",
  "rb.gy",
  "shorturl.at",
  "t.ly",
  "ow.ly",
  "buff.ly",
  "rebrand.ly",
  "lnkd.in",
  "s.id",
  "tiny.cc",
  "bl.ink",
  "short.io",
  "qrco.de",
]);

/** Drainer / lure words in the host. Alone → unclear; with brand or misspelling → scam. */
const LURE_WORD = /(?:claim|airdrop|drop|sync|rectif\w*|repair|auth|reward|verify)/i;

const URL_IN_TEXT =
  /(?:https?:\/\/|www\.)[^\s<>"'()]+|\b(?:[a-z0-9-]+\.)+(?:[a-z]{2,24}|xn--[a-z0-9-]+)(?:\/[^\s<>"'()]*)?/i;

export interface CheckLinkOptions {
  /** When false, skip the reported-host list and run pattern rules alone. Default true. */
  useReportedList?: boolean;
  reported?: Map<string, ReportedHost>;
}

function report(partial: Omit<LinkReport, "refused">): LinkReport {
  return { refused: false, ...partial };
}

const DO_NOT_CONNECT = "Do not connect a wallet to it and do not enter recovery words.";
const OPEN_OFFICIAL = "don't connect a wallet; open the official app yourself";

function parseHostname(raw: string): string | null {
  const trimmed = raw.replace(/[.,;:!?]+$/g, "").trim();
  if (!trimmed) return null;
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    let host = url.hostname.toLowerCase();
    if (host.endsWith(".")) host = host.slice(0, -1);
    // Port is already excluded by URL.hostname.
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Normalize before any check: add https:// if there is no scheme, parse with the
 * WHATWG URL parser (IDNA → xn--), lowercase, drop trailing dot, drop the port.
 * Uses URL.hostname alone, so "https://phantom.com@evil.example/" is evil.example.
 * Never uses substring matching for the verdict host.
 */
export function normalizeHost(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Single-token / full-URL input: parse the whole string so IDNA (e.g. Cyrillic)
  // is not chopped by the ASCII URL finder.
  const withoutScheme = trimmed.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
  if (!/\s/.test(withoutScheme)) {
    const whole = parseHostname(trimmed);
    if (whole) return whole;
  }

  const found = trimmed.match(URL_IN_TEXT);
  if (!found) return null;
  return parseHostname(found[0]);
}

/** @deprecated Prefer normalizeHost. Kept for older call sites. */
export function extractHost(input: string): string | null {
  return normalizeHost(input);
}

function labels(host: string): string[] {
  return host.split(".").filter(Boolean);
}

export function isOfficialHost(host: string): string | null {
  for (const root of SHARED_HOSTING) {
    if (host === root) return null;
  }
  for (const [brand, domains] of Object.entries(OFFICIAL_DOMAINS)) {
    for (const domain of domains) {
      if (host === domain || host.endsWith(`.${domain}`)) return brand;
    }
  }
  return null;
}

/**
 * "phantom.com.attacker.example" embeds an official domain as labels but is not
 * that domain or a subdomain of it. Treat as a lookalike.
 */
export function embeddedOfficialDomain(host: string): string | null {
  for (const [brand, domains] of Object.entries(OFFICIAL_DOMAINS)) {
    for (const domain of domains) {
      if (host === domain || host.endsWith(`.${domain}`)) continue;
      if (host.includes(`${domain}.`)) return brand;
    }
  }
  return null;
}

export function brandInHost(host: string): string | null {
  for (const label of labels(host)) {
    for (const piece of [label, ...label.split(/[-_]/)]) {
      for (const [brand, marker] of Object.entries(BRAND_MARKERS)) {
        if (marker.test(piece)) return brand;
      }
    }
  }
  return null;
}

export function hostHasLureWord(host: string): boolean {
  for (const label of labels(host)) {
    for (const piece of label.split(/[-_]/)) {
      if (piece && LURE_WORD.test(piece)) return true;
    }
  }
  return false;
}

/** Levenshtein edit distance. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

/** Within 2 edits of a listed brand (phantom, solflare, backpack, jupiter, raydium, ledger, tangem, trezor, metamask). */
function editBudget(_brand: string): number {
  return 2;
}

/**
 * A host label within 2 letters of a brand, and not an official host.
 */
export function misspelledBrand(host: string): string | null {
  if (isOfficialHost(host)) return null;
  const pieces: string[] = [];
  for (const label of labels(host)) {
    pieces.push(label);
    pieces.push(...label.split(/[-_]/).filter(Boolean));
  }
  for (const piece of pieces) {
    if (piece.length < 4) continue;
    for (const brand of SPELLING_BRANDS) {
      const budget = editBudget(brand);
      if (piece === brand) continue;
      if (Math.abs(piece.length - brand.length) > budget) continue;
      if (editDistance(piece, brand) <= budget) return brand;
    }
  }
  return null;
}

function reportedWhy(entry: ReportedHost): string {
  const when = entry.date ? ` (${entry.date})` : "";
  return `Reported as phishing by ${entry.source}${when}. This is a past report, not a current scan.`;
}

export function checkLink(input: string, options: CheckLinkOptions = {}): LinkReport {
  const useReported = options.useReportedList !== false;
  const reported = options.reported ?? reportedHostMap();

  const host = normalizeHost(input);
  if (!host) {
    return report({
      verdict: "no_known_pattern",
      reason: "no_url",
      host: null,
      brand: null,
      why: `No URL or domain was found in that text. ${NOT_A_CLEARANCE}`,
      next_steps: ["Paste the link or the domain name itself.", "Do not open it while you check."],
    });
  }

  const parts = labels(host);

  if (parts.some((label) => label.startsWith("xn--"))) {
    return report({
      verdict: "scam",
      reason: "punycode_host",
      host,
      brand: brandInHost(host) ?? misspelledBrand(host),
      why: "This host uses punycode (xn--), which is how a lookalike domain hides a swapped letter. Official wallets and apps do not use punycode domains.",
      next_steps: ["Do not open the link.", DO_NOT_CONNECT, "Open the official app yourself from the icon you installed."],
    });
  }

  if (SHORT_LINK_HOSTS.has(host) || SHORT_LINK_HOSTS.has(parts.slice(-2).join("."))) {
    return report({
      verdict: "unclear",
      reason: "short_link",
      host,
      brand: null,
      why: "This is a short link. I can't see where it goes, so I can't check it. Open the official app yourself instead of following it.",
      next_steps: [
        "Do not open the short link.",
        "Open the official wallet or app yourself, from the icon you installed or an address you typed.",
        "If the sender is real, they can give you the full address.",
      ],
    });
  }

  if (useReported) {
    const hit = reported.get(host);
    if (hit) {
      return report({
        verdict: "scam",
        reason: "reported_host",
        host,
        brand: brandInHost(host) ?? misspelledBrand(host),
        why: reportedWhy(hit),
        next_steps: ["Do not open the link.", DO_NOT_CONNECT, "Open the official app yourself from the icon you installed."],
      });
    }
  }

  const officialBrand = isOfficialHost(host);
  if (officialBrand) {
    return report({
      verdict: "official",
      reason: "official_domain",
      host,
      brand: officialBrand,
      why: `${host} is the official ${officialBrand} domain or a subdomain of it. That says who runs the page, not that any prompt on it is safe to sign. ${NOT_A_CLEARANCE}`,
      next_steps: [
        "Check the address bar yourself, letter by letter, before you act.",
        "Do not connect or sign because a message sent you here.",
      ],
    });
  }

  const misspelled = misspelledBrand(host);
  if (misspelled) {
    return report({
      verdict: "scam",
      reason: "lookalike_domain",
      host,
      brand: misspelled,
      why: `${host} looks like a misspelling of ${misspelled} and is not an official ${misspelled} domain. That is a lookalike domain.`,
      next_steps: [
        "Do not open the link.",
        DO_NOT_CONNECT,
        `If you need ${misspelled}, type ${(OFFICIAL_DOMAINS[misspelled] ?? [])[0] ?? "the official site"} yourself or open the app you installed.`,
      ],
    });
  }

  const embedded = embeddedOfficialDomain(host);
  if (embedded) {
    return report({
      verdict: "scam",
      reason: "lookalike_domain",
      host,
      brand: embedded,
      why: `${host} puts ${embedded}'s official domain inside a different host. That is a lookalike domain.`,
      next_steps: [
        "Do not open the link.",
        DO_NOT_CONNECT,
        `If you need ${embedded}, type ${(OFFICIAL_DOMAINS[embedded] ?? [])[0] ?? "the official site"} yourself or open the app you installed.`,
      ],
    });
  }

  const brand = brandInHost(host);
  const lure = hostHasLureWord(host);

  if (brand && lure) {
    return report({
      verdict: "scam",
      reason: "brand_and_lure",
      host,
      brand,
      why: `${host} carries the ${brand} name and a lure word (claim, drop, sync, …) but is not an official ${brand} domain.`,
      next_steps: [
        "Do not open the link.",
        DO_NOT_CONNECT,
        `If you need ${brand}, type ${(OFFICIAL_DOMAINS[brand] ?? [])[0] ?? "the official site"} yourself or open the app you installed.`,
      ],
    });
  }

  if (brand) {
    return report({
      verdict: "scam",
      reason: "lookalike_domain",
      host,
      brand,
      why: `${host} carries the ${brand} name but is not ${(OFFICIAL_DOMAINS[brand] ?? []).join(" or ") || "an official domain"} or a subdomain of it. That is a lookalike domain.`,
      next_steps: [
        "Do not open the link.",
        DO_NOT_CONNECT,
        `If you need ${brand}, type ${(OFFICIAL_DOMAINS[brand] ?? [])[0] ?? "the official site"} yourself or open the app you installed.`,
      ],
    });
  }

  if (lure) {
    return report({
      verdict: "unclear",
      reason: "lure_words_in_host",
      host,
      brand: null,
      why: `${OPEN_OFFICIAL}. ${NOT_A_CLEARANCE}`,
      next_steps: [
        "Do not open the link from a message.",
        OPEN_OFFICIAL,
        "Type the official address yourself or open the app you installed.",
      ],
    });
  }

  return report({
    verdict: "no_known_pattern",
    reason: "no_known_pattern",
    host,
    brand: null,
    why: `${host} does not match a reported host, lookalike, punycode, short-link, brand, or lure-word pattern, and it is not on the official list. ${NOT_A_CLEARANCE}`,
    next_steps: [
      "A clean check is not permission to connect a wallet.",
      "If a message sent you this link, open the official app yourself instead.",
    ],
  });
}
