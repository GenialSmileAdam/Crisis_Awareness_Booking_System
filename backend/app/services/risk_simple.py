from typing import Any, Dict, Optional
from app.models.risk_scores import RiskTier

# PHQ-9: 9 questions × max 3 = 27
# GAD-7: 7 questions × max 3 = 21
MAX_SCORES = {"phq9": 27, "gad7": 21}


def normalize_score(raw_score: int, max_score: int) -> float:
    """Convert a raw score to 0-100 WRS (higher = more at risk)."""
    if max_score <= 0:
        return 0.0
    return round(min(100.0, max(0.0, (raw_score / max_score) * 100)), 2)


# Fallback tier boundaries when no admin config is supplied. The authoritative
# values live in `config_service` (admin-tunable); these keep the pure function
# usable in contexts without a DB session.
_DEFAULT_THRESHOLDS = {"amber": 40.0, "red": 65.0, "critical": 85.0}


def get_tier(wrs: float, thresholds: Optional[Dict[str, float]] = None) -> str:
    t = thresholds or _DEFAULT_THRESHOLDS
    if wrs >= t["critical"]:
        return "critical"
    elif wrs >= t["red"]:
        return "red"
    elif wrs >= t["amber"]:
        return "amber"
    else:
        return "green"


def calculate_pulse_wrs(responses: Optional[Dict[str, Any]]) -> float:
    """
    Pulse sliders are 1–5 where 5 = best. Convert to risk score (higher = worse).
    WRS = ((5 - avg) / 4) * 100
    avg=1 → WRS=100 (critical), avg=5 → WRS=0 (green).
    """
    if not responses:
        return 50.0
    values = [v for v in responses.values() if isinstance(v, (int, float)) and 1 <= v <= 5]
    if not values:
        return 50.0
    avg = sum(values) / len(values)
    return round(max(0.0, min(100.0, ((5 - avg) / 4) * 100)), 2)


def calculate_wrs_and_tier(
    test_type: str,
    score: Optional[int],
    responses: Optional[Dict[str, Any]] = None,
    thresholds: Optional[Dict[str, float]] = None,
) -> tuple[float, str]:
    """
    Calculate WRS and risk tier from a check-in submission.
    - PHQ-9: normalized from 0–27
    - GAD-7: normalized from 0–21
    - Pulse: derived from 1–5 slider averages (higher average = lower risk)

    `thresholds` (from config_service) override the default tier boundaries so the
    stored tier reflects the admin-configured cut points.
    """
    if test_type == "pulse":
        wrs = calculate_pulse_wrs(responses)
    elif test_type in MAX_SCORES and score is not None:
        wrs = normalize_score(score, MAX_SCORES[test_type])
    else:
        wrs = 50.0
    tier = get_tier(wrs, thresholds)
    return wrs, tier