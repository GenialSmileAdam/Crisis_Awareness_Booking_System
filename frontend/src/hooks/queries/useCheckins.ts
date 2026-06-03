import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface WellnessCheckin {
  id: string;
  student_id: string;
  type: string;
  responses: Record<string, unknown>;
  score?: number;
  submitted_at: string;
}

export interface PendingCheckin {
  type: string;
  message: string;
}

export interface CheckinResponse {
  data: WellnessCheckin[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_next: boolean;
  };
}

/**
 * Fetch pending check-ins for the current student
 */
export function usePendingCheckins(): UseQueryResult<PendingCheckin[]> {
  return useQuery({
    queryKey: ["checkins", "pending"],
    queryFn: async () => {
      return apiRequest<PendingCheckin[]>("GET", "/checkins/pending");
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    retry: 1,
  });
}

/**
 * Fetch check-in history for a specific student
 */
export function useStudentCheckins(
  studentId: string,
  limit: number = 10,
  offset: number = 0
): UseQueryResult<CheckinResponse> {
  return useQuery({
    queryKey: ["checkins", "student", studentId, limit, offset],
    queryFn: async () => {
      return apiRequest<CheckinResponse>(
        "GET",
        `/checkins/student/${studentId}?limit=${limit}&offset=${offset}`
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
    enabled: !!studentId,
  });
}
