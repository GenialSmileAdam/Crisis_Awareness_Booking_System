import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface ChartData {
  label: string;
  value: number;
  percentage?: number;
}

export interface AnalyticsCharts {
  [key: string]: ChartData[] | Record<string, unknown>;
}

export interface AnalyticsInsights {
  [key: string]: string;
}

export interface AnalyticsResponse {
  charts: AnalyticsCharts;
  insights?: AnalyticsInsights;
}

/**
 * Fetch real analytics data with insights
 */
export function useRealAnalytics(
  days: number = 30
): UseQueryResult<AnalyticsResponse> {
  return useQuery({
    queryKey: ["analytics", "real", days],
    queryFn: async () => {
      return apiRequest<AnalyticsResponse>(
        "GET",
        `/analytics/real-data?days=${days}`
      );
    },
    // Backend caches for 5 min; keep the dashboard live with light polling.
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 10,
    refetchInterval: 1000 * 60, // poll the KPI dashboard every minute
    retry: 1,
  });
}

/**
 * Fetch university-level analytics
 */
export function useUniversityAnalytics(): UseQueryResult<AnalyticsResponse> {
  return useQuery({
    queryKey: ["analytics", "university"],
    queryFn: async () => {
      return apiRequest<AnalyticsResponse>("GET", "/analytics/university");
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });
}

/**
 * Fetch department-level analytics
 */
export function useDepartmentAnalytics(
  departmentId: string
): UseQueryResult<AnalyticsResponse> {
  return useQuery({
    queryKey: ["analytics", "department", departmentId],
    queryFn: async () => {
      return apiRequest<AnalyticsResponse>(
        "GET",
        `/analytics/department/${departmentId}`
      );
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 30,
    retry: 1,
    enabled: !!departmentId,
  });
}

/**
 * Fetch summary report
 */
export function useSummaryReport(): UseQueryResult<AnalyticsResponse> {
  return useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: async () => {
      return apiRequest<AnalyticsResponse>("GET", "/analytics/summary-report");
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });
}
