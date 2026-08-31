import type { Notification } from "@/lib/api/notifications";

/**
 * Facts about the viewer that change where a notification leads. A reviewer and
 * the employee who filed the request get the same notification type but belong
 * on different screens.
 */
export interface NotificationLinkContext {
  /** Holds attendance.justifications.manager-review or …hr-review. */
  canReviewJustifications?: boolean;
}

/**
 * يُرجع مسار الوجهة (بدون بادئة اللغة) أو null إذا لا وجهة → يُفتح Dialog.
 * المستدعي يضيف `/${locale}` في البداية.
 */
export function resolveNotificationLink(
  notif: Notification,
  ctx: NotificationLinkContext = {},
): string | null {
  const d = (notif.data ?? {}) as Record<string, any>;

  // A link the server put on the notification wins over everything below: the
  // backend knows where its own notification belongs, and a new type starts
  // working without a frontend release. Only an internal absolute path is
  // followed — "//host" is protocol-relative and would navigate off the app.
  const link = typeof d.link === "string" ? d.link.trim() : "";
  if (link.startsWith("/") && !link.startsWith("//")) return link;

  // Appointment notifications (created / reminder / cancelled …) all carry an
  // `appointmentId` regardless of their type → open the therapist's own list.
  // There is no dedicated appointment detail route (appointments open in a
  // dialog), so we land on "my-appointments".
  if (d.appointmentId) return "/clinic/my-appointments";

  switch (notif.type) {
    case "GENERAL":
      if (d.alertType === "PHYSIO_EMERGENCY") {
        if (d.alertId) return `/clinic/physio/emergency/${d.alertId}`;
        return "/clinic/physio";
      }
      if (d.messageId) return `/mail?messageId=${d.messageId}`;
      if (d.requestId) return `/requests/${d.requestId}`;
      return null;

    case "PENALTY_DECISION":
    case "REWARD_DECISION":
      return d.requestId ? `/requests/${d.requestId}` : "/requests/my-requests";

    case "ADDITIONAL_ASSIGNMENT_REQUEST":
      return d.requestId ? `/requests/${d.requestId}` : "/requests/pending-manager";
    case "ADDITIONAL_ASSIGNMENT_DECISION":
      return d.requestId ? `/requests/${d.requestId}` : "/requests/my-requests";

    case "EVALUATION_ASSIGNED":
    case "EVALUATION_SUBMITTED":
      return d.evaluationId ? `/probation-evaluations/${d.evaluationId}` : "/probation-evaluations";

    case "LEAVE_REQUEST_SUBMITTED": {
      if (d.leaveRequestId) return `/leaves/view/${d.leaveRequestId}`;
      const isHrStep = d.step === "hr" || d.approvalType === "hr" || d.role === "hr";
      return isHrStep ? "/leaves/pending-approval?tab=hr" : "/leaves/pending-approval";
    }
    case "LEAVE_REQUEST_APPROVED":
    case "LEAVE_REQUEST_REJECTED":
    case "LEAVE_REQUEST_CANCELLED":
      return d.leaveRequestId ? `/leaves/view/${d.leaveRequestId}` : "/leaves/my-leaves";

    case "LEAVE_REQUEST_PENDING_APPROVAL":
      return "/leaves/pending-approval?tab=hr";

    case "DOCUMENT_EXPIRY":
      return d.employeeId ? `/employees/${d.employeeId}` : "/employees";
    case "CONTRACT_EXPIRY":
      return d.employeeId ? `/employees/${d.employeeId}` : "/reports/contract-ending";

    // Attendance alerts carry { alertType, attendanceRecordId, date } so the
    // employee lands on the matching alert with the justify dialog already open.
    // Notifications raised before that payload existed have no `data` — they
    // still open the plain list.
    case "ATTENDANCE_ALERT": {
      const params = new URLSearchParams();
      if (d.alertType) params.set("type", d.alertType);
      if (d.date) params.set("date", d.date);
      if (d.attendanceRecordId) params.set("recordId", d.attendanceRecordId);
      const qs = params.toString();
      return qs ? `/attendance/my-alerts?${qs}` : "/attendance/my-alerts";
    }
    // Reviewers (direct manager / HR) go straight to the justification that
    // needs them; the list they land on otherwise already scopes itself to the
    // team for a direct manager. The employee who filed it gets their own list,
    // since the notification they receive is the decision on their request.
    case "ATTENDANCE_JUSTIFICATION":
      if (!ctx.canReviewJustifications) return "/attendance/my-justifications";
      return d.justificationId
        ? `/attendance/justifications/${d.justificationId}`
        : "/attendance/justifications";
    case "ATTENDANCE_NEEDS_REVIEW":     return "/attendance/needs-review";
    case "BREAK_EXCEEDED":              return "/attendance/records";
    case "PROBATION_REMINDER":
      return d.evaluationId ? `/probation-evaluations/${d.evaluationId}` : "/probation-evaluations";
    case "PROBATION_END_REMINDER":      return "/probation-evaluations";
    case "ONBOARDING_TASK":
    case "OFFBOARDING_TASK":            return "/onboarding/workflows";
    case "EMPLOYEES_WITHOUT_SCHEDULE":  return "/work-schedules";
    case "MONTHLY_PAYROLL_READY":       return "/payroll";
    case "WELCOME":                     return "/my-profile";
    case "TARDINESS_BALANCE_USED":
    case "TARDINESS_BALANCE_LOW":
    case "TARDINESS_BALANCE_DEPLETED":
    case "TARDINESS_OFFSET_RESTORED":   return "/leaves/my-hourly-balance";
    case "TARDINESS_COMPENSATION_DUE":  return "/attendance/my-attendance";
    case "TARDINESS_DEDUCTION_PENDING": return "/payroll";

    // Follow-up program alert (and the head's reply) → open the case on the
    // follow-up tab where the alert thread lives.
    case "CASE_ALERT":
    case "CASE_ALERT_RESPONSE":
      return d.caseId ? `/clinic/prosthetics/${d.caseId}?tab=treatment_program` : null;

    case "INVENTORY_REQUEST": {
      // The request review UI (approve / not-available) lives in the requests
      // tab; open it and focus the specific request card by id.
      const reqId = d.requestId ?? d.itemId;
      return reqId
        ? `/clinic/inventory?tab=requests&requestId=${reqId}`
        : "/clinic/inventory?tab=requests";
    }
    case "INVENTORY_REQUEST_UPDATE":
      return d.itemId ? `/clinic/inventory/${d.itemId}` : "/clinic/inventory";

    case "BIRTHDAY":                    return null;
    default:                            return null;
  }
}

export function hasNotificationLink(notif: Notification, ctx?: NotificationLinkContext): boolean {
  return resolveNotificationLink(notif, ctx) !== null;
}
