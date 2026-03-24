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
import { usePermissions } from "@/lib/hooks/use-permissions";

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
  const { hasPermission, isAdmin } = usePermissions();
  const canApprove = isAdmin() || hasPermission("requests:approve");

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
            {request.status === "IN_APPROVAL" && canApprove && (
              <>
                <Button onClick={() => setApproveOpen(true)} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                  موافقة
                </Button>
                <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                  <XCircle className="h-4 w-4 ml-2" />
                  رفض
                </Button>
              </>
            )}
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
              {Object.entries(request.details).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground text-sm capitalize">{key}</span>
                    <span className="text-sm font-medium text-left max-w-48 break-words">
                      {Array.isArray(value) ? JSON.stringify(value) : String(value ?? "—")}
                    </span>
                  </div>
                  <Separator className="mt-3" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

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
              <div className="absolute right-[18px] top-6 bottom-6 w-0.5 bg-border" />

              <div className="space-y-4">
                {steps
                  .sort((a, b) => a.stepOrder - b.stepOrder)
                  .map((step, idx) => {
                    const isCurrent = step.status === "PENDING" && step.stepOrder === request.currentStepOrder;
                    return (
                      <div key={step.id} className="flex items-start gap-4 relative">
                        <div className={`z-10 flex-shrink-0 rounded-full p-1 ${isCurrent ? "bg-amber-100 ring-2 ring-amber-400" : "bg-background"}`}>
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
