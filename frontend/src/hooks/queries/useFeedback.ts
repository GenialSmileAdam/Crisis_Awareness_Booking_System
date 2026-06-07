import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import type { PaginationInfo } from "@/api/types";

export interface FeedbackItem {
  id: string;
  name: string;
  email: string;
  message: string;
  rating: number | null;
  created_at: string;
}

export interface FeedbackResponse {
  data: FeedbackItem[];
  pagination: PaginationInfo;
}

/**
 * Fetch all feedback (admin/staff only)
 */
export function useFeedback(
  limit: number = 20,
  offset: number = 0
): UseQueryResult<FeedbackResponse> {
  return useQuery({
    queryKey: ["feedback", limit, offset],
    queryFn: async () => {
      return apiRequest<FeedbackResponse>(
        "GET",
        `/feedback?limit=${limit}&offset=${offset}`
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });
}
