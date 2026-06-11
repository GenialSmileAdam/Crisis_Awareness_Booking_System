import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";
import { QK } from "@/lib/queryKeys";

export interface TierThresholds {
  amber: number;
  red: number;
  critical: number;
}

export interface WrsConfig {
  thresholds: TierThresholds;
  weights: Record<string, number>;
}

export interface PublicConfig {
  wrs: WrsConfig;
}

export interface AlertConfig {
  channels: { in_app: boolean; email: boolean; campus_one: boolean; sms: boolean };
  notify_tiers: string[];
  crisis_escalation_minutes: number;
}

export interface AssignmentConfig {
  strategy: "manual" | "round_robin" | "least_loaded" | "by_faculty";
  caseload_cap: number;
}

export interface AdminConfig {
  wrs: WrsConfig;
  alerts: AlertConfig;
  assignment: AssignmentConfig;
}

/**
 * Non-sensitive config available to any authenticated user (tier thresholds for
 * client-side display). Cached longer since it changes rarely.
 */
export function useConfig(enabled: boolean = true): UseQueryResult<PublicConfig> {
  return useQuery({
    queryKey: [QK.config, "public"],
    queryFn: async () => apiRequest<PublicConfig>("GET", "/config"),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
    retry: 1,
    enabled,
  });
}

/**
 * Full system config — admin only (drives the Admin Settings page).
 */
export function useAdminConfig(): UseQueryResult<AdminConfig> {
  return useQuery({
    queryKey: [QK.config, "admin"],
    queryFn: async () => apiRequest<AdminConfig>("GET", "/config/admin"),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });
}
