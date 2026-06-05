/**
 * Authorization utilities using Campus One roles array.
 *
 * Campus One roles:
 * - "unit_head" → admin access
 * - "psychologist" → psychologist access
 * - "student" → student access
 */

import { JWTPayload } from "@/api/auth";

/**
 * Check if user has a specific Campus One role.
 */
export function hasRole(user: JWTPayload | null, role: string): boolean {
  if (!user) return false;
  const userRoles = user.roles || [];
  return userRoles.includes(role);
}

/**
 * Check if user is a unit head (admin).
 */
export function isUnitHead(user: JWTPayload | null): boolean {
  return hasRole(user, "unit_head");
}

/**
 * Check if user is a psychologist.
 */
export function isPsychologist(user: JWTPayload | null): boolean {
  return hasRole(user, "psychologist");
}

/**
 * Check if user is a student.
 */
export function isStudent(user: JWTPayload | null): boolean {
  return hasRole(user, "student");
}

/**
 * Check if user can access admin panel (unit_head role).
 */
export function canAccessAdmin(user: JWTPayload | null): boolean {
  return isUnitHead(user);
}

/**
 * Check if user can access staff features (unit_head or psychologist).
 */
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
