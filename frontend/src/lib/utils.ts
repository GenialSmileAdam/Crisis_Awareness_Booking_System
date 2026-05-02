import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWRS(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return Number(score).toFixed(1);
}
