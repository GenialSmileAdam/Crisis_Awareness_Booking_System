import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { invalidateOn } from "@/lib/invalidation";
import type { CarePlan, SafetyPlan, ActionItem, Referral, CareGoal, SupportContact } from "@/hooks/queries/useClinical";

// ── Care plans ──
export function useCreateCarePlan(): UseMutationResult<CarePlan, Error, { studentId: string; title: string; goals?: CareGoal[]; review_date?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, ...body }) => apiRequest<CarePlan>("POST", `/clinical/students/${studentId}/care-plans`, body),
    onSuccess: () => invalidateOn(qc, "clinical"),
  });
}

export function useUpdateCarePlan(): UseMutationResult<CarePlan, Error, { planId: string; title?: string; goals?: CareGoal[]; status?: string; review_date?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, ...body }) => apiRequest<CarePlan>("PATCH", `/clinical/care-plans/${planId}`, body),
    onSuccess: () => invalidateOn(qc, "clinical"),
  });
}

// ── Safety plan ──
export function useUpsertSafetyPlan(): UseMutationResult<
  SafetyPlan, Error,
  { studentId: string; warning_signs?: string; coping_strategies?: string; reasons_to_live?: string; support_contacts?: SupportContact[] }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, ...body }) => apiRequest<SafetyPlan>("PUT", `/clinical/students/${studentId}/safety-plan`, body),
    onSuccess: () => invalidateOn(qc, "clinical"),
  });
}

// ── Action items ──
export function useCreateActionItem(): UseMutationResult<ActionItem, Error, { sessionId: string; text: string; student_id?: string; due_date?: string; source?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, ...body }) => apiRequest<ActionItem>("POST", `/clinical/sessions/${sessionId}/action-items`, body),
    onSuccess: () => invalidateOn(qc, "clinical"),
  });
}

export function useUpdateActionItem(): UseMutationResult<ActionItem, Error, { itemId: string; done?: boolean; text?: string; due_date?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, ...body }) => apiRequest<ActionItem>("PATCH", `/clinical/action-items/${itemId}`, body),
    onSuccess: () => invalidateOn(qc, "clinical"),
  });
}

/** AI-suggest action items from a session (non-persisting) — returns a list of strings. */
export function useSuggestActionItems(): UseMutationResult<string[], Error, string> {
  return useMutation({
    mutationFn: (sessionId: string) => apiRequest<string[]>("POST", `/clinical/sessions/${sessionId}/action-items/suggest`, {}),
  });
}

// ── Referrals ──
export function useCreateReferral(): UseMutationResult<Referral, Error, { studentId: string; referred_to: string; reason?: string; session_id?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, ...body }) => apiRequest<Referral>("POST", `/clinical/students/${studentId}/referrals`, body),
    onSuccess: () => invalidateOn(qc, "clinical"),
  });
}

export function useUpdateReferral(): UseMutationResult<Referral, Error, { referralId: string; status?: string; reason?: string; referred_to?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ referralId, ...body }) => apiRequest<Referral>("PATCH", `/clinical/referrals/${referralId}`, body),
    onSuccess: () => invalidateOn(qc, "clinical"),
  });
}

// ── Resource sharing ──
export function useShareResource(): UseMutationResult<{ student_id: string; title: string }, Error, { studentId: string; title: string; message?: string; url?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, ...body }) => apiRequest<{ student_id: string; title: string }>("POST", `/clinical/students/${studentId}/share-resource`, body),
    onSuccess: () => invalidateOn(qc, "notifications"),
  });
}

// ── Follow-up scheduling (notification + Campus One calendar event) ──
export function useScheduleFollowUp(): UseMutationResult<
  { student_id: string; title: string; starts_at: string }, Error,
  { studentId: string; title: string; starts_at: string; ends_at?: string; note?: string; session_id?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, ...body }) => apiRequest("POST", `/clinical/students/${studentId}/follow-up`, body),
    onSuccess: () => invalidateOn(qc, "clinical", "notifications", "appointment"),
  });
}
