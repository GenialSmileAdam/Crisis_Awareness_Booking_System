export type RiskTier = "Green" | "Amber" | "Red" | "Critical";

export const tierFromWrs = (wrs: number): RiskTier =>
  wrs < 40 ? "Green" : wrs <= 65 ? "Amber" : wrs <= 85 ? "Red" : "Critical";

export const colorFromWrs = (wrs: number): string =>
  wrs < 40 ? "#A8FF3E" : wrs <= 65 ? "#FF8C42" : wrs <= 85 ? "#FF4560" : "#B00020";

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
