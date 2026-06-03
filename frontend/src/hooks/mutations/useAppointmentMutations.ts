import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface BookAppointmentPayload {
  psychologist_id: string;
  start_time: string;
  end_time: string;
  notes?: string;
}

export interface UpdateAppointmentPayload {
  status?: string;
  pending_approval?: boolean;
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
 * Update an appointment (status, pending_approval, etc.)
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
