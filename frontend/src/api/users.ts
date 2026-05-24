import { apiRequest } from "./client";
import type { PaginatedResponse } from "./types";

// ── Interfaces ──

export interface UserProfile {
  full_name: string;
  faculty?: string;
  class_level?: string;
  staff_type?: string;
  specialization?: string;
}

export interface User {
  id: string;
  email: string;
  user_type: "student" | "staff";
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  student_profile?: UserProfile;
  staff_profile?: UserProfile;
}

export interface CreateUserPayload {
  email: string;
  password?: string;
  user_type: "student" | "staff";
  is_admin?: boolean;
  profile: UserProfile;
}

// ── User functions ──

/**
 * Create a new user and linked profile (admin only).
 */
export async function createUser(payload: CreateUserPayload): Promise<User> {
  return apiRequest<User>("POST", "/users", payload);
}

/**
 * List all users (admin only).
 */
export async function listUsers(
  limit?: number,
  offset?: number,
): Promise<PaginatedResponse<User>> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set("limit", String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
  const qs = params.toString();
  return apiRequest<PaginatedResponse<User>>(
    "GET",
    `/users${qs ? `?${qs}` : ""}`,
  );
}

/**
 * Get a single user by ID (admin or self).
 */
export async function getUser(userId: string): Promise<User> {
  return apiRequest<User>("GET", `/users/${userId}`);
}

/**
 * Update a user (admin or self).
 */
export async function updateUser(
  userId: string,
  payload: Partial<User>,
): Promise<User> {
  return apiRequest<User>("PATCH", `/users/${userId}`, payload);
}

/**
 * Change user password (admin or self).
 */
export async function changePassword(
  userId: string,
  payload: { password?: string; new_password?: string },
): Promise<void> {
  return apiRequest<void>("PATCH", `/users/${userId}/password`, payload);
}
