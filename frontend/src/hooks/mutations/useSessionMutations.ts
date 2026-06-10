import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

/**
 * Update session psychologist notes (saved to Session.notes in DB)
 */
export function useUpdateSessionNotes(): UseMutationResult<
  { id: string; notes: string },
  Error,
  { sessionId: string; notes: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, notes }: { sessionId: string; notes: string }) => {
      return apiRequest<{ id: string; notes: string }>(
        "PATCH",
        `/ai/sessions/${sessionId}/notes`,
        { notes }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["student-sessions"] });
    },
    onError: (error: Error) => {
      console.error("Failed to save session notes:", error);
    },
  });
}

/**
 * Save clinical notes to student profile via PATCH /students/{id}
 */
export function useSaveStudentClinicalNotes(): UseMutationResult<
  void,
  Error,
  { studentId: string; clinical_notes: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, clinical_notes }: { studentId: string; clinical_notes: string }) => {
      await apiRequest("PATCH", `/students/${studentId}`, { clinical_notes });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["students", variables.studentId] });
    },
    onError: (error: Error) => {
      console.error("Failed to save clinical notes:", error);
    },
  });
}
