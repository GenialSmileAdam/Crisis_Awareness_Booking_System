import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { invalidateOn } from "@/lib/invalidation";
import type { StudentPreferences, WellnessGoal, MySafetyPlan } from "@/hooks/queries/useStudentPortal";

export type PreferencesPatch = Partial<{
  notifications: Partial<StudentPreferences["notifications"]>;
  reminder_time: string;
  appearance: Partial<StudentPreferences["appearance"]>;
  saved_resource_ids: string[];
}>;

export function useUpdatePreferences(): UseMutationResult<StudentPreferences, Error, PreferencesPatch> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: PreferencesPatch) =>
      apiRequest<StudentPreferences>("PATCH", "/me/preferences", patch),
    onSuccess: () => invalidateOn(qc, "preferences"),
    onError: (e: Error) => console.error("Failed to update preferences:", e),
  });
}

export function useToggleSavedResource(): UseMutationResult<StudentPreferences, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (resourceId: string) =>
      apiRequest<StudentPreferences>("POST", `/me/saved-resources/${resourceId}`),
    onSuccess: () => invalidateOn(qc, "preferences"),
    onError: (e: Error) => console.error("Failed to toggle saved resource:", e),
  });
}

export function useCreateGoal(): UseMutationResult<WellnessGoal, Error, { title: string; target?: number }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => apiRequest<WellnessGoal>("POST", "/me/goals", body),
    onSuccess: () => invalidateOn(qc, "goals"),
    onError: (e: Error) => console.error("Failed to create goal:", e),
  });
}

export function useUpdateGoal(): UseMutationResult<
  WellnessGoal,
  Error,
  { id: string; title?: string; target?: number; progress?: number; status?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }) => apiRequest<WellnessGoal>("PATCH", `/me/goals/${id}`, body),
    onSuccess: () => invalidateOn(qc, "goals"),
    onError: (e: Error) => console.error("Failed to update goal:", e),
  });
}

export function useDeleteGoal(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiRequest<void>("DELETE", `/me/goals/${id}`),
    onSuccess: () => invalidateOn(qc, "goals"),
    onError: (e: Error) => console.error("Failed to delete goal:", e),
  });
}

export function useSaveSafetyPlan(): UseMutationResult<MySafetyPlan, Error, Partial<MySafetyPlan>> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => apiRequest<MySafetyPlan>("PUT", "/me/safety-plan", body),
    onSuccess: () => invalidateOn(qc, "safetyPlan"),
    onError: (e: Error) => console.error("Failed to save safety plan:", e),
  });
}
