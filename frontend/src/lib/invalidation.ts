import type { QueryClient } from "@tanstack/react-query";
import { QK, type QueryDomain } from "./queryKeys";

/**
 * Domain events describe "something changed" at a business level. Each event maps
 * to the FULL set of query domains it can affect, so a single mutation refreshes
 * every dependent view — not just the one screen it was triggered from.
 *
 * Example: a risk override doesn't only change one student's score — it moves the
 * cohort distribution, the alerts list, and the analytics charts. Firing the
 * "risk" event invalidates all of them at once.
 */
const INVALIDATION_MAP: Record<string, QueryDomain[]> = {
  // A new check-in recomputes WRS → tier → cohort → analytics, and advances
  // the student's check-in streak.
  checkin: [QK.checkins, QK.risk, QK.students, QK.analytics, QK.streak],

  // Student self-service portal.
  preferences: [QK.preferences],
  goals: [QK.goals],
  safetyPlan: [QK.safetyPlan, QK.clinical],

  // Manual risk override / recompute ripples into cohort, alerts, analytics.
  risk: [QK.risk, QK.students, QK.analytics],

  // Booking/approving/cancelling changes schedules, the student's session list,
  // counsellor/admin analytics, and triggers notifications.
  appointment: [
    QK.appointments,
    QK.studentSessions,
    QK.availability,
    QK.analytics,
    QK.notifications,
  ],

  // Saving an AI session / notes can also push a risk override and shows up in
  // the student's session history and analytics.
  session: [
    QK.session,
    QK.studentSessions,
    QK.appointments,
    QK.risk,
    QK.students,
    QK.analytics,
  ],

  // Clinical artefacts (care plan, safety plan, action items, referrals).
  clinical: [QK.clinical, QK.studentSessions, QK.students, QK.risk],

  // Student profile edits (clinical notes, assignment, activation).
  student: [QK.students, QK.studentSessions, QK.analytics],

  // Availability / schedule edits affect bookable slots.
  availability: [QK.availability, QK.appointments],

  staff: [QK.staff, QK.students],

  notifications: [QK.notifications],

  // System config (WRS thresholds, alert rules) re-derives every risk view.
  config: [QK.config, QK.public, QK.risk, QK.students, QK.analytics],
};

export type DomainEvent = keyof typeof INVALIDATION_MAP;

/**
 * Invalidate every query domain affected by one or more business events.
 * Call from a mutation's onSuccess, e.g. `invalidateOn(queryClient, "risk")`.
 */
export function invalidateOn(qc: QueryClient, ...events: DomainEvent[]): void {
  const domains = new Set<QueryDomain>();
  for (const event of events) {
    for (const domain of INVALIDATION_MAP[event] ?? []) {
      domains.add(domain);
    }
  }
  for (const domain of domains) {
    qc.invalidateQueries({ queryKey: [domain] });
  }
}
