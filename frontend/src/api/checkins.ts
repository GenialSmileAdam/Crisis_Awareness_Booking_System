import { apiRequest } from "./client";
import type { PaginatedResponse } from "./types";

export type CheckinType = "pulse" | "phq9" | "gad7" | "event_triggered" | "crisis";

export interface CheckinSubmit {
  student_id: string;
  type: CheckinType;
  responses: Record<string, number>;
  score?: number | null;
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

export async function submitCheckin(payload: CheckinSubmit): Promise<CheckinResponse> {
  return apiRequest<CheckinResponse>("POST", "/checkins/submit", {
    student_id: payload.student_id,
    test_type: payload.type,
    responses: payload.responses,
    score: payload.score ?? null,
  });
}

export async function getPendingCheckins(): Promise<PendingCheckin[]> {
  return apiRequest<PendingCheckin[]>("GET", "/checkins/pending");
}

export async function getStudentCheckins(
  studentId: string,
  limit = 10,
  offset = 0,
): Promise<PaginatedResponse<CheckinRecord>> {
  return apiRequest<PaginatedResponse<CheckinRecord>>(
    "GET",
    `/checkins/student/${studentId}?limit=${limit}&offset=${offset}`,
  );
}
