"""FastAPI app with Streamable HTTP MCP (spec 2025-11-25+) and Alexa+ web sim."""

from __future__ import annotations

import contextlib
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field

from desk_alexa_mcp import __version__
from desk_alexa_mcp.analyzer import analysis_payload
from desk_alexa_mcp.config import HOST, PORT

REPO_ROOT = Path(__file__).resolve().parent.parent
WEB_DIR = REPO_ROOT / "web"

mcp = FastMCP(
    "Morning Light Desk MCP",
    json_response=True,
    stateless_http=True,
    streamable_http_path="/",
    instructions=(
        "Honest dry-desk analyst for Alexa+ agents. "
        "English only. No live trading. HOLD/eyes recommendations only."
    ),
)


@mcp.tool()
def analyze_exam_card(exam_card: str) -> dict[str, object]:
    """Analyze dry Exam/card text into structured desk fields.

    Input: raw exam/card pulse text from a mock dry desk.
    Output: test_result, signal, problem, needs, alarms, recommend, report, engine.
    """
    if not exam_card or not exam_card.strip():
        return {
            "test_result": "FAIL — empty input",
            "signal": "No exam card text provided",
            "problem": "Missing exam_card argument",
            "needs": "Pass non-empty dry exam/card text",
            "alarms": "LOW",
            "recommend": "👀 HOLD — supply a sample card from fixtures/exam_cards/",
            "report": "",
            "engine": "offline",
        }
    return analysis_payload(exam_card)


@mcp.tool()
def health() -> dict[str, str]:
    """Server health and configuration snapshot."""
    mode = os.getenv("NEBIUS_EYES_MODE", "auto")
    has_nebius = bool(os.getenv("NEBIUS_API_KEY"))
    engine = "nebius" if has_nebius and mode != "demo" else "offline"
    return {
        "status": "ok",
        "service": "morning-light-desk-mcp",
        "version": __version__,
        "transport": "streamable-http",
        "mcp_spec": "2025-11-25",
        "engine": engine,
        "nebius_configured": str(has_nebius).lower(),
    }


class AnalyzeRequest(BaseModel):
    exam_card: str = Field(..., description="Dry exam/card pulse text")


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    async with mcp.session_manager.run():
        yield


app = FastAPI(
    title="Morning Light Desk MCP",
    description="Alexa+ hackathon MCP server — Streamable HTTP + web sim",
    version=__version__,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Mcp-Session-Id"],
)

app.mount("/mcp", mcp.streamable_http_app())

if WEB_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=str(WEB_DIR)), name="static")


@app.get("/", response_class=HTMLResponse)
async def root():
    sim = WEB_DIR / "sim.html"
    if sim.is_file():
        return FileResponse(sim)
    return HTMLResponse(
        "<h1>Morning Light Desk MCP</h1>"
        "<p>Web sim missing. MCP at <code>/mcp</code></p>"
    )


@app.get("/sim", response_class=HTMLResponse)
async def sim_page():
    sim = WEB_DIR / "sim.html"
    return FileResponse(sim)


@app.get("/health")
async def http_health():
    return health()


@app.post("/api/analyze")
async def api_analyze(body: AnalyzeRequest):
    """REST helper for the Alexa+ web simulation page."""
    return analysis_payload(body.exam_card)


def main() -> None:
    import uvicorn

    uvicorn.run(
        "desk_alexa_mcp.server:app",
        host=HOST,
        port=PORT,
        reload=False,
    )


if __name__ == "__main__":
    main()
