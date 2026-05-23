import { apiRequest } from "./client";

// ── AI session functions (no auth required) ──

/**
 * Create a new AI transcription session.
 */
export async function createAISession(data: {
  appointment_id: string;
  client_name: string;
  notes?: string;
}): Promise<{ id: string }> {
  return apiRequest<{ id: string }>("POST", "/ai/sessions", data);
}

/**
 * Upload an audio file for an AI session.
 * Uses raw fetch so the browser sets the multipart/form-data boundary correctly.
 */
export async function uploadSessionAudio(sessionId: string, file: File): Promise<any> {
  const token = localStorage.getItem("safespace_access_token");
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/ai/sessions/${sessionId}/audio`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      // Do NOT set Content-Type — let the browser set it with the boundary
    },
    body: formData,
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { message: err.detail || "Audio upload failed", status: res.status };
  }
  return res.json();
}

/**
 * Trigger transcription for an AI session.
 */
export async function transcribeSession(
  sessionId: string,
): Promise<{ session_id: string; transcript: string }> {
  return apiRequest<{ session_id: string; transcript: string }>(
    "POST",
    `/ai/transcribe/${sessionId}`,
  );
}

/**
 * Trigger summarisation for an AI session.
 */
export async function summariseSession(
  sessionId: string,
): Promise<{ session_id: string; summary: string; archetype: string }> {
  return apiRequest<{ session_id: string; summary: string; archetype: string }>(
    "POST",
    `/ai/summarise/${sessionId}`,
  );
}
