from app.models.risk_scores import RiskTier


def normalize_score(raw_score: int, max_score: int = 27) -> float:
    """Convert raw PHQ-9/GAD-7 score (0-27) to 0-100 risk score."""
    return round((raw_score / max_score) * 100, 2)


def get_tier(wrs: float) -> str:
    if wrs >= 85:
        return "critical"
    elif wrs >= 65:
        return "red"
    elif wrs >= 40:
        return "amber"
    else:
        return "green"


def calculate_wrs_and_tier(test_type: str, score: int) -> tuple[float, str]:
    """Simple WRS = normalized score for PHQ-9/GAD-7. For pulse, return neutral."""
    if test_type in ("phq9", "gad7"):
        wrs = normalize_score(score)
    else:
        wrs = 50.0   # default for pulse or other types
    tier = get_tier(wrs)
    return wrs, tier