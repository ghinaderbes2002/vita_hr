"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ArrowRight, CheckCircle2, XCircle, Clock, SkipForward, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";
import { RequestStatusBadge } from "@/components/features/requests/request-status-badge";
import { useRequest, useRequestApprovals, useRequestSteps, useApproveRequest, useRejectRequest, useSubmitExitInterview, useHrApproveRequest, useHrRejectRequest } from "@/lib/hooks/use-requests";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { RequestActionDialog } from "@/components/features/requests/request-action-dialog";
import { useRef, useState } from "react";
import { ApprovalStep, ApprovalStatus } from "@/types";
import { assetUrl } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Upload, Download, CheckCircle } from "lucide-react";
import { useUploadHiringPdf } from "@/lib/hooks/use-requests";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { apiClient } from "@/lib/api/client";


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
  complaintDescription: "تفاصيل الشكوى",
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
  overtimeDate: "تاريخ العمل الإضافي",
  startTime: "وقت البدء",
  endTime: "وقت الانتهاء",
  totalHours: "إجمالي الساعات",
  tasks: "المهام",
  missionType: "نوع المهمة",
  totalDays: "إجمالي الأيام",
  missionReason: "سبب المهمة",
  delegationType: "نوع التفويض",
  delegateEmployeeId: "الموظف المفوَّض إليه",
  delegateJobTitle: "مسمى المفوَّض إليه",
  effectiveDate: "تاريخ الاستقالة",
  reasons: "أسباب الاستقالة",
  currentDepartmentId: "القسم الحالي",
  currentJobTitleId: "المسمى الحالي",
  newDepartmentId: "القسم الجديد",
  newJobTitleId: "المسمى الجديد",
  violationDescription: "وصف المخالفة",
  employees: "الموظفون",
  rewardType: "نوع المكافأة",
  employeeId: "الموظف",
  employeeIds: "الموظف",
  resignationReason: "سبب الاستقالة",
  workEnvironmentRating: "تقييم بيئة العمل",
  managementRating: "تقييم الإدارة",
  suggestions: "اقتراحات للتحسين",
  wouldRejoin: "يرغب بالعودة مستقبلاً",
};

