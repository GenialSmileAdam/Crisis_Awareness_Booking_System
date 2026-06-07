import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

/**
 * Admin: Send password reset email to staff member
 */
export function useAdminResetPassword(): UseMutationResult<{ message: string }, Error, string> {
  return useMutation({
    mutationFn: async (staffId: string) => {
      const response = await apiRequest<{ success: boolean; data: null }>(
        "POST",
        "/api/auth/admin/reset-staff-password",
        { staff_id: staffId }
      );
      return { message: `Password reset link sent` };
    },
    onError: (error: Error) => {
      console.error("Failed to send password reset:", error);
    },
  });
}

/**
 * User: Request password reset email
 */
export function useRequestPasswordReset(): UseMutationResult<{ message: string }, Error, string> {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest<{ success: boolean; data: null }>(
        "POST",
        "/api/auth/request-password-reset",
        { email }
      );
      return { message: "Password reset link sent if account exists" };
    },
    onError: (error: Error) => {
      console.error("Failed to request password reset:", error);
    },
  });
}

/**
 * Reset password with token
 */
export function useResetPassword(): UseMutationResult<{ message: string }, Error, { token: string; new_password: string }> {
  return useMutation({
    mutationFn: async (data: { token: string; new_password: string }) => {
      const response = await apiRequest<{ success: boolean; data: null }>(
        "POST",
        "/api/auth/reset-password",
        data
      );
      return { message: "Password reset successfully" };
    },
    onError: (error: Error) => {
      console.error("Failed to reset password:", error);
    },
  });
}
