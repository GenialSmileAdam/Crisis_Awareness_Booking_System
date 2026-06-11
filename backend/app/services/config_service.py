"""
System configuration service.

Single source of truth for admin-tunable settings. Stored as one JSON row
(`app_config`) merged over canonical defaults, with a short in-process TTL cache
mirroring `analytics_service`. Read everywhere that previously hardcoded values
(WRS tier thresholds, alert routing, auto-assignment).
"""
from __future__ import annotations

import uuid
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.app_config import AppConfig

# ── Canonical defaults ────────────────────────────────────────────────────────
DEFAULT_CONFIG: dict[str, Any] = {
    "wrs": {
        # Tier boundaries on the 0–100 WRS scale (lower bound of each tier).
        "thresholds": {"amber": 40, "red": 65, "critical": 85},
        # Weights for the multi-factor session WRS (used in session_ai).
        "weights": {
            "assessment": 0.35,
            "pulse_trend": 0.20,
            "attendance": 0.10,
            "completion_rate": 0.10,
            "crisis_history": 0.15,
            "session_freq": 0.10,
        },
    },
    "alerts": {
        # Channels used when escalating an at-risk student.
        "channels": {"in_app": True, "email": True, "campus_one": True, "sms": False},
        # Tiers that trigger a counsellor/admin alert.
        "notify_tiers": ["red", "critical"],
        # How long before an unacknowledged crisis escalates further (minutes).
        "crisis_escalation_minutes": 30,
    },
    "assignment": {
        # manual | round_robin | least_loaded | by_faculty
        "strategy": "manual",
        "caseload_cap": 50,
    },
}

# Keys exposed to any authenticated user (non-sensitive display config).
_PUBLIC_KEYS = ("wrs",)

# ── TTL cache ─────────────────────────────────────────────────────────────────
_CACHE_TTL = 60  # seconds
_cache: dict[str, tuple[dict, datetime]] = {}
_CACHE_KEY = "app_config"


def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge `override` into a copy of `base`."""
    out = deepcopy(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _deep_merge(out[key], value)
        else:
            out[key] = value
    return out


def bust_cache() -> None:
    _cache.pop(_CACHE_KEY, None)


async def get_config(db: AsyncSession) -> dict[str, Any]:
    """Return the merged config (stored partial over defaults), TTL-cached."""
    cached = _cache.get(_CACHE_KEY)
    if cached is not None:
        data, ts = cached
        if (datetime.now(timezone.utc) - ts).total_seconds() < _CACHE_TTL:
            return data

    row = (await db.execute(select(AppConfig).where(AppConfig.id == 1))).scalar_one_or_none()
    stored = row.data if row and isinstance(row.data, dict) else {}
    merged = _deep_merge(DEFAULT_CONFIG, stored)
    _cache[_CACHE_KEY] = (merged, datetime.now(timezone.utc))
    return merged


async def update_config(
    db: AsyncSession, patch: dict[str, Any], updated_by: Optional[uuid.UUID] = None
) -> dict[str, Any]:
    """Deep-merge `patch` into the stored config row and return the merged result."""
    row = (await db.execute(select(AppConfig).where(AppConfig.id == 1))).scalar_one_or_none()
    current = row.data if row and isinstance(row.data, dict) else {}
    new_data = _deep_merge(current, patch)

    if row is None:
        row = AppConfig(id=1, data=new_data, updated_by=updated_by)
        db.add(row)
    else:
        row.data = new_data
        row.updated_by = updated_by
        # JSON column needs an explicit reassign to be marked dirty (done above).

    await db.commit()
    bust_cache()
    return _deep_merge(DEFAULT_CONFIG, new_data)


def public_subset(config: dict[str, Any]) -> dict[str, Any]:
    """Non-sensitive slice safe to expose to any authenticated user."""
    return {k: config[k] for k in _PUBLIC_KEYS if k in config}


# ── Typed convenience getters ─────────────────────────────────────────────────
async def get_tier_thresholds(db: AsyncSession) -> dict[str, float]:
    cfg = await get_config(db)
    t = cfg["wrs"]["thresholds"]
    return {"amber": float(t["amber"]), "red": float(t["red"]), "critical": float(t["critical"])}


async def get_wrs_weights(db: AsyncSession) -> dict[str, float]:
    return dict((await get_config(db))["wrs"]["weights"])


async def get_alert_settings(db: AsyncSession) -> dict[str, Any]:
    return dict((await get_config(db))["alerts"])


async def get_assignment_settings(db: AsyncSession) -> dict[str, Any]:
    return dict((await get_config(db))["assignment"])
