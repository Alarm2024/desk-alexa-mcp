import type { CleanupPlan } from "./cleanup.js";
import type { ExplainMiss, ExplainOk } from "./explain.js";
import type { LinkReport } from "./links.js";
import type { Refusal } from "./refusals.js";
import type { ScamReport } from "./scam.js";
import type { SafetyTip } from "./tips.js";

/** One plain spoken sentence. No amounts that are not in the transaction. No promise of safety. */
export type WithSummary<T> = T & { summary: string };

export function summarizeRefusal(refusal: Refusal): WithSummary<Refusal> {
  const line =
    refusal.reason === "seed_phrase"
      ? "Refused: that looks like a seed phrase, and this server will not handle it."
      : refusal.reason === "price_advice"
        ? "Refused: this server does not give price or buy/sell advice."
        : "Refused: this server cannot connect a wallet, sign in, sign, or approve.";
  return { ...refusal, summary: line };
}

export function summarizeScam(report: ScamReport): WithSummary<ScamReport> {
  if (report.verdict === "scam") {
    return {
      ...report,
      summary: `This matches a known scam pattern (${report.pattern ?? report.reason}). Do not follow it.`,
    };
  }
  return {
    ...report,
    summary: "No known scam pattern matched. That is not a clearance.",
  };
}

export function summarizeLink(report: LinkReport): WithSummary<LinkReport> {
  switch (report.reason) {
    case "reported_host":
      return { ...report, summary: "This host was reported as phishing before. Do not open it." };
    case "lookalike_domain":
      return { ...report, summary: "This looks like a lookalike domain. Do not open it." };
    case "punycode_host":
      return { ...report, summary: "This host uses punycode, which often hides a lookalike. Do not open it." };
    case "brand_and_lure":
      return { ...report, summary: "This host mixes a brand name with a lure word. Do not open it." };
    case "brand_in_host":
    case "lure_words_in_host":
      return { ...report, summary: "Don't connect a wallet; open the official app yourself." };
    case "short_link":
      return { ...report, summary: "This is a short link, so I can't see where it goes." };
    case "official_domain":
      return {
        ...report,
        summary: "This is an official domain. That says who runs the page, not that a prompt on it is safe to sign.",
      };
    case "no_url":
      return { ...report, summary: "No URL or domain was found in that text." };
    default:
      return { ...report, summary: "No known link pattern matched. That is not a clearance." };
  }
}

export function summarizeTip(tip: SafetyTip): WithSummary<SafetyTip> {
  const first = tip.tip.split(/(?<=\.)\s+/)[0] ?? tip.tip;
  return { ...tip, summary: first };
}

export function summarizeCleanup(plan: CleanupPlan): WithSummary<CleanupPlan> {
  return {
    ...plan,
    summary: `Here are clean-up steps for your ${plan.target}. You do them yourself on the device.`,
  };
}

/**
 * Spoken one-liner for a decoded transaction. Amounts only when present in findings.
 * ACT NOW with an unknown program and unlimited approvals uses fixed wording.
 */
export function summarizeExplain(report: ExplainOk | ExplainMiss): WithSummary<ExplainOk | ExplainMiss> {
  if (!report.found) {
    return { ...report, summary: report.message };
  }

  const findings = report.findings.join(" | ").toLowerCase();
  const unlimited = report.findings.filter((line) => /unlimited approve/i.test(line)).length;
  const unknown = report.findings.some((line) => /unknown program/i.test(line));

  if (report.class_label === "ACT NOW" && unknown && unlimited >= 2) {
    return {
      ...report,
      summary: "ACT NOW: this transaction calls an unknown program and two unlimited approvals.",
    };
  }

  if (report.class_label === "QUIET" && /transfer/.test(findings)) {
    const amount = report.findings.find((line) => /^transfer /i.test(line));
    if (amount) {
      const spoken = amount.replace(/^transfer\s+/i, "").replace(/\s*->\s*\S+/, "").trim();
      return {
        ...report,
        summary: `QUIET: this looks like a simple transfer of ${spoken}.`,
      };
    }
    return { ...report, summary: "QUIET: this looks like a simple transfer." };
  }

  if (report.class_label === "OPEN PATHS") {
    return {
      ...report,
      summary: "OPEN PATHS: this looks like a swap that routes through several programs.",
    };
  }

  if (report.class_label === "ACT NOW") {
    return {
      ...report,
      summary: "ACT NOW: this transaction has instructions that need a careful read before anyone signs anything like it again.",
    };
  }

  return {
    ...report,
    summary: `${report.class_label}: decoded ${report.programs.slice(0, 3).join(", ") || "programs"} from the public chain read.`,
  };
}
