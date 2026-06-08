import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface AISessionResponse {
  id: string;
  appointment_id: string;
  session_status: string;
  transcript?: string;
  summary?: string;
  created_at: string;
}

/**
 * Create an AI session for an appointment
 */
export function useCreateAISession(): UseMutationResult<AISessionResponse, Error, { appointment_id: string; client_name: string; notes: string }> {
  return useMutation({
    mutationFn: async (data: { appointment_id: string; client_name: string; notes: string }) => {
      return apiRequest<AISessionResponse>("POST", "/ai/sessions", data);
    },
    onError: (error: Error) => {
      console.error("Failed to create AI session:", error);
    },
  });
}

/**
 * Upload audio to an AI session
 */
export function useUploadSessionAudio(): UseMutationResult<AISessionResponse, Error, { sessionId: string; audioFile: File }> {
  return useMutation({
    mutationFn: async ({ sessionId, audioFile }: { sessionId: string; audioFile: File }) => {
      const formData = new FormData();
      formData.append("file", audioFile);
      return apiRequest<AISessionResponse>("POST", `/ai/sessions/${sessionId}/audio`, formData);
    },
    onError: (error: Error) => {
      console.error("Failed to upload audio:", error);
    },
  });
}

/**
 * Transcribe audio in an AI session
 */
export function useTranscribeSession(): UseMutationResult<AISessionResponse, Error, string> {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest<AISessionResponse>("POST", `/ai/transcribe/${sessionId}`, {});
    },
    onError: (error: Error) => {
      console.error("Failed to transcribe session:", error);
    },
  });
}

/**
 * Generate or regenerate summary for an AI session
 */
export function useSummariseSession(): UseMutationResult<AISessionResponse, Error, string> {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest<AISessionResponse>("POST", `/ai/summarise/${sessionId}`, {});
    },
    onError: (error: Error) => {
      console.error("Failed to summarise session:", error);
    },
  });
}
