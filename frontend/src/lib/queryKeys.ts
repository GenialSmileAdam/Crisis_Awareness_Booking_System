/**
 * Central registry of top-level React Query key "domains".
 *
 * Every query hook keys off one of these roots (e.g. ["risk-scores", studentId]).
 * Because React Query matches by prefix, invalidating the root (["risk-scores"])
 * refreshes every query under it. Keeping the roots in one place lets the
 * invalidation map (see ./invalidation.ts) stay consistent and typo-free.
 */
export const QK = {
  analytics: "analytics",
  appointments: "appointments",
  availability: "availability",
  checkins: "checkins",
  feedback: "feedback",
  notifications: "notifications",
  public: "public",
  risk: "risk-scores",
  session: "session",
  studentSessions: "student-sessions",
  staff: "staff",
  students: "students",
  config: "config",
  clinical: "clinical",
  // Student self-service portal
  preferences: "me-preferences",
  goals: "me-goals",
  streak: "me-streak",
  safetyPlan: "me-safety-plan",
} as const;

export type QueryDomain = (typeof QK)[keyof typeof QK];
