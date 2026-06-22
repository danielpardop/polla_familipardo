import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(home: number | null, away: number | null) {
  if (home === null || away === null) return "-";
  return `${home} - ${away}`;
}
