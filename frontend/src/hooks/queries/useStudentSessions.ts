import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface StudentSession {
  appointment_id: string;
  start_time: string;
  end_time: string;
  status: string;
  is_crisis: boolean;
  booking_source: string | null;
  crisis_note: string | null;
  session_id: string | null;
  session_summary: string | null;
  session_notes: string | null;
  session_transcript: string | null;
}

export interface SessionDetail {
  id: string;
  appointment_id: string;
  client_name: string | null;
  notes: string | null;
  status: string;
  audio_files: any[];
  transcript: string | null;
  summary: string | null;
  created_at: string;
}

export interface StudentSessionsResponse {
  data: StudentSession[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_next: boolean;
  };
}

/**
 * Fetch a student's sessions (appointments with session AI data joined)
 */
export function useStudentSessions(
  studentId: string,
  limit: number = 50,
  offset: number = 0
): UseQueryResult<StudentSessionsResponse> {
  return useQuery({
    queryKey: ["student-sessions", studentId, limit, offset],
    queryFn: async () => {
      return apiRequest<StudentSessionsResponse>(
        "GET",
        `/students/${studentId}/sessions?limit=${limit}&offset=${offset}`
      );
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    enabled: !!studentId,
  });
}

/**
 * Fetch a session by its linked appointment ID
 */
export function useSessionByAppointment(
  appointmentId: string | null | undefined
): UseQueryResult<SessionDetail | null> {
  return useQuery({
    queryKey: ["session", "by-appointment", appointmentId],
    queryFn: async () => {
      return apiRequest<SessionDetail | null>(
        "GET",
        `/ai/sessions/by-appointment/${appointmentId}`
      );
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    enabled: !!appointmentId,
  });
}
