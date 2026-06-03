import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface TestSubmission {
  student_id: string;
  test_type: string;
  responses: Record<string, unknown>;
  score?: number;
}

export interface TestResultResponse {
  student_id: string;
  test_type: string;
  wrs_score: number;
  risk_tier: string;
}

/**
 * Submit a wellness check-in test (PHQ-9, GAD-7, or pulse)
 */
export function useSubmitCheckin(): UseMutationResult<TestResultResponse, Error, TestSubmission> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TestSubmission) => {
      return apiRequest<TestResultResponse>("POST", "/checkins/submit", data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
      queryClient.invalidateQueries({ queryKey: ["risk-scores", data.student_id] });
    },
    onError: (error: Error) => {
      console.error("Failed to submit check-in:", error);
    },
  });
}
