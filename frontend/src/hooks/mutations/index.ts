export {
  useSubmitCheckin,
  type TestSubmission,
  type TestResultResponse,
} from "./useCheckinMutations";

export {
  useBookAppointment,
  useUpdateAppointment,
  useRequestAppointment,
  useApproveAppointment,
  useRejectAppointment,
  useCancelAppointment,
  type BookAppointmentPayload,
  type UpdateAppointmentPayload,
  type AppointmentResponse,
} from "./useAppointmentMutations";

export {
  useRiskOverride,
  type RiskOverridePayload,
  type RiskOverrideResponse,
} from "./useRiskScoreMutations";

export {
  useSaveSchedule,
  useAddBusyBlock,
  useDeleteBusyBlock,
  type DaySchedule,
  type BusyBlockPayload,
  type BusyBlockResponse,
} from "./useAvailabilityMutations";

export {
  useCreateStaff,
  type CreateStaffPayload,
  type StaffResponse,
} from "./useStaffMutations";

export {
  useSubmitConsent,
  type ConsentRecord,
} from "./useConsentMutations";

export {
  useCreateAISession,
  useUploadSessionAudio,
  useTranscribeSession,
  useSummariseSession,
  type AISessionResponse,
} from "./useAISessionMutations";

export {
  useDeactivateStudent,
  useActivateStudent,
  type StudentStatusResponse,
} from "./useStudentMutations";

export {
  useAdminResetPassword,
  useRequestPasswordReset,
  useResetPassword,
} from "./useAuthMutations";

export {
  useUpdateSessionNotes,
  useSaveStudentClinicalNotes,
} from "./useSessionMutations";
