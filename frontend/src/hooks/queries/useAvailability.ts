import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getMySchedule, getBusyBlocks } from "@/api/availability";
import type { DaySchedule, BusyBlock } from "@/api/availability";
import { useAuth } from "@/context/AuthContext";

export type { DaySchedule, BusyBlock };

export function useMySchedule(): UseQueryResult<DaySchedule[]> {
  const { user } = useAuth();
  const isStaff = user?.roles?.some(r => r === "psychologist" || r === "unit_head");
  return useQuery({
    queryKey: ["availability", "schedule"],
    queryFn: getMySchedule,
    enabled: !!isStaff,
  });
}

export function useBusyBlocks(): UseQueryResult<BusyBlock[]> {
  const { user } = useAuth();
  const isStaff = user?.roles?.some(r => r === "psychologist" || r === "unit_head");
  return useQuery({
    queryKey: ["availability", "busyBlocks"],
    queryFn: () => getBusyBlocks(false),
    enabled: !!isStaff,
  });
}
