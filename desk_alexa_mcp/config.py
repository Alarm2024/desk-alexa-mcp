"""Runtime configuration from environment variables."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parent.parent
FIXTURES_DIR = REPO_ROOT / "fixtures"

OWNER_SIGN = os.getenv("DESK_OWNER_SIGN", "✝️🧿🪬")
ASSISTANT_SIGN = os.getenv("DESK_ASSISTANT_SIGN", "3️⃣🧿5️⃣")
NEBIUS_EYES_MODE = os.getenv("NEBIUS_EYES_MODE", "auto").lower()
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
