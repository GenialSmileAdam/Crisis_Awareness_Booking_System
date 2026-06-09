/**
 * Authorization utilities using Campus One roles array.
 *
 * Campus One roles:
 * - "unit_head" → admin access
 * - "unit_admin" → admin access (same as unit_head)
 * - "psychologist" → psychologist access
 * - "student" → student access
 */

import { JWTPayload } from "@/api/auth";

export function hasRole(user: JWTPayload | null, role: string): boolean {
  if (!user) return false;
  const userRoles = user.roles || [];
  return userRoles.includes(role);
}

export function isUnitHead(user: JWTPayload | null): boolean {
  return hasRole(user, "unit_head") || hasRole(user, "unit_admin");
}

export function isUnitAdmin(user: JWTPayload | null): boolean {
  return hasRole(user, "unit_admin");
}

export function isPsychologist(user: JWTPayload | null): boolean {
  return hasRole(user, "psychologist");
}

export function isStudent(user: JWTPayload | null): boolean {
  return hasRole(user, "student");
}

export function canAccessAdmin(user: JWTPayload | null): boolean {
  return isUnitHead(user);
}

export function canAccessStaff(user: JWTPayload | null): boolean {
  return isUnitHead(user) || isPsychologist(user);
}

/**
 * Check if user can book appointments (students can always book, staff may have special access).
 */
export function canBookAppointment(user: JWTPayload | null): boolean {
  if (!user) return false;
  // Students can book, staff can manage
  return isStudent(user) || canAccessStaff(user);
}

/**
 * Check if user can view other students' data (staff only).
 */
export function canViewStudentData(user: JWTPayload | null): boolean {
  return canAccessStaff(user);
}
