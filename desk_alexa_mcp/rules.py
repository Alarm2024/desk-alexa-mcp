"""Offline rules engine — works without any API key."""

from __future__ import annotations

import re


def _pick(text: str, *patterns: str) -> str | None:
    lower = text.lower()
    for pattern in patterns:
        if pattern.lower() in lower:
            return pattern
    return None


def _summarize_signal(text: str) -> str:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        return "Empty exam card"
    snippet = " · ".join(lines[:3])
    return re.sub(r"\s+", " ", snippet)[:120]


def rules_analyze(exam_card: str) -> dict[str, str]:
    """Rule-based analysis for dry exam cards when no Nebius key is set."""
    text = exam_card.strip()
    lower = text.lower()

    if "fault" in lower or ("bridge" in lower and "timeout" in lower):
        return {
            "test_result": "FAIL — operational fault on dry desk",
            "signal": "Bridge heartbeat missing · execution lane halted",
            "problem": "EXEC_BRIDGE_TIMEOUT — mock bridge down 90s+",
            "needs": "Human ack · verify bridge process · restart dry lane",
            "alarms": "CRITICAL — do not proceed until bridge restored",
            "recommend": "Pause dry sends. Restart bridge mock, re-run exam card.",
        }

    if "short" in lower and ("regime" in lower or "bearish" in lower):
        return {
            "test_result": "WARN — SHORT regime on dry desk",
            "signal": "Bearish breadth · thinning liquidity · wider spreads",
            "problem": "Regime shift detected — stance not confirmed",
            "needs": "Operator review of SHORT playbook (dry sim only)",
            "alarms": "MEDIUM — elevated slippage risk in sim",
            "recommend": "Stay in dry sim. Log stance. 👀 eyes only — no live engagement.",
        }

    if ("preflight" in lower or "checklist" in lower) and (
        "complete" in lower or "green" in lower
    ):
        return {
            "test_result": "ATTENTION — pre-flight complete on dry desk",
            "signal": "All checks green · decision window open (dry only)",
            "problem": "Operator decision pending — still dry run",
            "needs": "Explicit human review before any live arming",
            "alarms": "LOW — informational only",
            "recommend": "Review checklist offline. 👀 HOLD — this demo never arms live trading.",
        }

    if _pick(lower, "safe hold", "holding pattern", "no anomalies"):
        return {
            "test_result": "PASS — SAFE HOLD dry watch",
            "signal": "Neutral regime · stable liquidity · pre-open session",
            "problem": "None — routine dry holding pattern",
            "needs": "Continue silent watch · no operator action",
            "alarms": "NONE",
            "recommend": "Keep monitoring. Re-pulse exam card on next tick.",
        }

    return {
        "test_result": "REVIEW — exam card parsed (offline rules)",
        "signal": _summarize_signal(text),
        "problem": "Unclassified card — human skim advised",
        "needs": "Optional: set NEBIUS_API_KEY for model enrich",
        "alarms": "INFO — offline rules only",
        "recommend": "👀 HOLD — skim card manually or re-run with Nebius enrich.",
    }
