"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, XCircle, Clock, SkipForward, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";
import { RequestStatusBadge } from "@/components/features/requests/request-status-badge";
import { useRequest, useRequestApprovals, useApproveRequest, useRejectRequest } from "@/lib/hooks/use-requests";
import { RequestActionDialog } from "@/components/features/requests/request-action-dialog";
import { useState } from "react";
import { ApprovalStep, ApprovalStatus } from "@/types";


// Human-readable labels for detail keys
const DETAIL_KEY_LABELS: Record<string, string> = {
  positions: "المناصب المطلوبة",
  count: "العدد",
  reason: "السبب",
  jobTitle: "المسمى الوظيفي",
  department: "القسم",
  departmentId: "رمز القسم",
  targetDepartment: "القسم المستهدف",
  targetJobTitle: "المسمى الوظيفي المستهدف",
  amount: "المبلغ",
  description: "الوصف",
  startDate: "تاريخ البداية",
  endDate: "تاريخ النهاية",
  date: "التاريخ",
  hours: "عدد الساعات",
  destination: "الوجهة",
  purpose: "الغرض",
  delegateTo: "التفويض إلى",
  penalty: "الجزاء",
  reward: "المكافأة",
  type: "النوع",
  notes: "ملاحظات",
};

function formatDetailKey(key: string): string {
  return DETAIL_KEY_LABELS[key] || key;
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function renderDetailValue(value: any) {
  if (value === null || value === undefined) return "—";

  // Array of objects (e.g. positions)
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";

    // Array of primitives
    if (typeof value[0] !== "object") {
      return <span>{value.join("، ")}</span>;
    }

    // Array of objects — render as mini table
    return (
      <div className="space-y-2 w-full">
        {value.map((item: any, i: number) => (
          <div key={i} className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
            {Object.entries(item).map(([k, v]) => {
              if (k === "departmentId" || (typeof v === "string" && isUUID(v as string))) return null;
              return (
                <div key={k} className="flex items-start justify-between gap-2 text-xs">
                  <span className="text-muted-foreground shrink-0">{formatDetailKey(k)}:</span>
                  <span className="font-medium text-right">{String(v ?? "—")}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // Plain object
  if (typeof value === "object") {
    return (
      <div className="space-y-1 w-full">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-2 text-xs">
            <span className="text-muted-foreground shrink-0">{formatDetailKey(k)}:</span>
            <span className="font-medium text-right">{String(v ?? "—")}</span>
          </div>
        ))}
      </div>
    );
  }

  // UUID string — skip or show shortened
  if (typeof value === "string" && isUUID(value)) return null;

  return <span>{String(value)}</span>;
}

const APPROVER_ROLE_LABELS: Record<string, string> = {
  DIRECT_MANAGER: "المدير المباشر",
  DEPARTMENT_MANAGER: "مدير القسم",
  TARGET_MANAGER: "مدير الموظف المستهدف",
  HR: "الموارد البشرية",
  CEO: "المدير العام",
  CFO: "المدير المالي",
};

function ApprovalStatusIcon({ status }: { status: ApprovalStatus }) {
  if (status === "APPROVED") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (status === "REJECTED") return <XCircle className="h-5 w-5 text-destructive" />;
  if (status === "SKIPPED") return <SkipForward className="h-5 w-5 text-muted-foreground" />;
  return <Clock className="h-5 w-5 text-amber-500" />;
}

function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const variants: Record<ApprovalStatus, { label: string; className: string }> = {
    PENDING: { label: "في الانتظار", className: "bg-amber-50 text-amber-700 border-amber-200" },
    APPROVED: { label: "موافق", className: "bg-green-50 text-green-700 border-green-200" },
    REJECTED: { label: "مرفوض", className: "bg-red-50 text-red-700 border-red-200" },
    SKIPPED: { label: "تم التخطي", className: "bg-gray-50 text-gray-600 border-gray-200" },
  };
  const v = variants[status];
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const id = params.id as string;

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const { data: request, isLoading } = useRequest(id);
  const { data: approvals, isLoading: approvalsLoading } = useRequestApprovals(id);
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();

  const steps: ApprovalStep[] = Array.isArray(approvals) ? approvals : [];

  const handleApprove = async (notes: string) => {
    await approveRequest.mutateAsync({ id, notes: notes || undefined });
    setApproveOpen(false);
  };

  const handleReject = async (reason: string) => {
    await rejectRequest.mutateAsync({ id, reason });
    setRejectOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">الطلب غير موجود</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`طلب رقم ${request.requestNumber}`}
        description={t(`requests.types.${request.type}`)}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowRight className="h-4 w-4 ml-2" />
              {t("common.back")}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Request Info */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات الطلب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">رقم الطلب</span>
              <span className="font-mono text-sm font-medium">{request.requestNumber}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">نوع الطلب</span>
              <span className="text-sm font-medium">{t(`requests.types.${request.type}`)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">الحالة</span>
              <RequestStatusBadge status={request.status} />
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">الموظف</span>
              <span className="text-sm">
                {request.employee
                  ? `${request.employee.firstNameAr} ${request.employee.lastNameAr}`
                  : "—"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">تاريخ الإنشاء</span>
              <span className="text-sm text-muted-foreground">
                {new Date(request.createdAt).toLocaleDateString("ar-SA")}
              </span>
            </div>
            {request.reason && (
              <>
                <Separator />
                <div className="space-y-1">
                  <span className="text-muted-foreground text-sm">السبب</span>
                  <p className="text-sm mt-1">{request.reason}</p>
                </div>
              </>
            )}
            {request.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <span className="text-muted-foreground text-sm">ملاحظات</span>
                  <p className="text-sm mt-1">{request.notes}</p>
                </div>
              </>
            )}
            {request.attachmentUrl && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">المرفق</span>
                  <a
                    href={request.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    عرض المرفق
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Request Details */}
        {request.details && Object.keys(request.details).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(request.details).map(([key, value]) => {
                const rendered = renderDetailValue(value);
                if (rendered === null) return null;
                const isComplex = Array.isArray(value) || (typeof value === "object" && value !== null);
                return (
                  <div key={key}>
                    {isComplex ? (
                      <div className="space-y-2">
                        <span className="text-muted-foreground text-sm font-medium">{formatDetailKey(key)}</span>
                        <div className="text-sm">{rendered}</div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-muted-foreground text-sm shrink-0">{formatDetailKey(key)}</span>
                        <span className="text-sm font-medium text-right">{rendered}</span>
                      </div>
                    )}
                    <Separator className="mt-3" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contextual Notes for REWARD / TRANSFER */}
      {request.type === "REWARD" && request.status === "APPROVED" && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">ملاحظة حول المكافأة</p>
                <p className="text-sm text-green-700 mt-1">
                  سيُضاف هذا المبلغ لكشف راتب الموظف عند توليده للشهر الذي صدر فيه الطلب.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {request.type === "TRANSFER" && request.status === "APPROVED" && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">ملاحظة حول النقل</p>
                <p className="text-sm text-blue-700 mt-1">
                  تم تحديث قسم الموظف ومسماه الوظيفي تلقائياً بناءً على بيانات هذا الطلب.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Steps Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>مسار الموافقة</CardTitle>
        </CardHeader>
        <CardContent>
          {approvalsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : steps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              لا يوجد مسار موافقة لهذا الطلب
            </p>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute right-4.5 top-6 bottom-6 w-0.5 bg-border" />

              <div className="space-y-4">
                {steps
                  .sort((a, b) => a.stepOrder - b.stepOrder)
                  .map((step, idx) => {
                    const isCurrent = step.status === "PENDING" && step.stepOrder === request.currentStepOrder;
                    return (
                      <div key={step.id} className="flex items-start gap-4 relative">
                        <div className={`z-10 shrink-0 rounded-full p-1 ${isCurrent ? "bg-amber-100 ring-2 ring-amber-400" : "bg-background"}`}>
                          <ApprovalStatusIcon status={step.status} />
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <span className="text-sm font-medium">
                                {APPROVER_ROLE_LABELS[step.approverRole] || step.approverRole}
                              </span>
                              <span className="text-xs text-muted-foreground mr-2">
                                الخطوة {step.stepOrder}
                              </span>
                            </div>
                            <ApprovalStatusBadge status={step.status} />
                          </div>
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
          )}
        </CardContent>
      </Card>

      <RequestActionDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        action="approve"
        onConfirm={handleApprove}
        isLoading={approveRequest.isPending}
      />
      <RequestActionDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        action="reject"
        onConfirm={handleReject}
        isLoading={rejectRequest.isPending}
      />
    </div>
  );
}
