import { apiRequest } from "./client";
import type { PaginatedResponse } from "./types";

// ── Interfaces ──

export interface ForumPost {
  id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
  delete_reason: string | null;
}

// ── Forum functions ──

/**
 * List forum posts with pagination (any authenticated).
 */
export async function listForumPosts(
  limit?: number,
  offset?: number,
): Promise<PaginatedResponse<ForumPost>> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set("limit", String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
  const qs = params.toString();
  return apiRequest<PaginatedResponse<ForumPost>>(
    "GET",
    `/forum/posts${qs ? `?${qs}` : ""}`,
  );
}

/**
 * Create a new forum post (student only).
 */
export async function createForumPost(content: string): Promise<ForumPost> {
  return apiRequest<ForumPost>("POST", "/forum/posts", { content });
}

/**
 * Delete a forum post with a reason (admin only).
 */
export async function deleteForumPost(id: string, reason: string): Promise<void> {
  return apiRequest<void>("DELETE", `/forum/posts/${id}`, { reason });
}
