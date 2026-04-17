export type UserRole = "student" | "counselor" | "admin" | "family";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  subtitle?: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  grade: string;
  avatar?: string;
  wellnessScore: number;
  familyContact?: FamilyContact;
}

export interface Counselor {
  id: string;
  name: string;
  email: string;
  specialization: string;
  avatar?: string;
}

export interface Appointment {
  id: string;
  studentId: string;
  studentName: string;
  counselorId: string;
  counselorName: string;
  date: string;
  time: string;
  type: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
}

export interface Session {
  id: string;
  studentId: string;
  studentName: string;
  counselorId: string;
  counselorName: string;
  date: string;
  time?: string;
  type: string;
  status: "pending" | "completed" | "cancelled";
  duration?: string;
  notes?: string;
  moodRating?: number;
  progressRating?: number;
  aiSummary?: string;
}

export interface FamilyContact {
  name: string;
  email: string;
  phone: string;
  relationship: string;
}

export interface AISummary {
  studentId: string;
  studentName: string;
  keyThemes: string[];
  riskFlags: string[];
  recommendations: string[];
  generatedAt: string;
  sessionTitle?: string;
  sessionDate?: string;
  quote?: string;
  discourse?: string;
  recommendedActions?: string;
}
