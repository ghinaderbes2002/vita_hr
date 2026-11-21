import type { JobApplicationStatus } from "@/types";

/**
 * Hiring flow, as the API enforces it (anything else is a 400):
 *
 *   PENDING → INTERVIEW_READY → INTERVIEWED → PENDING_CEO_APPROVAL ─┬→ HIRED          (CEO approves)
 *                                                    ↑              └→ RETURNED_TO_HR (CEO sends back)
 *                                                    └──────────── RETURNED_TO_HR ┘
 *   Any HR step can also go to REJECTED (emails the applicant). HIRED / REJECTED are final.
 *
 * ACCEPTED is legacy: old records still carry it and the CEO can act on them,
 * but nothing moves *to* it any more.
 */
export const HR_TRANSITIONS: Partial<Record<JobApplicationStatus, JobApplicationStatus[]>> = {
  PENDING: ["INTERVIEW_READY", "REJECTED"],
  INTERVIEW_READY: ["INTERVIEWED", "REJECTED"],
  INTERVIEWED: ["PENDING_CEO_APPROVAL", "REJECTED"],
  RETURNED_TO_HR: ["PENDING_CEO_APPROVAL", "REJECTED"],
};

/** Waiting on the CEO — the only states where approve / send-back work. */
export const AWAITING_CEO: JobApplicationStatus[] = ["PENDING_CEO_APPROVAL", "ACCEPTED"];

export const isFinal = (s: JobApplicationStatus) => s === "HIRED" || s === "REJECTED";

export const canHrMove = (from: JobApplicationStatus, to: JobApplicationStatus) =>
  (HR_TRANSITIONS[from] ?? []).includes(to);

/** Badge colours, shared by the list, the board and the detail page. */
export const STATUS_BADGE: Record<JobApplicationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  INTERVIEW_READY: "bg-blue-100 text-blue-800",
  INTERVIEWED: "bg-cyan-100 text-cyan-800",
  PENDING_CEO_APPROVAL: "bg-indigo-100 text-indigo-800",
  ACCEPTED: "bg-indigo-100 text-indigo-800",
  RETURNED_TO_HR: "bg-orange-100 text-orange-800",
  HIRED: "bg-purple-100 text-purple-800",
  REJECTED: "bg-red-100 text-red-800",
};

/** The API's own Arabic message (INVALID_APPLICATION_TRANSITION, NOT_AWAITING_CEO…). */
export function applicationErrorMessage(error: any, fallback = "حدث خطأ"): string {
  if (error?.response?.status === 403) return "ليس لديك صلاحية تنفيذ هذه العملية";
  return error?.response?.data?.error?.message || error?.response?.data?.message || fallback;
}
