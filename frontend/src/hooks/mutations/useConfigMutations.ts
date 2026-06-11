import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { invalidateOn } from "@/lib/invalidation";
import type { AdminConfig } from "@/hooks/queries/useConfig";

export type ConfigPatch = Partial<{
  wrs: Partial<AdminConfig["wrs"]>;
  alerts: Partial<AdminConfig["alerts"]>;
  assignment: Partial<AdminConfig["assignment"]>;
}>;

/**
 * Update system config (admin only). A config change re-derives risk views
 * everywhere, so it invalidates the broad "config" domain.
 */
export function useUpdateConfig(): UseMutationResult<AdminConfig, Error, ConfigPatch> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ConfigPatch) =>
      apiRequest<AdminConfig>("PATCH", "/config/admin", patch),
    onSuccess: () => {
      invalidateOn(queryClient, "config");
    },
    onError: (error: Error) => {
      console.error("Failed to update config:", error);
    },
  });
}
