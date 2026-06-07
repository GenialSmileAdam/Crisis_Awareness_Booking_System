import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface CrisisHotlineConfig {
  number: string;
  name: string;
  description: string;
}

/**
 * Fetch crisis hotline configuration (public, no auth required)
 */
export function useCrisisHotlineConfig(): UseQueryResult<CrisisHotlineConfig> {
  return useQuery({
    queryKey: ["public", "crisis-hotline"],
    queryFn: async () => {
      return apiRequest<CrisisHotlineConfig>("GET", "/api/public/crisis-hotline");
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 1,
  });
}
