import { apiRequest } from "./client";

// ── Analytics stubs ──
// These endpoints are not yet built (Daniel's scope).
// Functions make the API call but return `any` for now.
// Update types when Daniel's endpoints are ready.

/**
 * Get university-wide analytics (admin only).
 */
export async function getUniversityAnalytics(): Promise<any> {
  return apiRequest<any>("GET", "/analytics/university");
}

/**
 * Get department-level analytics (admin, psychologist).
 */
export async function getDepartmentAnalytics(deptId: string): Promise<any> {
  return apiRequest<any>("GET", `/analytics/department/${deptId}`);
}

/**
 * Get a summary report export (admin only).
 */
export async function getSummaryReport(): Promise<any> {
  return apiRequest<any>("GET", "/analytics/summary-report");
}
