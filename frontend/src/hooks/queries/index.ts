export {
  usePendingCheckins,
  useStudentCheckins,
  type WellnessCheckin,
  type PendingCheckin,
  type CheckinResponse,
} from "./useCheckins";

export {
  useAppointments,
  useStudentAppointments,
  useNextAvailableSlot,
  useAppointment,
  useAppointmentAvailability,
  useWeekAvailability,
  type Appointment,
  type AvailableSlot,
  type AppointmentsResponse,
} from "./useAppointments";

export {
  useStudents,
  useCrisisStudents,
  useStudent,
  useStudentCrisisLogs,
  type Student,
  type StudentsResponse,
  type CrisisLog,
} from "./useStudents";

export {
  useStaff,
  usePsychologists,
  useStaffMember,
  type Staff,
  type Psychologist,
  type StaffResponse,
} from "./useStaff";

export {
  useRealAnalytics,
  useUniversityAnalytics,
  useDepartmentAnalytics,
  useSummaryReport,
  type AnalyticsResponse,
  type AnalyticsCharts,
  type AnalyticsInsights,
  type ChartData,
} from "./useAnalytics";

export {
  useRiskScoreCohort,
  useRiskAlerts,
  useCriticalRiskAlerts,
  useStudentWrsHistory,
  useStudentRiskScore,
  type RiskScore,
  type RiskOverride,
  type RiskAlert,
  type RiskAlertsResponse,
  type CohortData,
  type StudentRiskDetail,
} from "./useRiskScores";

export {
  useMySchedule,
  useMyWeeklySchedule,
  useBusyBlocks,
  type DaySchedule,
  type BusyBlock,
  type WeeklyScheduleEntry,
} from "./useAvailability";

export {
  useNotifications,
  type Notification,
} from "./useNotifications";

export {
  useStudentSessions,
  useSessionByAppointment,
  type StudentSession,
  type SessionDetail,
  type StudentSessionsResponse,
} from "./useStudentSessions";

export {
  useConfig,
  useAdminConfig,
  type PublicConfig,
  type AdminConfig,
  type TierThresholds,
  type WrsConfig,
  type AlertConfig,
  type AssignmentConfig,
} from "./useConfig";

export {
  useCarePlans,
  useSafetyPlan,
  useActionItems,
  useReferrals,
  useNoteTemplates,
  type CarePlan,
  type CareGoal,
  type SafetyPlan,
  type SupportContact,
  type ActionItem,
  type Referral,
  type NoteTemplate,
} from "./useClinical";

export {
  useOrgInsights,
  type OrgInsights,
} from "./useOrgInsights";
