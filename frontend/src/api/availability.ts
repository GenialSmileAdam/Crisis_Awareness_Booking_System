import { apiRequest } from "./client";

export interface DaySchedule {
  id?: string;
  day_of_week: number; // 0=Mon … 6=Sun
  start_time: string;  // "HH:MM"
  end_time: string;    // "HH:MM"
  is_available: boolean;
}

export interface BusyBlock {
  id: string;
  block_start: string;
  block_end: string;
  reason: string | null;
}

export async function getMySchedule(): Promise<DaySchedule[]> {
  return apiRequest<DaySchedule[]>("GET", "/availability/me");
}

export async function setMySchedule(schedule: DaySchedule[]): Promise<{ days: number }> {
  return apiRequest<{ days: number }>("PUT", "/availability/me", { schedule });
}

export async function getBusyBlocks(includePast = false): Promise<BusyBlock[]> {
  return apiRequest<BusyBlock[]>("GET", `/availability/busy-blocks?include_past=${includePast}`);
}

export async function addBusyBlock(payload: {
  block_start: string;
  block_end: string;
  reason?: string;
}): Promise<BusyBlock> {
  return apiRequest<BusyBlock>("POST", "/availability/busy-blocks", payload);
}

export async function deleteBusyBlock(blockId: string): Promise<void> {
  return apiRequest<void>("DELETE", `/availability/busy-blocks/${blockId}`);
}