function formatDetailKey(key: string): string {
  return DETAIL_KEY_LABELS[key] || key;
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function renderDetailValue(value: any, employeeMap: Record<string, string> = {}) {
  if (value === null || value === undefined) return "—";

  // Array
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";

    // Array of primitives
    if (typeof value[0] !== "object") {
      const labels = value.map((v: any) =>
        typeof v === "string" && isUUID(v) ? (employeeMap[v] ?? v) : String(v)
      );
      return <span>{labels.join("، ")}</span>;
    }

    // Array of objects — render as mini cards
    return (
      <div className="space-y-2 w-full">
        {value.map((item: any, i: number) => (
          <div key={i} className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
            {Object.entries(item).map(([k, v]) => {
              if (k === "departmentId") return null;
              const display = typeof v === "string" && isUUID(v as string)
                ? (employeeMap[v as string] ?? null)
                : String(v ?? "—");
              if (display === null) return null;
              return (
                <div key={k} className="flex items-start justify-between gap-2 text-xs">
                  <span className="text-muted-foreground shrink-0">{formatDetailKey(k)}:</span>
                  <span className="font-medium text-right">{display}</span>
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

  // UUID string — look up name, hide raw ID if not found
  if (typeof value === "string" && isUUID(value)) {
    return employeeMap[value] ? <span>{employeeMap[value]}</span> : null;
  }

  return <span>{String(value)}</span>;
}

const APPROVER_ROLE_LABELS: Record<string, string> = {
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

const MAINTENANCE_STATUS_ORDER = [
  "PENDING_MANAGER", "PENDING_LOGISTICS", "PENDING_EXECUTIVE", "ASSIGNED", "DONE",
];

function buildMaintenancePath(req: any): ApprovalStep[] {
  const status: string = req.status ?? "";
  const rank = MAINTENANCE_STATUS_ORDER.indexOf(status);
  const isRejected = status === "REJECTED";

  // Infer rejected stage from direct backend fields
  const rejectedAtManager =
    isRejected && req.managerStatus === "REJECTED";
  const rejectedAtLogistics =
    isRejected && req.logisticsStatus === "REJECTED";
  const rejectedAtExecutive =
    isRejected && req.executiveStatus === "REJECTED";

  // Was the executive step ever used?
  const hadExecutive =
    status === "PENDING_EXECUTIVE" ||
    req.executiveStatus != null ||
    rank >= 3 && req.executiveReviewedAt != null;

  const mkStep = (
    id: string,
    order: number,
    role: string,
    st: ApprovalStatus,
    reviewedAt?: string | null,
    notes?: string | null,
  ): ApprovalStep => ({
    id,
    stepOrder: order,
    approverRole: role,
    status: st,
    reviewedAt: reviewedAt ?? undefined,
    notes: notes ?? undefined,
  } as any);

  // ── Step 1: Manager ──
  const mgSt: ApprovalStatus =
    rejectedAtManager ? "REJECTED" : rank >= 1 || req.managerStatus === "APPROVED" ? "APPROVED" : "PENDING";

  // ── Step 2: Logistics ──
  const lgSt: ApprovalStatus =
    rejectedAtLogistics ? "REJECTED"
    : rank >= 2 || req.logisticsStatus === "APPROVED" ? "APPROVED"
    : rank === 1 ? "PENDING"
    : "PENDING";

  // ── Step 3: Executive ──
  const execSt: ApprovalStatus =
    !hadExecutive ? "SKIPPED"
    : rejectedAtExecutive ? "REJECTED"
    : rank >= 3 || req.executiveStatus === "APPROVED" ? "APPROVED"
    : rank === 2 ? "PENDING"
    : "PENDING";

  // ── Step 4: Assigned employee ──
  const assignedSt: ApprovalStatus =
    status === "DONE" ? "APPROVED"
    : status === "ASSIGNED" ? "PENDING"
    : "PENDING";

  return [
    mkStep("m1", 1, "DIRECT_MANAGER", mgSt, req.managerReviewedAt, req.managerNotes),
    mkStep("m2", 2, "LOGISTICS", lgSt, req.logisticsReviewedAt ?? req.logisticsProcessedAt, req.logisticsNotes),
    mkStep("m3", 3, "CEO", execSt, req.executiveReviewedAt, req.executiveNotes),
    mkStep("m4", 4, "ASSIGNED_EMPLOYEE", assignedSt, req.completedAt ?? undefined),
  ];
}

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
  const locale = useLocale();
  const id = params.id as string;

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [hrApproveOpen, setHrApproveOpen] = useState(false);
  const [hrRejectOpen, setHrRejectOpen] = useState(false);
  const [approveExtra, setApproveExtra] = useState<{ recommendation: string; penaltyDays: string; amount: string }>({ recommendation: "", penaltyDays: "", amount: "" });
  const { hasPermission, isAdmin, hasRole } = usePermissions();
  const canHrApprove = isAdmin() || hasPermission("requests:hr-approve");
  const canHrReject  = isAdmin() || hasPermission("requests:hr-reject");
  const canAnyApprove = isAdmin() || hasPermission("requests:approve") || hasPermission("requests:manager-approve") || hasPermission("requests:hr-approve") || hasPermission("requests:qs-approve") || hasPermission("requests:ceo-approve");
  const canAnyReject  = isAdmin() || hasPermission("requests:reject") || hasPermission("requests:manager-approve") || hasPermission("requests:hr-approve") || hasPermission("requests:qs-approve") || hasPermission("requests:ceo-approve");
  const uploadHiringPdf = useUploadHiringPdf();
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { return; }
    uploadHiringPdf.mutate({ id, file });
  };

  const handleDownloadPdf = async () => {
    const SERVER_ORIGIN = (() => {
      try { return new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").origin; } catch { return "http://localhost:8000"; }
    })();
    const pdfUrl = (request as any)?.hiringContractPdfUrl;
    const absoluteUrl = pdfUrl?.startsWith("http") ? pdfUrl : `${SERVER_ORIGIN}/${(pdfUrl || "").replace(/^\//, "")}`;
    const res = await apiClient.get(absoluteUrl, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  const { data: empListData } = useEmployeesBasicList();
  const employeeMap: Record<string, string> = {};
  for (const emp of (Array.isArray(empListData) ? empListData : [])) {
    employeeMap[(emp as any).id] = `${(emp as any).firstNameAr} ${(emp as any).lastNameAr}`;
  }

  const { data: request, isLoading, error: requestError } = useRequest(id);
  const { data: stepsData, isLoading: stepsLoading } = useRequestSteps(id);
  const { data: approvals, isLoading: approvalsLoading } = useRequestApprovals(id);
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const hrApproveRequest = useHrApproveRequest();
  const hrRejectRequest = useHrRejectRequest();
  const submitExitInterview = useSubmitExitInterview();

  const [exitForm, setExitForm] = useState({
    resignationReason: "",
    workEnvironmentRating: "",
    managementRating: "",
    suggestions: "",
    wouldRejoin: "",
  });

  // prefer /steps endpoint, fall back to /approvals
  const rawSteps = Array.isArray(stepsData) && stepsData.length > 0 ? stepsData : (Array.isArray(approvals) ? approvals : []);
  const isMaintenance = (request as any)?.type === "MAINTENANCE";
  const steps: ApprovalStep[] =
    isMaintenance && rawSteps.length === 0
      ? buildMaintenancePath(request)
      : rawSteps;
  const isStepsLoading = stepsLoading && approvalsLoading;

  // Show approve/reject only if there's a PENDING step matching the current user's role
  const hasPendingStepForUser = steps.some(
    (s) => s.status === "PENDING" && hasRole(s.approverRole as any)
  );

  const handleApprove = async (notes: string) => {
    const body: import("@/types").ApproveRequestBody = { notes: notes || undefined };
    if (approveExtra.recommendation) body.executiveRecommendation = approveExtra.recommendation;
    if (approveExtra.penaltyDays) body.penaltyDays = Number(approveExtra.penaltyDays);
    if (approveExtra.amount) body.amount = Number(approveExtra.amount);
    await approveRequest.mutateAsync({ id, body });
    setApproveOpen(false);
    setApproveExtra({ recommendation: "", penaltyDays: "", amount: "" });
  };

  const handleHrApprove = async (notes: string) => {
    const body: import("@/types").ApproveRequestBody = { notes: notes || undefined };
    if (approveExtra.recommendation) body.executiveRecommendation = approveExtra.recommendation;
    if (approveExtra.penaltyDays) body.penaltyDays = Number(approveExtra.penaltyDays);
    if (approveExtra.amount) body.amount = Number(approveExtra.amount);
    await hrApproveRequest.mutateAsync({ id, body });
    setHrApproveOpen(false);
    setApproveExtra({ recommendation: "", penaltyDays: "", amount: "" });
    if (request?.type === "TRANSFER" && request?.employeeId) {
      router.push(`/${locale}/employees/${request.employeeId}`);
    } else if (request?.type === "HIRING_REQUEST") {
      router.push(`/${locale}/interview-positions`);
    }
  };

  const handleReject = async (reason: string) => {
    await rejectRequest.mutateAsync({ id, reason });
    setRejectOpen(false);
  };

  const handleHrReject = async (reason: string) => {
    await hrRejectRequest.mutateAsync({ id, notes: reason });
    setHrRejectOpen(false);
  };

  const isPenaltyOrReward = request?.type === "PENALTY_PROPOSAL" || request?.type === "REWARD";
  const isTransfer = request?.type === "TRANSFER";
  const usesUnifiedApproval = request?.status === "IN_APPROVAL" || isPenaltyOrReward || request?.type === "OVERTIME_EMPLOYEE" || isTransfer;

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

  if (!isLoading && (requestError || !request)) {
    const is403 = (requestError as any)?.response?.status === 403;
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">
          {is403 ? "ليس لديك صلاحية لعرض هذا الطلب" : "الطلب غير موجود"}
        </p>
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
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowRight className="h-4 w-4 ml-2" />
              {t("common.back")}
            </Button>
            {/* unified approve/reject — only if user has a PENDING step */}
            {usesUnifiedApproval && request.status === "IN_APPROVAL" && hasPendingStepForUser && (canAnyApprove || canAnyReject) && (
              <>
                {canAnyApprove && (
                  <Button
                    className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setApproveOpen(true)}
                    disabled={approveRequest.isPending}
                  >
                    <CheckCircle className="h-4 w-4" />
                    موافقة
                  </Button>
                )}
                {canAnyReject && (
                  <Button
                    variant="destructive"
                    className="gap-1.5"
                    onClick={() => setRejectOpen(true)}
                    disabled={rejectRequest.isPending}
                  >
                    <XCircle className="h-4 w-4" />
                    رفض
                  </Button>
                )}
              </>
            )}
            {/* Other request types — HR approve/reject */}
            {!usesUnifiedApproval && (request.status === "PENDING_HR" || request.status === "IN_APPROVAL") && (
              <>
                {canHrApprove && (
                  <Button
                    className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setHrApproveOpen(true)}
                    disabled={hrApproveRequest.isPending}
                  >
                    <CheckCircle className="h-4 w-4" />
                    موافقة
                  </Button>
                )}
                {canHrReject && (
                  <Button
                    variant="destructive"
                    className="gap-1.5"
                    onClick={() => setHrRejectOpen(true)}
                    disabled={hrRejectRequest.isPending}
                  >
                    <XCircle className="h-4 w-4" />
                    رفض
                  </Button>
                )}
              </>
            )}
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
                    href={assetUrl(request.attachmentUrl)}
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
                if (key === "totalHours" && value != null)
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-muted-foreground text-sm shrink-0">{formatDetailKey(key)}</span>
                        <span className="text-sm font-medium text-right">{String(value)} ساعة</span>
                      </div>
                      <Separator className="mt-3" />
                    </div>
                  );
                if (key === "totalDays" && value != null)
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-muted-foreground text-sm shrink-0">{formatDetailKey(key)}</span>
                        <span className="text-sm font-medium text-right">{String(value)} يوم</span>
                      </div>
                      <Separator className="mt-3" />
                    </div>
                  );

                const rendered = renderDetailValue(value, employeeMap);
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

      {/* Hiring Contract PDF */}
      {request.type === "HIRING_REQUEST" && (
        <Card className={(request as any).hiringContractPdfUrl ? "border-green-200" : "border-blue-200"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              عقد التوظيف
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(request as any).hiringContractPdfUrl ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">تم رفع عقد التوظيف</p>
                    {(request as any).hiringCompletedAt && (
                      <p className="text-xs text-green-600 mt-0.5">
                        {new Date((request as any).hiringCompletedAt).toLocaleDateString("en-GB")}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 border-green-300" onClick={handleDownloadPdf}>
                  <Download className="h-3.5 w-3.5" />
                  تحميل العقد
                </Button>
              </div>
            ) : request.status === "APPROVED" && hasPermission("requests:hiring:complete") ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  تمت الموافقة على طلب التوظيف. يمكنك رفع عقد التوظيف بصيغة PDF.
                </p>
                <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
                <Button
                  variant="outline"
                  className="gap-1.5"
                  disabled={uploadHiringPdf.isPending}
                  onClick={() => pdfInputRef.current?.click()}
                >
                  {uploadHiringPdf.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Upload className="h-4 w-4" />}
                  {uploadHiringPdf.isPending ? "جاري الرفع..." : "رفع عقد التوظيف (PDF)"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {request.status !== "APPROVED" ? "سيظهر رفع العقد بعد الموافقة على الطلب" : "لا يوجد عقد مرفوع بعد"}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* PENALTY_PROPOSAL — ملخص بصري */}
      {request.type === "PENALTY_PROPOSAL" && request.details && (
        <Card className={`border-2 ${(request.details as any).category === "MATERIAL" ? "border-red-200 bg-red-50/30" : "border-amber-200 bg-amber-50/30"}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ملخص الجزاء المقترح</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">التصنيف</span>
              <Badge variant="outline" className={(request.details as any).category === "MATERIAL" ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700"}>
                {(request.details as any).category === "MATERIAL" ? "مادي" : "معنوي"}
              </Badge>
            </div>
            {(request.details as any).penaltyType && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">نوع العقوبة</span>
                <span className="font-medium">
                  {({ NOTICE: "لفت نظر", WARNING_1: "إنذار أول", WARNING_2: "إنذار ثانٍ", DAYS_DEDUCTION: "خصم أيام" } as any)[(request.details as any).penaltyType] ?? (request.details as any).penaltyType}
                </span>
              </div>
            )}
            {(request.details as any).category === "MATERIAL" && (request.details as any).penaltyDays && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">أيام الخصم</span>
                <span className="font-semibold text-red-700">{(request.details as any).penaltyDays} يوم</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 border-t pt-2">
              {(request.details as any).category === "MATERIAL"
                ? `سيُخصم ${(request.details as any).penaltyDays ?? "؟"} يوم من راتب الموظف للشهر الذي يُعتمد فيه`
                : "إجراء معنوي بلا أثر مالي"}
            </p>
            {(request.details as any).executiveRecommendation && (
              <div className="border-t pt-2 mt-1">
                <p className="text-xs text-muted-foreground mb-1">التوصية التنفيذية</p>
                <p className="text-sm">{(request.details as any).executiveRecommendation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Exit Interview Form — HR only */}
      {request.status === "PENDING_EXIT_INTERVIEW" && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-orange-500" />
              استمارة مقابلة الخروج
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(request as any).details?.exitInterview ? (
              <div className="rounded-lg border p-4 bg-green-50 space-y-2">
                <p className="text-sm font-medium text-green-700">تم تقديم استمارة الخروج</p>
                <div className="space-y-1">
                  {Object.entries((request as any).details.exitInterview).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{DETAIL_KEY_LABELS[k] || k}:</span>
                      <span className="font-medium">
                        {k === "wouldRejoin" ? (v ? "نعم" : "لا") : String(v ?? "—")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : canHrApprove ? (
              <>
                <p className="text-sm text-muted-foreground">
                  تمت موافقة المدير المباشر والموارد البشرية. يرجى إجراء مقابلة الخروج مع الموظف وتعبئة الاستمارة.
                </p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>سبب الاستقالة *</Label>
                    <Textarea
                      rows={3}
                      value={exitForm.resignationReason}
                      onChange={(e) => setExitForm((p) => ({ ...p, resignationReason: e.target.value }))}
                      placeholder="سبب الاستقالة كما أفصح عنه الموظف..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>تقييم بيئة العمل (1–5)</Label>
                      <Input
                        type="number" min={1} max={5}
                        value={exitForm.workEnvironmentRating}
                        onChange={(e) => setExitForm((p) => ({ ...p, workEnvironmentRating: e.target.value }))}
                        placeholder="4"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>تقييم الإدارة (1–5)</Label>
                      <Input
                        type="number" min={1} max={5}
                        value={exitForm.managementRating}
                        onChange={(e) => setExitForm((p) => ({ ...p, managementRating: e.target.value }))}
                        placeholder="4"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>اقتراحات للتحسين</Label>
                    <Textarea
                      rows={2}
                      value={exitForm.suggestions}
                      onChange={(e) => setExitForm((p) => ({ ...p, suggestions: e.target.value }))}
                      placeholder="اقتراحات الموظف لتحسين بيئة العمل..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>هل يرغب بالعودة مستقبلاً؟</Label>
                    <div className="flex gap-3">
                      {["نعم", "لا"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setExitForm((p) => ({ ...p, wouldRejoin: opt === "نعم" ? "true" : "false" }))}
                          className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                            exitForm.wouldRejoin === (opt === "نعم" ? "true" : "false")
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-muted-foreground/30 hover:border-primary/50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!exitForm.resignationReason.trim() || submitExitInterview.isPending}
                    onClick={() => submitExitInterview.mutate({
                      id,
                      data: {
                        resignationReason: exitForm.resignationReason,
                        workEnvironmentRating: exitForm.workEnvironmentRating ? Number(exitForm.workEnvironmentRating) : undefined,
                        managementRating: exitForm.managementRating ? Number(exitForm.managementRating) : undefined,
                        suggestions: exitForm.suggestions || undefined,
                        wouldRejoin: exitForm.wouldRejoin ? exitForm.wouldRejoin === "true" : undefined,
                      },
                    })}
                  >
                    {submitExitInterview.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                    تسجيل مقابلة الخروج
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                بانتظار الموارد البشرية لإجراء مقابلة الخروج
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* CEO pending notice for RESIGNATION / TRANSFER */}
      {(request.type === "RESIGNATION" || request.type === "TRANSFER") && request.status === "IN_APPROVAL" &&
        steps.some((s) => (s as any).approverRole === "CEO" && s.status === "PENDING") && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500 shrink-0" />
              <p className="text-sm text-blue-700">
                {request.type === "TRANSFER"
                  ? "بانتظار موافقة المدير التنفيذي على طلب النقل"
                  : "بانتظار موافقة المدير التنفيذي على طلب الاستقالة"}
              </p>
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
          {isStepsLoading ? (
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
                              تم تخطي هذه الخطوة تلقائياً (المدير المباشر = المدير التنفيذي)
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
          )}
        </CardContent>
      </Card>

      <RequestActionDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        action="approve"
        onConfirm={handleApprove}
        isLoading={approveRequest.isPending}
        extraContent={(isPenaltyOrReward || isTransfer) ? (
          <div className="space-y-3 border-t pt-3 mt-1">
            <div className="space-y-1.5">
              <Label className="text-sm">{isTransfer ? "التوصية (اختياري)" : "التوصية التنفيذية (اختياري)"}</Label>
              <Textarea rows={2} value={approveExtra.recommendation} onChange={(e) => setApproveExtra((p) => ({ ...p, recommendation: e.target.value }))} placeholder="أضف توصيتك..." />
            </div>
            {request?.type === "PENALTY_PROPOSAL" && (request as any).details?.category === "MATERIAL" && (
              <div className="space-y-1.5">
                <Label className="text-sm">تأكيد أيام الخصم</Label>
                <Input type="number" min={0.5} step={0.5} value={approveExtra.penaltyDays} onChange={(e) => setApproveExtra((p) => ({ ...p, penaltyDays: e.target.value }))} placeholder={(request as any).details?.penaltyDays?.toString() ?? "أيام الخصم"} />
              </div>
            )}
            {request?.type === "REWARD" && (
              <div className="space-y-1.5">
                <Label className="text-sm">تأكيد المبلغ (اختياري)</Label>
                <Input type="number" min={0} value={approveExtra.amount} onChange={(e) => setApproveExtra((p) => ({ ...p, amount: e.target.value }))} placeholder="المبلغ بالعملة المحلية" />
              </div>
            )}
          </div>
        ) : undefined}
      />
      <RequestActionDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        action="reject"
        onConfirm={handleReject}
        isLoading={rejectRequest.isPending}
      />
      <RequestActionDialog
        open={hrApproveOpen}
        onOpenChange={setHrApproveOpen}
        action="approve"
        onConfirm={handleHrApprove}
        isLoading={hrApproveRequest.isPending}
        extraContent={isPenaltyOrReward ? (
          <div className="space-y-3 border-t pt-3 mt-1">
            <div className="space-y-1.5">
              <Label className="text-sm">التوصية التنفيذية (اختياري)</Label>
              <Textarea rows={2} value={approveExtra.recommendation} onChange={(e) => setApproveExtra((p) => ({ ...p, recommendation: e.target.value }))} placeholder="أضف توصيتك..." />
            </div>
            {request?.type === "PENALTY_PROPOSAL" && (request as any).details?.category === "MATERIAL" && (
              <div className="space-y-1.5">
                <Label className="text-sm">تأكيد أيام الخصم</Label>
                <Input type="number" min={0.5} step={0.5} value={approveExtra.penaltyDays} onChange={(e) => setApproveExtra((p) => ({ ...p, penaltyDays: e.target.value }))} placeholder={(request as any).details?.penaltyDays?.toString() ?? ""} />
              </div>
            )}
            {request?.type === "REWARD" && (
              <div className="space-y-1.5">
                <Label className="text-sm">تأكيد المبلغ (اختياري)</Label>
                <Input type="number" min={0} value={approveExtra.amount} onChange={(e) => setApproveExtra((p) => ({ ...p, amount: e.target.value }))} placeholder="المبلغ" />
              </div>
            )}
          </div>
        ) : undefined}
      />
      <RequestActionDialog
        open={hrRejectOpen}
        onOpenChange={setHrRejectOpen}
        action="reject"
        onConfirm={handleHrReject}
        isLoading={hrRejectRequest.isPending}
      />
    </div>
  );
}
