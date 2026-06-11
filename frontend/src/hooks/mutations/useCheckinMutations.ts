import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { invalidateOn } from "@/lib/invalidation";

export interface CheckinSubmission {
  student_id: string;
  type: string;             // "pulse" | "phq9" | "gad7"
  responses: Record<string, number>;
  score?: number | null;
}

export interface CheckinSubmitResult {
  student_id: string;
  test_type: string;
  wrs_score: number;
  risk_tier: string;
  crisis_escalation_required?: boolean;
}

/**
 * Submit a wellness check-in (PHQ-9, GAD-7, or pulse).
 * Maps frontend { type } → backend { test_type }.
 */
export function useSubmitCheckin(): UseMutationResult<CheckinSubmitResult, Error, CheckinSubmission> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CheckinSubmission) => {
      return apiRequest<CheckinSubmitResult>("POST", "/checkins/submit", {
        student_id: data.student_id,
        test_type: data.type,       // backend field name is test_type
        responses: data.responses,
        score: data.score ?? null,
      });
    },
    onSuccess: () => {
      // A check-in recomputes WRS → tier → cohort → analytics.
      invalidateOn(queryClient, "checkin");
    },
    onError: (error: Error) => {
      console.error("Failed to submit check-in:", error);
    },
  });
}
