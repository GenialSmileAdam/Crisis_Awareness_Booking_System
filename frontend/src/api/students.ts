import { apiRequest } from "./client";
import type { PaginatedResponse } from "./types";

// ── Interfaces ──

export interface Student {
  student_id: string;
  full_name: string;
  email: string;
  faculty?: string;
  class_level?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  guidance_counselor?: string;
  crisis_flag?: boolean;
  assigned_psychologist_id?: string;
  created_at: string;
}

// ── Student functions ──

/**
 * List all students with pagination (admin, psychologist).
 */
export async function listStudents(
  limit?: number,
  offset?: number,
): Promise<PaginatedResponse<Student>> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set("limit", String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
  const qs = params.toString();
  return apiRequest<PaginatedResponse<Student>>(
    "GET",
    `/students${qs ? `?${qs}` : ""}`,
  );
}

/**
 * Search students by student ID (admin, psychologist).
 */
export async function searchStudents(studentId: string): Promise<Student[]> {
  const params = new URLSearchParams({ student_id: studentId });
  return apiRequest<Student[]>("GET", `/students/search?${params}`);
}

/**
 * Get a single student by ID (admin, psychologist).
 */
export async function getStudent(id: string): Promise<Student> {
  return apiRequest<Student>("GET", `/students/${id}`);
}

/**
 * Partially update a student record (admin, psychologist).
 */
export async function updateStudent(
  id: string,
  payload: Partial<Student>,
): Promise<Student> {
  return apiRequest<Student>("PATCH", `/students/${id}`, payload);
}

/**
 * Delete a student (admin only).
 */
export async function deleteStudent(id: string): Promise<void> {
  return apiRequest<void>("DELETE", `/students/${id}`);
}

/**
 * Bulk-upload students via CSV (admin, psychologist).
 */
export async function uploadStudentsCSV(
  file: File,
): Promise<{ created: number; failed: number }> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<{ created: number; failed: number }>(
    "POST",
    "/students/upload-csv",
    form,
  );
}

/**
 * Get sessions associated with a student (admin, psychologist).
 */
export async function getStudentSessions(id: string): Promise<any[]> {
  return apiRequest<any[]>("GET", `/students/${id}/sessions`);
}

/**
 * Get crisis logs for a student (admin, psychologist).
 */
export async function getStudentCrisisLogs(id: string): Promise<any[]> {
  return apiRequest<any[]>("GET", `/students/${id}/crisis-logs`);
}
