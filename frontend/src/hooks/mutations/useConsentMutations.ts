import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { invalidateOn } from "@/lib/invalidation";

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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (monitoringEnabled: boolean) => {
      return apiRequest<ConsentRecord>("POST", "/consent", { monitoring_enabled: monitoringEnabled });
    },
    onSuccess: () => {
      invalidateOn(queryClient, "student");
    },
    onError: (error: Error) => {
      console.error("Failed to submit consent:", error);
    },
  });
}
