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
 */
export async function uploadSessionAudio(
  sessionId: string,
  file: File,
): Promise<{ session_id: string; audio_uploaded: boolean }> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<{ session_id: string; audio_uploaded: boolean }>(
    "POST",
    `/ai/sessions/${sessionId}/audio`,
    form,
  );
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
