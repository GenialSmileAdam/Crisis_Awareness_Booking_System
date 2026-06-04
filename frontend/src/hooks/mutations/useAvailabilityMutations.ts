import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface DaySchedule {
  day: string;
  start_time: string;
  end_time: string;
}

export interface BusyBlockPayload {
  block_start: string;
  block_end: string;
  reason: string;
}

export interface BusyBlockResponse {
  id: string;
  block_start: string;
  block_end: string;
  reason: string;
  created_at: string;
}

/**
 * Save the user's weekly schedule
 */
export function useSaveSchedule(): UseMutationResult<{ success: boolean }, Error, DaySchedule[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: DaySchedule[]) => {
      return apiRequest<{ success: boolean }>("POST", "/availability/schedule", { schedule });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability", "schedule"] });
    },
    onError: (error: Error) => {
      console.error("Failed to save schedule:", error);
    },
  });
}

/**
 * Add a busy block to the schedule
 */
export function useAddBusyBlock(): UseMutationResult<BusyBlockResponse, Error, BusyBlockPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BusyBlockPayload) => {
      return apiRequest<BusyBlockResponse>("POST", "/availability/busy-blocks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability", "busyBlocks"] });
    },
    onError: (error: Error) => {
      console.error("Failed to add busy block:", error);
    },
  });
}

/**
 * Delete a busy block
 */
export function useDeleteBusyBlock(): UseMutationResult<{ success: boolean }, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockId: string) => {
      return apiRequest<{ success: boolean }>("DELETE", `/availability/busy-blocks/${blockId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability", "busyBlocks"] });
    },
    onError: (error: Error) => {
      console.error("Failed to delete busy block:", error);
    },
  });
}
