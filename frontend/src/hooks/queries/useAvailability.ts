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
 * Placeholder hook - schedule is saved via POST /availability/schedule
 */
export function useMySchedule(): UseQueryResult<DaySchedule[]> {
  return useQuery({
    queryKey: ["availability", "schedule"],
    queryFn: async () => [],
    enabled: false,
  });
}

/**
 * Fetch busy blocks for the current user
 */
export function useBusyBlocks(): UseQueryResult<BusyBlock[]> {
  return useQuery({
    queryKey: ["availability", "busyBlocks"],
    queryFn: async () => [],
    enabled: false,
  });
}
