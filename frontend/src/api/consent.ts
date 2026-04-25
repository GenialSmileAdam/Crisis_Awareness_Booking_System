import { apiRequest } from "./client";

// ── Interfaces ──

export interface ConsentRecord {
  id: string;
  student_id: string;
  monitoring_enabled: boolean;
  updated_at: string;
}

// ── Consent functions ──

/**
 * Submit or update consent preference (student only).
 */
export async function submitConsent(monitoringEnabled: boolean): Promise<ConsentRecord> {
  return apiRequest<ConsentRecord>("POST", "/consent", {
    monitoring_enabled: monitoringEnabled,
  });
}

/**
 * Get consent status for a student (admin, psychologist, or self).
 */
export async function getConsent(studentId: string): Promise<ConsentRecord> {
  return apiRequest<ConsentRecord>("GET", `/consent/${studentId}`);
}
