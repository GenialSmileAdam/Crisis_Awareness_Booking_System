import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { invalidateOn } from "@/lib/invalidation";

export interface RiskOverridePayload {
  override_tier: string;
  justification: string;
}

export interface RiskOverrideResponse {
  id: string;
  student_id: string;
  psychologist_id: string;
  override_tier: string;
  justification: string;
  created_at: string;
}

/**
 * Override a student's risk tier with justification
 */
export function useRiskOverride(): UseMutationResult<RiskOverrideResponse, Error, { studentId: string; payload: RiskOverridePayload }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, payload }: { studentId: string; payload: RiskOverridePayload }) => {
      return apiRequest<RiskOverrideResponse>(
        "POST",
        `/risk-scores/override/${studentId}`,
        payload
      );
    },
    onSuccess: () => {
      // A tier override moves the cohort distribution, alerts, and analytics.
      invalidateOn(queryClient, "risk");
    },
    onError: (error: Error) => {
      console.error("Failed to override risk score:", error);
    },
  });
}
