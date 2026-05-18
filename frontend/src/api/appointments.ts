import { apiRequest } from "./client";
import type { PaginatedResponse } from "./types";

// ── Interfaces ──

export interface Appointment {
  id: string;
  student_id: string;
  psychologist_id: string;
  start_time: string;
  end_time: string;
  status: "booked" | "completed" | "cancelled" | "no_show";
  is_crisis: boolean;
  crisis_note: string | null;
  student_full_name: string;
  session_summary?: string;
  created_at: string;
}

export interface CreateAppointmentPayload {
  student_id: string;
  psychologist_id: string;
  scheduled_at: string;
  session_type: "in_person" | "virtual";
  notes?: string;
}

export interface AvailabilitySlot {
  psychologist_id: string;
  available_at: string;
  is_available: boolean;
}

// ── Appointment functions ──

/**
 * Create a new appointment (psychologist, admin).
 */
export async function createAppointment(
  payload: CreateAppointmentPayload,
): Promise<Appointment> {
  return apiRequest<Appointment>("POST", "/appointments", payload);
}

/**
 * List appointments with pagination (psychologist, admin).
 */
export async function listAppointments(
  limit?: number,
  offset?: number,
): Promise<PaginatedResponse<Appointment>> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set("limit", String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
  const qs = params.toString();
  return apiRequest<PaginatedResponse<Appointment>>(
    "GET",
    `/appointments${qs ? `?${qs}` : ""}`,
  );
}

/**
 * Get available time slots for a psychologist (all authenticated).
 */
export async function getAppointmentAvailability(
  psychologistId: string,
  date: string,
): Promise<string[]> {
  return apiRequest<string[]>(
    "GET",
    `/appointments/availability/${psychologistId}?date=${date}`,
  );
}

/**
 * Get a single appointment by ID (psychologist, admin).
 */
export async function getAppointment(id: string): Promise<Appointment> {
  return apiRequest<Appointment>("GET", `/appointments/${id}`);
}

/**
 * Partially update an appointment (psychologist, admin).
 */
export async function updateAppointment(
  id: string,
  payload: Partial<Appointment>,
): Promise<Appointment> {
  return apiRequest<Appointment>("PATCH", `/appointments/${id}`, payload);
}

/**
 * Delete an appointment (admin only).
 */
export async function deleteAppointment(id: string): Promise<void> {
  return apiRequest<void>("DELETE", `/appointments/${id}`);
}
