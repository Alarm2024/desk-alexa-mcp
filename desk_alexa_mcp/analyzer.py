"""Analyze dry Exam/card text into structured desk fields."""

from __future__ import annotations

import os

from desk_alexa_mcp.config import ASSISTANT_SIGN, OWNER_SIGN
from desk_alexa_mcp.nebius import nebius_analyze
from desk_alexa_mcp.rules import rules_analyze


def analyze_exam_card(exam_card: str, *, mode: str | None = None) -> dict[str, str]:
    """Return structured analysis fields for exam card text."""
    mode = (mode or os.getenv("NEBIUS_EYES_MODE", "auto")).lower()
    use_live = mode == "live" or (mode == "auto" and os.getenv("NEBIUS_API_KEY"))

    if use_live:
        try:
            return nebius_analyze(exam_card)
        except Exception:
            # Fall back to offline rules if Nebius is misconfigured
            return rules_analyze(exam_card)

    return rules_analyze(exam_card)


def format_report(fields: dict[str, str], *, engine: str = "offline") -> str:
    """Format branded report with owner/bot signs on separate lines."""
    lines = [
        OWNER_SIGN,
        "",
        "Morning Light Desk MCP",
        "─" * 32,
        f"Test result · {fields.get('test_result', '—')}",
        f"Signal · {fields.get('signal', '—')}",
        f"Problem · {fields.get('problem', '—')}",
        f"Needs · {fields.get('needs', '—')}",
        f"Alarms · {fields.get('alarms', '—')}",
        f"Recommend · {fields.get('recommend', '—')}",
        "",
        f"Engine · {engine}",
        "",
        ASSISTANT_SIGN,
    ]
    return "\n".join(lines)


def analysis_payload(exam_card: str, *, mode: str | None = None) -> dict[str, object]:
    """Full structured payload for MCP tools and REST."""
    resolved_mode = (mode or os.getenv("NEBIUS_EYES_MODE", "auto")).lower()
    use_live = resolved_mode == "live" or (
        resolved_mode == "auto" and os.getenv("NEBIUS_API_KEY")
    )
    fields = analyze_exam_card(exam_card, mode=mode)
    engine = "nebius" if use_live and os.getenv("NEBIUS_API_KEY") else "offline"
    return {
        "test_result": fields["test_result"],
        "signal": fields["signal"],
        "problem": fields["problem"],
        "needs": fields["needs"],
        "alarms": fields["alarms"],
        "recommend": fields["recommend"],
        "report": format_report(fields, engine=engine),
        "engine": engine,
    }
