import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface DaySchedule {
  day: string;
  start_time: string;
  end_time: string;
}

export interface BusyBlock {
  id: string;
  block_start: string;
  block_end: string;
  reason: string;
  created_at: string;
}

/**
 * Fetch the current user's weekly schedule
 */
export function useMySchedule(): UseQueryResult<DaySchedule[]> {
  return useQuery({
    queryKey: ["availability", "schedule"],
    queryFn: async () => {
      return apiRequest<DaySchedule[]>("GET", "/availability/schedule");
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    retry: 1,
  });
}

/**
 * Fetch busy blocks for the current user
 */
export function useBusyBlocks(): UseQueryResult<BusyBlock[]> {
  return useQuery({
    queryKey: ["availability", "busyBlocks"],
    queryFn: async () => {
      return apiRequest<BusyBlock[]>("GET", "/availability/busy-blocks");
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    retry: 1,
  });
}
