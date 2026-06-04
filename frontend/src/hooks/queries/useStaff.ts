import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface Staff {
  id: string;
  user_id: string;
  staff_type: string;
  department?: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Psychologist {
  id: string;
  user_id: string;
  name: string;
  email: string;
  department?: string;
  is_available?: boolean;
}

export interface StaffResponse {
  data: Staff[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_next: boolean;
  };
}

interface StaffFilters {
  staff_type?: string;
  department?: string;
}

/**
 * Fetch all staff with optional filters
 */
export function useStaff(
  filters: StaffFilters = {},
  limit: number = 20,
  offset: number = 0
): UseQueryResult<StaffResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  params.append("limit", String(limit));
  params.append("offset", String(offset));

  return useQuery({
    queryKey: ["staff", filters, limit, offset],
    queryFn: async () => {
      return apiRequest<StaffResponse>(
        "GET",
        `/staff?${params.toString()}`
      );
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    retry: 1,
  });
}

/**
 * Fetch all psychologists
 */
export function usePsychologists(): UseQueryResult<Psychologist[]> {
  return useQuery({
    queryKey: ["staff", "psychologists"],
    queryFn: async () => {
      return apiRequest<Psychologist[]>("GET", "/psychologists");
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    retry: 1,
  });
}

/**
 * Fetch a specific staff member by ID
 */
export function useStaffMember(
  staffId: string
): UseQueryResult<Staff> {
  return useQuery({
    queryKey: ["staff", staffId],
    queryFn: async () => {
      return apiRequest<Staff>("GET", `/staff/${staffId}`);
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    retry: 1,
    enabled: !!staffId,
  });
}
