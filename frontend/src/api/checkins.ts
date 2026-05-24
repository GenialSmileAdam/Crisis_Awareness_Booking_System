// ── Check-in API disabled — backend endpoints are temporarily offline ──
// All functions return static/empty data. No network calls are made.

import type { PaginatedResponse } from "./types";

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

export async function submitCheckin(_payload: CheckinSubmit): Promise<CheckinResponse> {
  return Promise.resolve({
    id: "",
    student_id: "",
    type: _payload.type,
    responses: _payload.responses,
    score: null,
    severity_label: null,
    submitted_at: new Date().toISOString(),
    crisis_escalation_required: false,
  });
}

export async function getPendingCheckins(): Promise<PendingCheckin[]> {
  return Promise.resolve([]);
}

export async function getStudentCheckins(
  _studentId: string,
  _limit?: number,
  _offset?: number,
): Promise<PaginatedResponse<CheckinRecord>> {
  return Promise.resolve({
    data: [],
    pagination: { total: 0, limit: _limit ?? 10, offset: _offset ?? 0, has_next: false },
  });
}
