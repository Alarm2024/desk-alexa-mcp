import { NOT_A_CLEARANCE } from "./scam.js";

export type LinkVerdict = "scam" | "unclear" | "official" | "no_known_pattern";

export interface LinkReport {
  refused: false;
  verdict: LinkVerdict;
  /** Pattern id, "official_domain", or "no_known_pattern". Same field name as check_scam. */
  reason: "lookalike_domain" | "punycode_host" | "lure_words_in_host" | "short_link" | "official_domain" | "no_url" | "no_known_pattern";
  host: string | null;
  brand: string | null;
  why: string;
  next_steps: string[];
}

/** Brand → the domains that brand actually uses. Subdomains of these are treated as official. */
export const OFFICIAL_DOMAINS: Record<string, string[]> = {
  phantom: ["phantom.com", "phantom.app"],
  solflare: ["solflare.com"],
  backpack: ["backpack.app"],
  jupiter: ["jup.ag"],
  raydium: ["raydium.io"],
  solana: ["solana.com"],
};

/** Words that identify a brand when they appear inside a host label. */
const BRAND_MARKERS: Record<string, RegExp> = {
  phantom: /phantom|phant0m|fantom/,
  solflare: /solflare|s0lflare|solfare/,
  backpack: /backpack|backpak/,
  jupiter: /jupiter|jupiterag|^jup$|^jupag$/,
  raydium: /raydium|rayd1um|radyium/,
  solana: /solana|s0lana|salana/,
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

/** Lure words that appear in phishing hosts. Checked on host labels, never on the path. */
const LURE_LABEL =
  /(?:^|-)(?:claim|claims|airdrop|airdrops|drainer|giveaway|freesol|free-sol|free-mint|wallet-?connect|wallet-?sync|wallet-?verify|verify-?wallet|connect-?wallet|sync-?wallet|validate-?wallet|restore-?wallet|wallet-?restore|wallet-?recovery|recover-?wallet)(?:-|$)/;

const URL_IN_TEXT = /(?:https?:\/\/|www\.)[^\s<>"'()]+|\b(?:[a-z0-9-]+\.)+(?:[a-z]{2,24})(?:\/[^\s<>"'()]*)?/i;

export function extractHost(input: string): string | null {
  const found = input.match(URL_IN_TEXT);
  if (!found) return null;
  const raw = found[0].replace(/[.,;:!?]+$/, "");
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const host = new URL(withScheme).hostname.toLowerCase().replace(/\.$/, "");
    return host || null;
  } catch {
    return null;
  }
}

function labels(host: string): string[] {
  return host.split(".").filter(Boolean);
}

export function isOfficialHost(host: string): string | null {
  for (const [brand, domains] of Object.entries(OFFICIAL_DOMAINS)) {
    for (const domain of domains) {
      if (host === domain || host.endsWith(`.${domain}`)) return brand;
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

function report(partial: Omit<LinkReport, "refused">): LinkReport {
  return { refused: false, ...partial };
}

const DO_NOT_CONNECT = "Do not connect a wallet to it and do not enter recovery words.";

export function checkLink(input: string): LinkReport {
  const host = extractHost(input);
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
      brand: brandInHost(host),
      why: "This host uses punycode (xn--), which is how a lookalike domain hides a swapped letter. Official Solana wallets and apps do not use punycode domains.",
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

  const brand = brandInHost(host);
  if (brand) {
    return report({
      verdict: "scam",
      reason: "lookalike_domain",
      host,
      brand,
      why: `${host} carries the ${brand} name but is not ${OFFICIAL_DOMAINS[brand].join(" or ")} or a subdomain of it. That is a lookalike domain.`,
      next_steps: [
        "Do not open the link.",
        DO_NOT_CONNECT,
        `If you need ${brand}, type ${OFFICIAL_DOMAINS[brand][0]} yourself or open the app you installed.`,
      ],
    });
  }

  if (parts.slice(0, -1).some((label) => LURE_LABEL.test(label))) {
    return report({
      verdict: "scam",
      reason: "lure_words_in_host",
      host,
      brand: null,
      why: `${host} has claim, airdrop, verify, connect, or a similar lure word in its name. That is how wallet-drainer pages are named.`,
      next_steps: ["Do not open the link.", DO_NOT_CONNECT, "Open the official app yourself from the icon you installed."],
    });
  }

  return report({
    verdict: "no_known_pattern",
    reason: "no_known_pattern",
    host,
    brand: null,
    why: `${host} does not match a lookalike, punycode, short-link, or lure-word pattern, and it is not on the official list. ${NOT_A_CLEARANCE}`,
    next_steps: [
      "A clean check is not permission to connect a wallet.",
      "If a message sent you this link, open the official app yourself instead.",
    ],
  });
}
