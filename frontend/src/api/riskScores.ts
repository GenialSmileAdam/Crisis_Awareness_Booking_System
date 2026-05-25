import { apiRequest } from "./client";
import type { PaginatedResponse } from "./types";

// ── Interfaces ──

export type RiskTier = "green" | "amber" | "red" | "critical";

export interface RiskScoreEntry {
  id: string;
  student_id: string;
  wrs_score: number;
  tier: RiskTier;
  computed_at: string;
}

export interface RiskScoreDetail {
  current: RiskScoreEntry;
  trend: RiskScoreEntry[];
  override: RiskOverride | null;
}

export interface RiskAlert {
  student_id: string;
  full_name: string;
  wrs_score: number;
  tier: RiskTier;
  computed_at: string;
}

export interface CohortGroup {
  group: string;
  green: number;
  amber: number;
  red: number;
  critical: number;
  average_wrs_score: number;
}

export interface RiskOverridePayload {
  override_tier: RiskTier;
  justification: string;
}

export interface RiskOverride {
  id: string;
  student_id: string;
  psychologist_id: string;
  override_tier: RiskTier;
  justification: string;
  created_at: string;
}

// ── Risk score functions ──

/**
 * Get detailed risk score for a specific student (admin, psychologist).
 */
export async function getRiskScore(studentId: string): Promise<RiskScoreDetail> {
  return apiRequest<RiskScoreDetail>("GET", `/risk-scores/${studentId}`);
}

/**
 * Get paginated risk alerts (admin, psychologist).
 */
export async function getRiskAlerts(
  limit?: number,
  offset?: number,
): Promise<PaginatedResponse<RiskAlert>> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set("limit", String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
  const qs = params.toString();
  return apiRequest<PaginatedResponse<RiskAlert>>(
    "GET",
    `/risk-scores/alerts${qs ? `?${qs}` : ""}`,
  );
}

/**
 * Get cohort-level risk breakdown (admin, psychologist).
 */
export async function getRiskCohort(
  groupBy?: "department" | "year_group",
): Promise<CohortGroup[]> {
  const params = new URLSearchParams();
  if (groupBy) params.set("group_by", groupBy);
  const qs = params.toString();
  return apiRequest<CohortGroup[]>(
    "GET",
    `/risk-scores/cohort${qs ? `?${qs}` : ""}`,
  );
}

/**
 * Full WRS score history for a student (default 180 days / full semester).
 */
export async function getStudentWrsHistory(
  studentId: string,
  days = 180,
): Promise<RiskScoreEntry[]> {
  return apiRequest<RiskScoreEntry[]>(
    "GET",
    `/risk-scores/history/${studentId}?days=${days}`,
  );
}

/**
 * Override a student's risk tier (psychologist, admin).
 */
export async function overrideRiskTier(
  studentId: string,
  payload: RiskOverridePayload,
): Promise<RiskOverride> {
  return apiRequest<RiskOverride>("POST", `/risk-scores/override/${studentId}`, payload);
}
