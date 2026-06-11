import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { QK } from "@/lib/queryKeys";

export interface OrgInsights {
  caseload: { counselor: string; students: number }[];
  throughput: { counselor: string; completed: number }[];
  tier_movement: { improving: number; worsening: number; stable: number };
  attendance_trend: { week: string; completed: number; no_show: number; cancelled: number }[];
  crisis_resolution: { total: number; resolved: number; unresolved: number; avg_resolution_hours: number | null };
  window_days: number;
}

export function useOrgInsights(days: number = 30): UseQueryResult<OrgInsights> {
  return useQuery({
    queryKey: [QK.analytics, "org-insights", days],
    queryFn: async () => apiRequest<OrgInsights>("GET", `/analytics/org-insights?days=${days}`),
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
    retry: 1,
  });
}
