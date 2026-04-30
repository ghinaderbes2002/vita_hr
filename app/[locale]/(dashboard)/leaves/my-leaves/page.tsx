"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Eye, Edit, Trash2, Send, XCircle, CheckCircle2, UserCheck, Clock } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/features/leave-requests/status-badge";
import { HourlyLeaveForm } from "@/components/features/leave-requests/hourly-leave-form";
import {
  useMyLeaveRequests,
  useDeleteLeaveRequest,
  useSubmitLeaveRequest,
  useCancelLeaveRequest,
  usePendingSubstituteRequests,
  useSubstituteResponse,
} from "@/lib/hooks/use-leave-requests";
import { LeaveRequest } from "@/lib/api/leave-requests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyLeaveBalances } from "@/lib/hooks/use-leave-balances";
import { Card, CardContent } from "@/components/ui/card";
import { HolidaysCalendarView } from "@/components/features/holidays/holidays-calendar-view";

export default function MyLeavesPage() {
  const t = useTranslations();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [substituteDialogOpen, setSubstituteDialogOpen] = useState(false);
  const [substituteRequest, setSubstituteRequest] = useState<LeaveRequest | null>(null);
  const [substituteNotes, setSubstituteNotes] = useState("");
  const [substituteAction, setSubstituteAction] = useState<"approve" | "reject">("approve");
  const [hourlyLeaveDialogOpen, setHourlyLeaveDialogOpen] = useState(false);

  const { data, isLoading } = useMyLeaveRequests();
  const { data: myBalances } = useMyLeaveBalances(new Date().getFullYear());
  const sickBalance = (Array.isArray(myBalances) ? myBalances : [])
    .find((b: any) => b.leaveType?.code === "SICK");
  const deleteRequest = useDeleteLeaveRequest();
  const submitRequest = useSubmitLeaveRequest();
  const cancelRequest = useCancelLeaveRequest();
  const { data: pendingSubstitute, isLoading: loadingSubstitute, isFetching: fetchingSubstitute } = usePendingSubstituteRequests();
  const substituteResponse = useSubstituteResponse();

  // Extract array from API response
  const requests = (data as any)?.items || (data as any)?.data?.items || [];

  const draftRequests = requests.filter((r: LeaveRequest) => r.status === "DRAFT");
  const pendingRequests = requests.filter((r: LeaveRequest) =>
    ["PENDING_MANAGER", "PENDING_HR", "MANAGER_APPROVED"].includes(r.status)
  );
  const approvedRequests = requests.filter((r: LeaveRequest) =>
    ["APPROVED", "IN_PROGRESS", "COMPLETED"].includes(r.status)
  );
  const rejectedRequests = requests.filter((r: LeaveRequest) =>
    ["REJECTED", "MANAGER_REJECTED", "CANCELLED"].includes(r.status)
  );

  const handleDelete = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setSubmitDialogOpen(true);
  };

  const handleCancel = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setCancelDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedRequest) {
      await deleteRequest.mutateAsync(selectedRequest.id);
      setDeleteDialogOpen(false);
      setSelectedRequest(null);
    }
  };

  const confirmSubmit = async () => {
    if (selectedRequest) {
      await submitRequest.mutateAsync(selectedRequest.id);
      setSubmitDialogOpen(false);
      setSelectedRequest(null);
    }
  };

  const confirmCancel = async () => {
    if (selectedRequest && cancelReason) {
      await cancelRequest.mutateAsync({ id: selectedRequest.id, data: { reason: cancelReason } });
      setCancelDialogOpen(false);
      setSelectedRequest(null);
      setCancelReason("");
    }
  };

  const openSubstituteDialog = (request: LeaveRequest, action: "approve" | "reject") => {
    setSubstituteRequest(request);
    setSubstituteAction(action);
    setSubstituteNotes("");
    setSubstituteDialogOpen(true);
  };

  const confirmSubstituteResponse = async () => {
    if (!substituteRequest) return;
    await substituteResponse.mutateAsync({
      id: substituteRequest.id,
      approved: substituteAction === "approve",
      notes: substituteNotes || undefined,
    });
    setSubstituteDialogOpen(false);
    setSubstituteRequest(null);
    setSubstituteNotes("");
  };

  const pendingSubstituteList: LeaveRequest[] = Array.isArray(pendingSubstitute) ? pendingSubstitute : [];

  const renderTable = (requestsList: LeaveRequest[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("leaves.fields.leaveType")}</TableHead>
          <TableHead>{t("leaves.fields.startDate")}</TableHead>
          <TableHead>{t("leaves.fields.endDate")}</TableHead>
          <TableHead>المدة</TableHead>
          <TableHead>الوقت</TableHead>
          <TableHead>{t("leaves.fields.status")}</TableHead>
          <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-8" /></TableCell>
            </TableRow>
          ))
        ) : requestsList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              {t("common.noData")}
            </TableCell>
          </TableRow>
        ) : (
          requestsList.map((request: LeaveRequest) => (
            <TableRow key={request.id}>
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
                <StatusBadge status={request.status} />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {request.status === "DRAFT" && (
                      <>
                        <DropdownMenuItem onClick={() => router.push(`/leaves/edit/${request.id}`)}>
                          <Edit className="h-4 w-4 ml-2" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSubmit(request)}>
                          <Send className="h-4 w-4 ml-2" />
                          إرسال للموافقة
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(request)} className="text-destructive">
                          <Trash2 className="h-4 w-4 ml-2" />
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </>
                    )}
                    {["PENDING_MANAGER", "PENDING_HR", "MANAGER_APPROVED"].includes(request.status) && (
                      <DropdownMenuItem onClick={() => handleCancel(request)} className="text-destructive">
                        <XCircle className="h-4 w-4 ml-2" />
                        إلغاء الطلب
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
        title={t("leaves.myRequests")}
        description="عرض وإدارة طلبات الإجازات الخاصة بك"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setHourlyLeaveDialogOpen(true)}>
              <Clock className="h-4 w-4 ml-2" />
              إجازة ساعية
            </Button>
            <Button onClick={() => router.push("/leaves/new-request")}>
              <Plus className="h-4 w-4 ml-2" />
              {t("leaves.newRequest")}
            </Button>
          </div>
        }
      />

      {sickBalance && (
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">الإجازة المرضية</span>
                <span className="text-muted-foreground">
                  {sickBalance.usedDays} / {sickBalance.totalDays} يوم مستخدم
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-400 transition-all"
                  style={{ width: `${Math.min(100, (sickBalance.usedDays / sickBalance.totalDays) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                المتبقي: {sickBalance.remainingDays} يوم
                {" · "}رصيد مدى الحياة (ليس سنوياً)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {(loadingSubstitute || fetchingSubstitute || pendingSubstituteList.length > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <UserCheck className="h-5 w-5" />
            <span>طلبات تنتظر موافقتي كبديل ({pendingSubstituteList.length})</span>
          </div>
          {loadingSubstitute ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {pendingSubstituteList.map((req) => (
                <div key={req.id} className="flex items-center justify-between bg-white rounded-md border p-3">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">
                      {req.employee?.firstNameAr} {req.employee?.lastNameAr}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {req.leaveType?.nameAr} — {format(new Date(req.startDate), "PPP", { locale: ar })} إلى {format(new Date(req.endDate), "PPP", { locale: ar })} ({req.totalDays} أيام)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50" onClick={() => openSubstituteDialog(req, "approve")}>
                      <CheckCircle2 className="h-4 w-4 ml-1" />
                      موافقة
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" onClick={() => openSubstituteDialog(req, "reject")}>
                      <XCircle className="h-4 w-4 ml-1" />
                      رفض
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">الكل ({requests.length})</TabsTrigger>
          <TabsTrigger value="draft">مسودة ({draftRequests.length})</TabsTrigger>
          <TabsTrigger value="pending">معلق ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="approved">معتمد ({approvedRequests.length})</TabsTrigger>
          <TabsTrigger value="rejected">مرفوض ({rejectedRequests.length})</TabsTrigger>
          <TabsTrigger value="holidays">العطل الرسمية</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="rounded-md border">
          {renderTable(requests)}
        </TabsContent>

        <TabsContent value="draft" className="rounded-md border">
          {renderTable(draftRequests)}
        </TabsContent>

        <TabsContent value="pending" className="rounded-md border">
          {renderTable(pendingRequests)}
        </TabsContent>

        <TabsContent value="approved" className="rounded-md border">
          {renderTable(approvedRequests)}
        </TabsContent>

        <TabsContent value="rejected" className="rounded-md border">
          {renderTable(rejectedRequests)}
        </TabsContent>

        <TabsContent value="holidays">
          <HolidaysCalendarView />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("messages.confirmDelete")}
        description={t("messages.actionCantUndo")}
        onConfirm={confirmDelete}
        variant="destructive"
      />

      <ConfirmDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        title="إرسال الطلب للموافقة"
        description="هل أنت متأكد من إرسال هذا الطلب للموافقة؟ لن تتمكن من تعديله بعد الإرسال."
        onConfirm={confirmSubmit}
      />

      <Dialog open={substituteDialogOpen} onOpenChange={setSubstituteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{substituteAction === "approve" ? "تأكيد الموافقة كبديل" : "تأكيد الرفض كبديل"}</DialogTitle>
            <DialogDescription>
              {substituteRequest && `${substituteRequest.employee?.firstNameAr} ${substituteRequest.employee?.lastNameAr} — ${substituteRequest.leaveType?.nameAr}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sub-notes">ملاحظات (اختياري)</Label>
            <Textarea
              id="sub-notes"
              rows={3}
              value={substituteNotes}
              onChange={(e) => setSubstituteNotes(e.target.value)}
              placeholder="أضف ملاحظة إن أردت..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubstituteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={substituteAction === "approve" ? "default" : "destructive"}
              onClick={confirmSubstituteResponse}
              disabled={substituteResponse.isPending}
            >
              {substituteAction === "approve" ? "موافق" : "رفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إلغاء طلب الإجازة</DialogTitle>
            <DialogDescription>الرجاء كتابة سبب الإلغاء</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">سبب الإلغاء</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="اكتب سبب الإلغاء..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmCancel}>
              إلغاء الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog الإجازة الساعية */}
      <Dialog open={hourlyLeaveDialogOpen} onOpenChange={setHourlyLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>طلب إجازة ساعية</DialogTitle>
            <DialogDescription>تقديم طلب إجازة بالساعات ليوم واحد</DialogDescription>
          </DialogHeader>
          <HourlyLeaveForm
            onSuccess={() => setHourlyLeaveDialogOpen(false)}
            onCancel={() => setHourlyLeaveDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
