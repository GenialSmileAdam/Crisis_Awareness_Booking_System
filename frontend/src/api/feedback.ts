import { apiRequest } from "./client";

export interface FeedbackPayload {
  name: string;
  email: string;
  message: string;
  rating?: number;
}

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  await apiRequest<void>("POST", "/feedback", payload);
}
