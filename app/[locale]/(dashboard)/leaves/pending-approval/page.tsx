"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Check, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/features/leave-requests/status-badge";
import {
  useLeaveRequests,
  useApproveManager,
  useRejectManager,
  useApproveHr,
  useRejectHr,
} from "@/lib/hooks/use-leave-requests";
import { LeaveRequest } from "@/lib/api/leave-requests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { Pagination } from "@/components/shared/pagination";

export default function PendingApprovalPage() {
  const t = useTranslations();
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [actionType, setActionType] = useState<"manager" | "hr">("manager");

  const { hasRole } = usePermissions();
  const isHrManager = hasRole("hr_manager") || hasRole("مدير الموارد البشرية");

  const [activeTab, setActiveTab] = useState<"manager" | "hr">(isHrManager ? "hr" : "manager");
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  const activeStatus = activeTab === "manager" ? "PENDING_MANAGER" : "PENDING_HR";
  const { data, isLoading } = useLeaveRequests({ status: activeStatus as any, page, limit: LIMIT });
  const approveManager = useApproveManager();
  const rejectManager = useRejectManager();
  const approveHr = useApproveHr();
  const rejectHr = useRejectHr();

  const requests = (data as any)?.items || (data as any)?.data?.items || [];
  const total = (data as any)?.total ?? (data as any)?.data?.total ?? 0;
  const totalPages = (data as any)?.totalPages ?? (data as any)?.data?.totalPages ?? Math.ceil(total / LIMIT);
  const meta = total > 0 ? { total, totalPages } : null;

  const handleApprove = (request: LeaveRequest, type: "manager" | "hr") => {
    setSelectedRequest(request);
    setActionType(type);
    setApproveDialogOpen(true);
  };

  const handleReject = (request: LeaveRequest, type: "manager" | "hr") => {
    setSelectedRequest(request);
    setActionType(type);
    setRejectDialogOpen(true);
  };

  const handleViewDetails = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setDetailsDialogOpen(true);
  };

  const confirmApprove = async () => {
    if (selectedRequest) {
      if (actionType === "manager") {
        await approveManager.mutateAsync({ id: selectedRequest.id, data: { notes } });
      } else {
        await approveHr.mutateAsync({ id: selectedRequest.id, data: { notes } });
      }
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      setNotes("");
    }
  };

  const confirmReject = async () => {
    if (selectedRequest && rejectReason) {
      if (actionType === "manager") {
        await rejectManager.mutateAsync({ id: selectedRequest.id, data: { reason: rejectReason } });
      } else {
        await rejectHr.mutateAsync({ id: selectedRequest.id, data: { reason: rejectReason } });
      }
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason("");
    }
  };

  const renderTable = (requestsList: LeaveRequest[], type: "manager" | "hr") => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>الموظف</TableHead>
          <TableHead>{t("leaves.fields.leaveType")}</TableHead>
          <TableHead>{t("leaves.fields.startDate")}</TableHead>
          <TableHead>{t("leaves.fields.endDate")}</TableHead>
          <TableHead>المدة</TableHead>
          <TableHead>الوقت</TableHead>
          <TableHead>{t("common.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            </TableRow>
          ))
        ) : requestsList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="h-24 text-center">
              {t("common.noData")}
            </TableCell>
          </TableRow>
        ) : (
          requestsList.map((request: LeaveRequest) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">
                {request.employee?.firstNameAr} {request.employee?.lastNameAr}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" style={{ backgroundColor: request.leaveType?.color }}>
                    {request.leaveType?.nameAr}
                  </Badge>
                  {request.isHourlyLeave && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                      ساعية
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{format(new Date(request.startDate), "PPP", { locale: ar })}</TableCell>
              <TableCell>{format(new Date(request.endDate), "PPP", { locale: ar })}</TableCell>
              <TableCell>
                {request.isHourlyLeave && request.equivalentDays != null
                  ? `${request.equivalentDays.toFixed(2)} يوم`
                  : `${request.totalDays} ${t("common.days")}`}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {request.isHourlyLeave && request.startTime
                  ? `${request.startTime} - ${request.endTime}`
                  : "—"}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleViewDetails(request)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleApprove(request, type)}
                  >
                    <Check className="h-4 w-4 ml-1" />
                    موافقة
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(request, type)}
                  >
                    <X className="h-4 w-4 ml-1" />
                    رفض
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("leaves.pendingApproval")}
        description="الموافقة على طلبات الإجازات المعلقة"
      />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setPage(1); }} className="space-y-4">
        <TabsList>
          {!isHrManager && (
            <TabsTrigger value="manager">بانتظار موافقتك ({activeTab === "manager" ? total : ""})</TabsTrigger>
          )}
          <TabsTrigger value="hr">بانتظار موافقة HR ({activeTab === "hr" ? total : ""})</TabsTrigger>
        </TabsList>

        {!isHrManager && (
          <TabsContent value="manager" className="rounded-md border">
            {renderTable(requests, "manager")}
          </TabsContent>
        )}

        <TabsContent value="hr" className="rounded-md border">
          {renderTable(requests, "hr")}
        </TabsContent>
      </Tabs>

      {meta && (
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={LIMIT}
          onPageChange={setPage}
        />
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>الموافقة على طلب الإجازة</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من الموافقة على طلب الإجازة؟
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">ملاحظات (اختياري)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف ملاحظات..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={confirmApprove}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب الإجازة</DialogTitle>
            <DialogDescription>
              الرجاء كتابة سبب الرفض
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">سبب الرفض *</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="اكتب سبب الرفض..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectReason}
            >
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل طلب الإجازة</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">الموظف</label>
                      <p className="font-medium">
                        {selectedRequest.employee?.firstNameAr} {selectedRequest.employee?.lastNameAr}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">نوع الإجازة</label>
                      <p>
                        <Badge variant="outline" style={{ backgroundColor: selectedRequest.leaveType?.color }}>
                          {selectedRequest.leaveType?.nameAr}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">تاريخ البداية</label>
                      <p className="font-medium">
                        {format(new Date(selectedRequest.startDate), "PPP", { locale: ar })}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">تاريخ النهاية</label>
                      <p className="font-medium">
                        {format(new Date(selectedRequest.endDate), "PPP", { locale: ar })}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">عدد الأيام</label>
                      <p className="font-medium">{selectedRequest.totalDays} يوم</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">الحالة</label>
                      <div>
                        <StatusBadge status={selectedRequest.status} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">السبب</label>
                    <p className="font-medium whitespace-pre-wrap">{selectedRequest.reason}</p>
                  </div>
                  {selectedRequest.substitute && (
                    <div>
                      <label className="text-sm text-muted-foreground">البديل</label>
                      <p className="font-medium">
                        {selectedRequest.substitute.firstNameAr} {selectedRequest.substitute.lastNameAr}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailsDialogOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
