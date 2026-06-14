import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { QK } from "@/lib/queryKeys";

// ── Types ───────────────────────────────────────────────────────────────────
export interface StudentPreferences {
  notifications: {
    checkin_reminders: boolean;
    appointment_reminders: boolean;
    forum_replies: boolean;
    resource_shares: boolean;
  };
  reminder_time: string;
  appearance: {
    reduced_motion: boolean;
    text_size: "sm" | "base" | "lg";
  };
  saved_resource_ids: string[];
}

export interface WellnessGoal {
  id: string;
  title: string;
  target: number;
  progress: number;
  status: "active" | "done" | "archived";
  created_at: string | null;
  updated_at: string | null;
}

export interface CheckinStreak {
  current: number;
  longest: number;
  total_days: number;
  checked_in_today: boolean;
}

export interface MySafetyPlan {
  id: string;
  student_id: string;
  warning_signs: string | null;
  coping_strategies: string | null;
  reasons_to_live: string | null;
  support_contacts: { name?: string; phone?: string }[];
  updated_at: string | null;
}

// ── Queries ─────────────────────────────────────────────────────────────────
export function usePreferences(enabled = true): UseQueryResult<StudentPreferences> {
  return useQuery({
    queryKey: [QK.preferences],
    queryFn: async () => apiRequest<StudentPreferences>("GET", "/me/preferences"),
    staleTime: 1000 * 60,
    enabled,
  });
}

export function useWellnessGoals(enabled = true): UseQueryResult<WellnessGoal[]> {
  return useQuery({
    queryKey: [QK.goals],
    queryFn: async () => apiRequest<WellnessGoal[]>("GET", "/me/goals"),
    staleTime: 1000 * 30,
    enabled,
  });
}

export function useCheckinStreak(enabled = true): UseQueryResult<CheckinStreak> {
  return useQuery({
    queryKey: [QK.streak],
    queryFn: async () => apiRequest<CheckinStreak>("GET", "/me/streak"),
    staleTime: 1000 * 60,
    enabled,
  });
}

export function useMySafetyPlan(enabled = true): UseQueryResult<MySafetyPlan | null> {
  return useQuery({
    queryKey: [QK.safetyPlan],
    queryFn: async () => apiRequest<MySafetyPlan | null>("GET", "/me/safety-plan"),
    staleTime: 1000 * 60,
    enabled,
  });
}
