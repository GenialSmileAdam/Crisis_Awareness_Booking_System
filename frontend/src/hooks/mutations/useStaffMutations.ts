import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { invalidateOn } from "@/lib/invalidation";

export interface CreateStaffPayload {
  full_name: string;
  email: string;
  password: string;
  staff_id: string;
  specialty?: string;
}

export interface StaffResponse {
  id: string;
  user_id: string;
  name: string;
  email: string;
  staff_id: string;
  specialty?: string;
  created_at: string;
}

/**
 * Create a new staff member
 */
export function useCreateStaff(): UseMutationResult<StaffResponse, Error, CreateStaffPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStaffPayload) => {
      return apiRequest<StaffResponse>("POST", "/staff", data);
    },
    onSuccess: () => {
      invalidateOn(queryClient, "staff");
    },
    onError: (error: Error) => {
      console.error("Failed to create staff:", error);
    },
  });
}
