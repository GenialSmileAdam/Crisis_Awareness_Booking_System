import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface RiskScore {
  id: string;
  student_id: string;
  wrs_score: number;
  tier: string;
  computed_at: string;
}

export interface RiskOverride {
  id: string;
  student_id: string;
  psychologist_id: string;
  override_tier: string;
  justification: string;
  created_at: string;
}

export interface RiskAlert {
  student_id: string;
  full_name: string;
  faculty: string;
  wrs_score: number;
  tier: string;
  computed_at: string;
}

export interface RiskAlertsResponse {
  data: RiskAlert[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_next: boolean;
  };
}

export interface CohortData {
  group: string;
  green: number;
  amber: number;
  red: number;
  critical: number;
  average_wrs_score: number;
}

export interface StudentRiskDetail {
  current: RiskScore;
  trend: RiskScore[];
  override?: RiskOverride;
}

/**
 * Fetch risk score cohort analysis
 */
export function useRiskScoreCohort(
  groupBy: "department" | "year_group" = "department"
): UseQueryResult<CohortData[]> {
  return useQuery({
    queryKey: ["risk-scores", "cohort", groupBy],
    queryFn: async () => {
      return apiRequest<CohortData[]>(
        "GET",
        `/risk-scores/cohort?group_by=${groupBy}`
      );
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });
}

/**
 * Fetch risk score alerts with optional tier filter
 */
export function useRiskAlerts(
  limit: number = 20,
  offset: number = 0,
  tier?: string
): UseQueryResult<RiskAlertsResponse> {
  const params = new URLSearchParams();
  params.append("limit", String(limit));
  params.append("offset", String(offset));
  if (tier) {
    params.append("tier", tier);
  }

  return useQuery({
    queryKey: ["risk-scores", "alerts", limit, offset, tier],
    queryFn: async () => {
      return apiRequest<RiskAlertsResponse>(
        "GET",
        `/risk-scores/alerts?${params.toString()}`
      );
    },
    // Live triage surface — poll so new alerts surface without a manual reload.
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 30,
    refetchInterval: 1000 * 60,
    retry: 1,
  });
}

/**
 * Fetch critical and high-risk alerts (red and critical tiers)
 */
export function useCriticalRiskAlerts(
  limit: number = 50,
  offset: number = 0
): UseQueryResult<RiskAlertsResponse> {
  return useQuery({
    queryKey: ["risk-scores", "alerts-critical", limit, offset],
    queryFn: async () => {
      return apiRequest<RiskAlertsResponse>(
        "GET",
        `/risk-scores/alerts?limit=${limit}&offset=${offset}&tier=critical`
      );
    },
    // Crisis surface — poll aggressively so red/critical alerts appear fast.
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 30,
    refetchInterval: 1000 * 45,
    retry: 1,
  });
}

/**
 * Fetch WRS history for a student
 */
export function useStudentWrsHistory(
  studentId: string,
  days: number = 180
): UseQueryResult<RiskScore[]> {
  return useQuery({
    queryKey: ["risk-scores", "history", studentId, days],
    queryFn: async () => {
      return apiRequest<RiskScore[]>(
        "GET",
        `/risk-scores/history/${studentId}?days=${days}`
      );
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    retry: 1,
    enabled: !!studentId,
  });
}

/**
 * Fetch current risk score and trend for a student
 */
export function useStudentRiskScore(
  studentId: string
): UseQueryResult<StudentRiskDetail> {
  return useQuery({
    queryKey: ["risk-scores", studentId],
    queryFn: async () => {
      return apiRequest<StudentRiskDetail>(
        "GET",
        `/risk-scores/${studentId}`
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
    enabled: !!studentId,
  });
}
