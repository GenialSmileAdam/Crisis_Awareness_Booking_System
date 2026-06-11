export type RiskTier = "Green" | "Amber" | "Red" | "Critical";

export interface TierThresholds {
  amber: number;
  red: number;
  critical: number;
}

// Runtime tier boundaries. Defaults match the backend; overridden at runtime
// from system config via setTierThresholds() (see useConfig / ConfigSync).
let _thresholds: TierThresholds = { amber: 40, red: 65, critical: 85 };

export function setTierThresholds(t: Partial<TierThresholds> | undefined): void {
  if (!t) return;
  _thresholds = {
    amber: t.amber ?? _thresholds.amber,
    red: t.red ?? _thresholds.red,
    critical: t.critical ?? _thresholds.critical,
  };
}

export function getTierThresholds(): TierThresholds {
  return { ..._thresholds };
}

// Uses lower-bound (>=) semantics to match the backend's get_tier().
export const tierFromWrs = (wrs: number): RiskTier =>
  wrs >= _thresholds.critical
    ? "Critical"
    : wrs >= _thresholds.red
    ? "Red"
    : wrs >= _thresholds.amber
    ? "Amber"
    : "Green";

export const TIER_COLORS: Record<string, string> = {
  green: "#A8FF3E",
  amber: "#FF8C42",
  red: "#FF4560",
  critical: "#B00020",
};

export const TIER_LABELS: Record<string, string> = {
  green: "Green",
  amber: "Amber",
  red: "Red",
  critical: "Critical",
};

export const colorFromWrs = (wrs: number): string =>
  TIER_COLORS[tierFromWrs(wrs).toLowerCase()];
