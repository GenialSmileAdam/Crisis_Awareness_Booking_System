import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/api/client";

export interface Notification {
  id: string;
  type: string;
  category: string;
  message: string;
  status: "pending" | "sent" | "failed";
  sent_at: string | null;
  created_at: string;
}

interface NotificationsResponse {
  data: Notification[];
  pagination: { total: number; limit: number; offset: number; has_next: boolean };
}

export function useNotifications(limit = 10) {
  return useQuery({
    queryKey: ["notifications", limit],
    queryFn: () => apiRequest<NotificationsResponse>("GET", `/notifications?limit=${limit}&offset=0`),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  });
}
