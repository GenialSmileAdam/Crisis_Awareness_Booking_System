import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { QK } from "@/lib/queryKeys";

export interface CareGoal {
  text: string;
  done?: boolean;
}
export interface CarePlan {
  id: string;
  student_id: string;
  author_id: string | null;
  title: string;
  goals: CareGoal[];
  status: string;
  review_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportContact {
  name: string;
  phone?: string;
  relation?: string;
}
export interface SafetyPlan {
  id: string;
  student_id: string;
  warning_signs: string | null;
  coping_strategies: string | null;
  reasons_to_live: string | null;
  support_contacts: SupportContact[];
  updated_by: string | null;
  updated_at: string;
}

export interface ActionItem {
  id: string;
  session_id: string;
  student_id: string | null;
  text: string;
  done: boolean;
  due_date: string | null;
  source: string;
  created_at: string;
}

export interface Referral {
  id: string;
  student_id: string;
  session_id: string | null;
  referred_to: string;
  reason: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
}

export interface NoteTemplate {
  id: string;
  name: string;
  body: string;
}

const clinicalKey = (...parts: (string | undefined)[]) => [QK.clinical, ...parts];

export function useCarePlans(studentId: string | undefined): UseQueryResult<CarePlan[]> {
  return useQuery({
    queryKey: clinicalKey("care-plans", studentId),
    queryFn: async () => apiRequest<CarePlan[]>("GET", `/clinical/students/${studentId}/care-plans`),
    enabled: !!studentId,
  });
}

export function useSafetyPlan(studentId: string | undefined): UseQueryResult<SafetyPlan | null> {
  return useQuery({
    queryKey: clinicalKey("safety-plan", studentId),
    queryFn: async () => apiRequest<SafetyPlan | null>("GET", `/clinical/students/${studentId}/safety-plan`),
    enabled: !!studentId,
  });
}

export function useActionItems(sessionId: string | undefined | null): UseQueryResult<ActionItem[]> {
  return useQuery({
    queryKey: clinicalKey("action-items", sessionId ?? undefined),
    queryFn: async () => apiRequest<ActionItem[]>("GET", `/clinical/sessions/${sessionId}/action-items`),
    enabled: !!sessionId,
  });
}

export function useReferrals(studentId: string | undefined): UseQueryResult<Referral[]> {
  return useQuery({
    queryKey: clinicalKey("referrals", studentId),
    queryFn: async () => apiRequest<Referral[]>("GET", `/clinical/students/${studentId}/referrals`),
    enabled: !!studentId,
  });
}

export function useNoteTemplates(): UseQueryResult<NoteTemplate[]> {
  return useQuery({
    queryKey: clinicalKey("note-templates"),
    queryFn: async () => apiRequest<NoteTemplate[]>("GET", "/clinical/note-templates"),
    staleTime: 1000 * 60 * 60,
  });
}
