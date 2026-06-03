import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface ConsentRecord {
  id: string;
  student_id: string;
  monitoring_enabled: boolean;
  created_at: string;
}

/**
 * Submit consent preferences
 */
export function useSubmitConsent(): UseMutationResult<ConsentRecord, Error, boolean> {
  return useMutation({
    mutationFn: async (monitoringEnabled: boolean) => {
      return apiRequest<ConsentRecord>("POST", "/consent", { monitoring_enabled: monitoringEnabled });
    },
    onError: (error: Error) => {
      console.error("Failed to submit consent:", error);
    },
  });
}
