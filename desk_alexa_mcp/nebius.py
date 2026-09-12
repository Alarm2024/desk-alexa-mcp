"""Optional Nebius Token Factory enrich (OpenAI-compatible)."""

from __future__ import annotations

import json
import os
import re
from typing import Any

DEFAULT_BASE_URL = "https://api.tokenfactory.nebius.com/v1/"
DEFAULT_MODEL = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B"

SYSTEM_PROMPT = """You are Morning Light Desk MCP — an honest dry-desk analyst for Alexa+ agents.

You read dry bot "Exam/card" text from a solo operator's mock desk. You NEVER:
- recommend live trading, arming, or sending orders
- mention CLEAR+, go, or auto-engage paths in Recommend
- invent wallet keys, Telegram, or external APIs

You ALWAYS respond in English with exactly these six labeled lines (one field per line):
Test result: <pass/warn/fail style summary>
Signal: <what the card is saying>
Problem: <main issue or "None">
Needs: <what the human should do, if anything>
Alarms: <severity + brief note, or NONE>
Recommend: <one concrete next step on the dry desk — HOLD/eyes language only>

Be concise, honest, and decision-grade. Mock fixtures only."""


def get_nebius_config() -> dict[str, str]:
    return {
        "api_key": os.getenv("NEBIUS_API_KEY", ""),
        "base_url": os.getenv("NEBIUS_BASE_URL", DEFAULT_BASE_URL).rstrip("/") + "/",
        "model": os.getenv("NEBIUS_MODEL", DEFAULT_MODEL),
    }


def _extract_json_block(text: str) -> dict[str, Any] | None:
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        data = json.loads(match.group())
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        return None
    return None


def _parse_labeled_lines(text: str) -> dict[str, str]:
    labels = {
        "test_result": r"test\s*result",
        "signal": r"signal",
        "problem": r"problem",
        "needs": r"needs",
        "alarms": r"alarms?",
        "recommend": r"recommend(?:ation)?",
    }
    found: dict[str, str] = {}
    for key, pattern in labels.items():
        m = re.search(
            rf"(?im)^\s*(?:\*\*)?{pattern}(?:\*\*)?\s*[:·\-]\s*(.+?)(?=^\s*(?:\*\*)?(?:test\s*result|signal|problem|needs|alarms?|recommend)|\Z)",
            text,
            re.MULTILINE | re.DOTALL,
        )
        if m:
            found[key] = m.group(1).strip().replace("\n", " ")
    return found


def _normalize_fields(raw: dict[str, Any]) -> dict[str, str]:
    mapping = {
        "test_result": ["test_result", "test result", "testResult"],
        "signal": ["signal"],
        "problem": ["problem"],
        "needs": ["needs"],
        "alarms": ["alarms", "alarm"],
        "recommend": ["recommend", "recommendation"],
    }
    out: dict[str, str] = {}
    lower_keys = {str(k).lower().replace(" ", "_"): v for k, v in raw.items()}
    for field, aliases in mapping.items():
        for alias in aliases:
            if alias in lower_keys:
                out[field] = str(lower_keys[alias]).strip()
                break
        if field not in out:
            out[field] = "—"
    return out


def _sanitize_recommend(text: str) -> str:
    """Strip forbidden live-trading / go language from model output."""
    cleaned = text
    for forbidden in ("CLEAR+", "clear+", " auto-go", "auto-arm", "live send", "go live"):
        cleaned = re.sub(re.escape(forbidden), "👀 HOLD", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def nebius_analyze(exam_card: str) -> dict[str, str]:
    """Call Nebius Token Factory for enriched analysis."""
    cfg = get_nebius_config()
    if not cfg["api_key"]:
        raise RuntimeError("NEBIUS_API_KEY is not set")

    try:
        from openai import OpenAI
    except ImportError as exc:
        raise RuntimeError("openai package required for live Nebius mode") from exc

    user_prompt = (
        "Analyze this dry bot Exam/card text. Return JSON with keys: "
        "test_result, signal, problem, needs, alarms, recommend.\n\n"
        f"--- exam card ---\n{exam_card.strip()}\n--- end ---"
    )

    client = OpenAI(base_url=cfg["base_url"], api_key=cfg["api_key"])
    response = client.chat.completions.create(
        model=cfg["model"],
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=800,
    )
    raw = (response.choices[0].message.content or "").strip()

    parsed = _extract_json_block(raw)
    if parsed:
        fields = _normalize_fields(parsed)
    else:
        labeled = _parse_labeled_lines(raw)
        fields = _normalize_fields(labeled) if len(labeled) >= 4 else {
            "test_result": "REVIEW",
            "signal": raw[:200],
            "problem": "Model returned unstructured text",
            "needs": "Re-run or adjust NEBIUS_MODEL",
            "alarms": "INFO",
            "recommend": "👀 HOLD — review card manually.",
        }

    if "recommend" in fields:
        fields["recommend"] = _sanitize_recommend(fields["recommend"])
    return fields
