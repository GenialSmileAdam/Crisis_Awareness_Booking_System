import { apiRequest } from "./client";
import type { PaginatedResponse } from "./types";

// ── Interfaces ──

export interface Staff {
  user_id: string;
  staff_id: string;
  full_name: string;
  email: string;
  specialty: string;
  staff_type: string;
  specialization?: string;
  is_available_now?: boolean;
  created_at: string;
}

export interface CreateStaffPayload {
  full_name: string;
  email: string;
  password: string;
  staff_id: string;
  specialty: string;
}

// ── Staff functions ──

/**
 * Create a new staff member (admin only).
 */
export async function createStaff(payload: CreateStaffPayload): Promise<Staff> {
  return apiRequest<Staff>("POST", "/staff", payload);
}

/**
 * List all staff with pagination (admin only).
 */
export async function listStaff(
  limit?: number,
  offset?: number,
): Promise<PaginatedResponse<Staff>> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set("limit", String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
  const qs = params.toString();
  return apiRequest<PaginatedResponse<Staff>>(
    "GET",
    `/staff${qs ? `?${qs}` : ""}`,
  );
}

/**
 * List all psychologists (admin, staff).
 */
export async function listPsychologists(): Promise<Staff[]> {
  return apiRequest<Staff[]>("GET", "/psychologists");
}

/**
 * Get a single staff member by ID (admin, self).
 */
export async function getStaff(id: string): Promise<Staff> {
  return apiRequest<Staff>("GET", `/staff/${id}`);
}

/**
 * Partially update a staff record (admin, self).
 */
export async function updateStaff(
  id: string,
  payload: Partial<Staff>,
): Promise<Staff> {
  return apiRequest<Staff>("PATCH", `/staff/${id}`, payload);
}

/**
 * Delete a staff member (admin only).
 */
export async function deleteStaff(id: string): Promise<void> {
  return apiRequest<void>("DELETE", `/staff/${id}`);
}
