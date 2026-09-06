"use client";

import { CheckCircle2, Clock, SkipForward, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApprovalStatus, ApprovalStep } from "@/types";

// Shared between the administrative requests (/requests/:id/approval-steps) and
// leave requests (/leave-requests/:id/approval-steps) — both endpoints return the
// same step shape, so both render through this component.
export const APPROVER_ROLE_LABELS: Record<string, string> = {
  SUBSTITUTE: "البديل",
  DIRECT_MANAGER: "المدير المباشر",
  DEPARTMENT_MANAGER: "مدير القسم",
  TARGET_MANAGER: "مدير الموظف المستهدف",
  HR: "الموارد البشرية",
  CEO: "المدير التنفيذي",
  CFO: "المدير المالي",
  LOGISTICS: "مسؤول اللوجستي",
  ASSIGNED_EMPLOYEE: "الموظف المكلَّف",
  QS: "مشرف الجودة",
};

export function ApprovalStatusIcon({ status }: { status: ApprovalStatus }) {
  if (status === "APPROVED") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (status === "REJECTED") return <XCircle className="h-5 w-5 text-destructive" />;
  if (status === "SKIPPED") return <SkipForward className="h-5 w-5 text-muted-foreground" />;
  return <Clock className="h-5 w-5 text-amber-500" />;
}

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const variants: Record<ApprovalStatus, { label: string; className: string }> = {
    PENDING: { label: "في الانتظار", className: "bg-amber-50 text-amber-700 border-amber-200" },
    APPROVED: { label: "موافق", className: "bg-green-50 text-green-700 border-green-200" },
    REJECTED: { label: "مرفوض", className: "bg-red-50 text-red-700 border-red-200" },
    SKIPPED: { label: "تم التخطي", className: "bg-gray-50 text-gray-600 border-gray-200" },
  };
  const v = variants[status];
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}

interface ApprovalTimelineProps {
  steps: ApprovalStep[];
  /**
   * Highlights the step the request is currently sitting on. Leave requests carry
   * no such field, so when it is omitted the first PENDING step is highlighted.
   */
  currentStepOrder?: number | null;
  isLoading?: boolean;
  /** Shown when there are no steps — the reason differs per request kind. */
  emptyMessage?: string;
  title?: string;
}

export function ApprovalTimeline({
  steps,
  currentStepOrder,
  isLoading = false,
  emptyMessage = "لا يوجد مسار موافقة لهذا الطلب",
  title = "مسار الموافقة",
}: ApprovalTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : steps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>
        ) : (
          (() => {
            const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
            const highlightOrder =
              currentStepOrder ?? sorted.find((s) => s.status === "PENDING")?.stepOrder;
            return (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute right-4.5 top-6 bottom-6 w-0.5 bg-border" />

            <div className="space-y-4">
              {sorted
                .map((step, idx) => {
                  const isCurrent = step.status === "PENDING" && step.stepOrder === highlightOrder;
                  const isSkipped = step.status === "SKIPPED";
                  return (
                    <div key={step.id ?? idx} className={`flex items-start gap-4 relative ${isSkipped ? "opacity-60" : ""}`}>
                      <div className={`z-10 shrink-0 rounded-full p-1 ${isCurrent ? "bg-amber-100 ring-2 ring-amber-400" : "bg-background"}`}>
                        <ApprovalStatusIcon status={step.status} />
                      </div>
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <span className={`text-sm font-medium ${isSkipped ? "line-through text-muted-foreground" : ""}`}>
                              {APPROVER_ROLE_LABELS[step.approverRole] || step.approverRole}
                            </span>
                            <span className="text-xs text-muted-foreground mr-2">
                              الخطوة {step.stepOrder}
                            </span>
                          </div>
                          <ApprovalStatusBadge status={step.status} />
                        </div>
                        {isSkipped && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            تم تخطي هذه الخطوة تلقائياً
                          </p>
                        )}
                        {step.reviewedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(step.reviewedAt).toLocaleDateString("ar-SA")}
                          </p>
                        )}
                        {step.notes && (
                          <p className="text-sm text-muted-foreground mt-1 bg-muted rounded p-2">
                            {step.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
            );
          })()
        )}
      </CardContent>
    </Card>
  );
}
