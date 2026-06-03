import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface Student {
  student_id: string;
  user_id: string;
  email: string;
  name: string;
  class_level?: string;
  faculty?: string;
  crisis_flag: boolean;
  assigned_psychologist_id?: string;
  created_at: string;
}

export interface StudentsResponse {
  data: Student[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_next: boolean;
  };
}

interface StudentFilters {
  student_id?: string;
  class_level?: string;
  faculty?: string;
  crisis_flag?: boolean;
  assigned_psychologist_id?: string;
}

/**
 * Fetch all students with optional filters
 */
export function useStudents(
  filters: StudentFilters = {},
  limit: number = 20,
  offset: number = 0
): UseQueryResult<StudentsResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  params.append("limit", String(limit));
  params.append("offset", String(offset));

  return useQuery({
    queryKey: ["students", filters, limit, offset],
    queryFn: async () => {
      return apiRequest<StudentsResponse>(
        "GET",
        `/students?${params.toString()}`
      );
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });
}

/**
 * Fetch crisis flagged students
 */
export function useCrisisStudents(
  limit: number = 50,
  offset: number = 0
): UseQueryResult<StudentsResponse> {
  return useQuery({
    queryKey: ["students", "crisis", limit, offset],
    queryFn: async () => {
      return apiRequest<StudentsResponse>(
        "GET",
        `/students?crisis_flag=true&limit=${limit}&offset=${offset}`
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });
}

/**
 * Fetch a single student by ID
 */
export function useStudent(studentId: string): UseQueryResult<Student> {
  return useQuery({
    queryKey: ["students", studentId],
    queryFn: async () => {
      return apiRequest<Student>("GET", `/students/${studentId}`);
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    retry: 1,
    enabled: !!studentId,
  });
}

export interface CrisisLog {
  id: string;
  student_id: string;
  event_type: string;
  description: string;
  created_at: string;
}

/**
 * Fetch crisis logs for a student
 */
export function useStudentCrisisLogs(
  studentId: string
): UseQueryResult<CrisisLog[]> {
  return useQuery({
    queryKey: ["students", studentId, "crisisLogs"],
    queryFn: async () => {
      return apiRequest<CrisisLog[]>(
        "GET",
        `/students/${studentId}/crisis-logs`
      );
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    retry: 1,
    enabled: !!studentId,
  });
}
