import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export const COURT_TYPE_COLORS: Record<string, string> = {
  HIGH_COURT: "bg-blue-100 text-blue-800 border-blue-300",
  DISTRICT_COURT: "bg-green-100 text-green-800 border-green-300",
  SUPREME_COURT: "bg-purple-100 text-purple-800 border-purple-300",
  TRIBUNAL: "bg-orange-100 text-orange-800 border-orange-300",
  SESSIONS_COURT: "bg-yellow-100 text-yellow-800 border-yellow-300",
  MAGISTRATE_COURT: "bg-red-100 text-red-800 border-red-300",
};

export const COURT_TYPE_LABELS: Record<string, string> = {
  HIGH_COURT: "High Court",
  DISTRICT_COURT: "District Court",
  SUPREME_COURT: "Supreme Court",
  TRIBUNAL: "Tribunal",
  SESSIONS_COURT: "Sessions Court",
  MAGISTRATE_COURT: "Magistrate Court",
};

export const STAGE_LABELS: Record<string, string> = {
  FIR_STAGE: "FIR Stage",
  INVESTIGATION: "Investigation",
  CHARGE_SHEET: "Charge Sheet",
  TRIAL: "Trial",
  ARGUMENTS: "Arguments",
  CROSS_EXAMINATION: "Cross-Examination",
  JUDGMENT: "Judgment",
  BAIL: "Bail",
  APPEAL: "Appeal",
  MISC: "Miscellaneous",
};

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  DISPOSED: "bg-slate-100 text-slate-800",
  PENDING: "bg-amber-100 text-amber-800",
};

export const HEARING_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  POSTPONED: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-red-100 text-red-800",
};
