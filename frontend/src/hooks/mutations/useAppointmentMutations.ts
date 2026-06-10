import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface BookAppointmentPayload {
  psychologist_id: string;
  start_time: string;
  end_time: string;
  crisis_note?: string;
}

export interface UpdateAppointmentPayload {
  status?: string;
}

export interface AppointmentResponse {
  id: string;
  student_id: string;
  psychologist_id: string;
  start_time: string;
  end_time: string;
  status: string;
}

/**
 * Book a student appointment with a psychologist
 */
export function useBookAppointment(): UseMutationResult<AppointmentResponse, Error, BookAppointmentPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BookAppointmentPayload) => {
      return apiRequest<AppointmentResponse>("POST", "/appointments/book", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error: Error) => {
      console.error("Failed to book appointment:", error);
    },
  });
}

/**
 * Update an appointment (status, times, crisis_note)
 */
export function useUpdateAppointment(): UseMutationResult<AppointmentResponse, Error, { id: string; data: UpdateAppointmentPayload }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAppointmentPayload }) => {
      return apiRequest<AppointmentResponse>("PATCH", `/appointments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error: Error) => {
      console.error("Failed to update appointment:", error);
    },
  });
}

/**
 * Request an appointment (student submits request)
 */
export function useRequestAppointment(): UseMutationResult<AppointmentResponse, Error, BookAppointmentPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BookAppointmentPayload) => {
      return apiRequest<AppointmentResponse>("POST", "/appointments/request", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error: Error) => {
      console.error("Failed to request appointment:", error);
    },
  });
}

/**
 * Approve an appointment request (psychologist/admin only)
 */
export function useApproveAppointment(): UseMutationResult<AppointmentResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      return apiRequest<AppointmentResponse>("PATCH", `/appointments/${appointmentId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error: Error) => {
      console.error("Failed to approve appointment:", error);
    },
  });
}

/**
 * Cancel an appointment (student cancels their own)
 */
export function useCancelAppointment(): UseMutationResult<AppointmentResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      return apiRequest<AppointmentResponse>("PATCH", `/appointments/${appointmentId}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error: Error) => {
      console.error("Failed to cancel appointment:", error);
    },
  });
}

/**
 * Reject an appointment request (psychologist/admin only)
 */
export function useRejectAppointment(): UseMutationResult<AppointmentResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      return apiRequest<AppointmentResponse>("PATCH", `/appointments/${appointmentId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error: Error) => {
      console.error("Failed to reject appointment:", error);
    },
  });
}
