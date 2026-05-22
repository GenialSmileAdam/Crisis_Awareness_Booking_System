import { apiRequest } from "./client";
import type { PaginatedResponse } from "./types";

// ── Interfaces ──

export type CheckinType = "pulse" | "phq9" | "gad7" | "event_triggered" | "crisis";

export interface CheckinSubmit {
  type: CheckinType;
  responses: Record<string, number>;
}

export interface CheckinResponse {
  id: string;
  student_id: string;
  type: CheckinType;
  responses: Record<string, number>;
  score: number | null;
  severity_label: string | null;
  submitted_at: string;
  crisis_escalation_required: boolean;
}

export interface PendingCheckin {
  type: CheckinType;
  message: string;
}

export interface CheckinRecord {
  id: string;
  student_id: string;
  type: CheckinType;
  responses: Record<string, number>;
  score: number | null;
  severity_label: string | null;
  submitted_at: string;
}

// ── Check-in functions ──

/**
 * Submit a new check-in (student only).
 */
export async function submitCheckin(payload: CheckinSubmit): Promise<CheckinResponse> {
  return apiRequest<CheckinResponse>("POST", "/checkins/submit", payload);
}

/**
 * Get pending check-ins for the current student.
 */
export async function getPendingCheckins(): Promise<PendingCheckin[]> {
  const token = localStorage.getItem("safespace_access_token");
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const res = await fetch(`${BASE_URL}/checkins/pending`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw { message: "Failed to fetch pending checkins", status: res.status };
  }

  const data = await res.json();

  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return [];
}

/**
 * Get paginated check-in history for a specific student.
 * Accessible by admin, psychologist, or the student themselves.
 */
export async function getStudentCheckins(
  studentId: string,
  limit?: number,
  offset?: number,
): Promise<PaginatedResponse<CheckinRecord>> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set("limit", String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
  const qs = params.toString();
  return apiRequest<PaginatedResponse<CheckinRecord>>(
    "GET",
    `/checkins/student/${studentId}${qs ? `?${qs}` : ""}`,
  );
}
