import { checkLink } from "./links.js";
import { refusalFor, seedRefusal } from "./refusals.js";
import { checkScam } from "./scam.js";
import {
  summarizeLink,
  summarizeRefusal,
  summarizeScam,
  type WithSummary,
} from "./summary.js";
import type { LinkReport } from "./links.js";
import type { Refusal } from "./refusals.js";
import type { ScamReport } from "./scam.js";

export type MessageResult = WithSummary<Refusal> | WithSummary<ScamReport>;
export type LinkResult = WithSummary<Refusal> | WithSummary<LinkReport>;

/**
 * Order matters:
 * 1. A pasted seed phrase is refused before any rule reads it.
 * 2. The scam rules run on the whole text. A forwarded message that says
 *    "approve this transaction to claim your airdrop" is a scam, not a request to Iris.
 * 3. Refusals cover what the person asks Iris to do: price advice, connect or sign.
 * 4. Otherwise the clean verdict, which is not a clearance.
 */
export function evaluateMessage(text: string): MessageResult {
  const seeded = seedRefusal(text);
  if (seeded) return summarizeRefusal(seeded);
  const report = checkScam(text);
  if (report.verdict === "scam") return summarizeScam(report);
  const refusal = refusalFor(text);
  if (refusal) return summarizeRefusal(refusal);
  return summarizeScam(report);
}

const URL_TOKENS = /(?:https?:\/\/|www\.)\S+|\b(?:[a-z0-9-]+\.)+[a-z]{2,24}(?:\/\S*)?/gi;

/** Same order for a link. The refusal check reads the words around the URL, not the URL itself. */
export function evaluateLink(text: string): LinkResult {
  const seeded = seedRefusal(text);
  if (seeded) return summarizeRefusal(seeded);
  const report = checkLink(text);
  if (report.verdict === "scam" || report.verdict === "unclear") return summarizeLink(report);
  const refusal = refusalFor(text.replace(URL_TOKENS, " "));
  if (refusal) return summarizeRefusal(refusal);
  return summarizeLink(report);
}
