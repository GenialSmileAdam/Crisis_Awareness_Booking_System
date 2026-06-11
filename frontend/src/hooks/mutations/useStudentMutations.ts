import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { invalidateOn } from "@/lib/invalidation";

export interface StudentStatusResponse {
  student_id: string;
  is_active: boolean;
  updated_at: string;
}

/**
 * Deactivate a student
 */
export function useDeactivateStudent(): UseMutationResult<StudentStatusResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentId: string) => {
      return apiRequest<StudentStatusResponse>("POST", `/students/${studentId}/deactivate`, {});
    },
    onSuccess: () => {
      invalidateOn(queryClient, "student");
    },
    onError: (error: Error) => {
      console.error("Failed to deactivate student:", error);
    },
  });
}

/**
 * Activate a student
 */
export function useActivateStudent(): UseMutationResult<StudentStatusResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentId: string) => {
      return apiRequest<StudentStatusResponse>("POST", `/students/${studentId}/activate`, {});
    },
    onSuccess: () => {
      invalidateOn(queryClient, "student");
    },
    onError: (error: Error) => {
      console.error("Failed to activate student:", error);
    },
  });
}
