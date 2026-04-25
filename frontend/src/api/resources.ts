import { apiRequest } from "./client";

// ── Interfaces ──

export type ResourceType = "article" | "video" | "exercise";

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  topic: string;
  url: string;
  approved_by: string | null;
  created_at: string;
}

export interface CreateResourcePayload {
  title: string;
  type: ResourceType;
  topic: string;
  url: string;
  description?: string;
}

// ── Resource functions ──

/**
 * List resources with optional topic/type filters (any authenticated).
 */
export async function listResources(
  filters?: { topic?: string; type?: string },
): Promise<Resource[]> {
  const params = new URLSearchParams();
  if (filters?.topic) params.set("topic", filters.topic);
  if (filters?.type) params.set("type", filters.type);
  const qs = params.toString();
  return apiRequest<Resource[]>(
    "GET",
    `/resources${qs ? `?${qs}` : ""}`,
  );
}

/**
 * Add a new resource (admin only).
 */
export async function addResource(payload: CreateResourcePayload): Promise<Resource> {
  return apiRequest<Resource>("POST", "/resources", payload);
}

/**
 * Get personalised resource recommendations (student only).
 */
export async function getRecommendedResources(): Promise<Resource[]> {
  return apiRequest<Resource[]>("GET", "/resources/recommended");
}
