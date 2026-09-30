/**
 * Reported phishing hosts, stored DEFANGED.
 * Replace "[.]" with "." when loading. Exact host match only.
 * Source URLs sit in the comments for Instinct's source file.
 */

export interface ReportedHost {
  /** Defanged host, e.g. "phanton[.]app". */
  defanged: string;
  source: string;
  date: string | null;
}

export const REPORTED_HOSTS: ReportedHost[] = [
  // https://research.checkpoint.com/ — Check Point Research Phantom typosquat report
  { defanged: "phanton[.]app", source: "Check Point Research", date: "2021-11-04" },
  // https://research.checkpoint.com/ — Check Point Research Phantom typosquat report
  { defanged: "phantonn[.]app", source: "Check Point Research", date: "2021-11-04" },
  // https://seal.org/ — SEAL weekly phishing digest
  { defanged: "tickets-ledger[.]com", source: "SEAL weekly", date: "2026-09-29" },
  // https://seal.org/ — SEAL weekly phishing digest
  { defanged: "keys-tangem[.]com", source: "SEAL weekly", date: "2026-09-29" },
  // https://slowmist.medium.com/ — SlowMist phishing report
  { defanged: "signature[.]land", source: "SlowMist", date: "2025-06-02" },
  // https://paragraph.com/@knowyourcrook/scam-review-validate-your-wallet
  { defanged: "s[.]auths-repair[.]online", source: "Know Your Crook", date: "2022-04-04" },
  // https://www.pcrisk.com/ — PCrisk phishing / rogue software reports
  { defanged: "phanton[.]pro", source: "PCrisk", date: null },
  // https://www.pcrisk.com/
  { defanged: "phanstart[.]live", source: "PCrisk", date: null },
  // https://www.pcrisk.com/
  { defanged: "soldrop[.]w3claim[.]xyz", source: "PCrisk", date: null },
  // https://www.pcrisk.com/
  { defanged: "soldrop[.]solvault[.]ws", source: "PCrisk", date: null },
  // https://www.pcrisk.com/
  { defanged: "sol[.]dot-io[.]cc", source: "PCrisk", date: null },
  // https://www.pcrisk.com/
  { defanged: "token-skr[.]org", source: "PCrisk", date: null },
  // https://www.pcrisk.com/
  { defanged: "skr[.]solplanet[.]cc", source: "PCrisk", date: null },
  // https://www.pcrisk.com/
  { defanged: "hubsync-dev[.]pages[.]dev", source: "PCrisk", date: null },
  // https://www.pcrisk.com/
  { defanged: "blockchainsynced[.]pages[.]dev", source: "PCrisk", date: null },
];

export function undefangHost(defanged: string): string {
  return defanged.replaceAll("[.]", ".").toLowerCase();
}

/** Exact-host lookup map. Parent or sibling hosts never match. */
export function reportedHostMap(
  entries: ReportedHost[] = REPORTED_HOSTS,
): Map<string, ReportedHost> {
  const map = new Map<string, ReportedHost>();
  for (const entry of entries) {
    map.set(undefangHost(entry.defanged), entry);
  }
  return map;
}
