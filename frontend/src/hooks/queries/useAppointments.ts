import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import type { Appointment } from "@/api/appointments";

export type { Appointment };

export interface AvailableSlot {
  psychologist_id: string;
  start_time: string;
  end_time: string;
  psychologist_name: string;
}

export interface AppointmentsResponse {
  data: Appointment[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_next: boolean;
  };
}

interface AppointmentFilters {
  psychologist_id?: string;
  student_id?: string;
  status?: string;
  is_crisis?: boolean;
  start_date?: string;
  end_date?: string;
}

/**
 * Fetch all appointments with optional filters
 */
export function useAppointments(
  filters: AppointmentFilters = {},
  limit: number = 20,
  offset: number = 0
): UseQueryResult<AppointmentsResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  params.append("limit", String(limit));
  params.append("offset", String(offset));

  return useQuery({
    queryKey: ["appointments", filters, limit, offset],
    queryFn: async () => {
      return apiRequest<AppointmentsResponse>(
        "GET",
        `/appointments?${params.toString()}`
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });
}

/**
 * Fetch student's appointments
 */
export function useStudentAppointments(
  studentId: string,
  limit: number = 20,
  offset: number = 0
): UseQueryResult<AppointmentsResponse> {
  return useQuery({
    queryKey: ["appointments", "student", studentId, limit, offset],
    queryFn: async () => {
      return apiRequest<AppointmentsResponse>(
        "GET",
        `/appointments?student_id=${studentId}&limit=${limit}&offset=${offset}`
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
    enabled: !!studentId,
  });
}

/**
 * Fetch next available appointment slot
 */
export function useNextAvailableSlot(): UseQueryResult<AvailableSlot | null> {
  return useQuery({
    queryKey: ["appointments", "next-available"],
    queryFn: async () => {
      return apiRequest<AvailableSlot | null>("GET", "/appointments/next-available");
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    retry: 1,
  });
}

/**
 * Fetch a single appointment by ID
 */
export function useAppointment(
  appointmentId: string
): UseQueryResult<Appointment> {
  return useQuery({
    queryKey: ["appointments", appointmentId],
    queryFn: async () => {
      return apiRequest<Appointment>("GET", `/appointments/${appointmentId}`);
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    retry: 1,
    enabled: !!appointmentId,
  });
}

/**
 * Fetch available time slots for a psychologist on a specific date
 */
export function useAppointmentAvailability(
  psychologistId: string,
  date: string
): UseQueryResult<string[]> {
  return useQuery({
    queryKey: ["appointments", "availability", psychologistId, date],
    queryFn: async () => {
      return apiRequest<string[]>(
        "GET",
        `/appointments/availability/${psychologistId}?date=${date}`
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
    enabled: !!psychologistId && !!date,
  });
}
