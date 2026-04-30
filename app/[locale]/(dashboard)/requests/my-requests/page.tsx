"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Send, X, Eye, Edit, Trash2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyRequests, useSubmitRequest, useCancelRequest } from "@/lib/hooks/use-requests";
import { NewRequestDialog } from "@/components/features/requests/new-request-dialog";
import { HourlyLeaveForm } from "@/components/features/leave-requests/hourly-leave-form";
import { RequestStatusBadge } from "@/components/features/requests/request-status-badge";
import { RequestActionDialog } from "@/components/features/requests/request-action-dialog";
import { StatusBadge } from "@/components/features/leave-requests/status-badge";
import { HolidaysCalendarView } from "@/components/features/holidays/holidays-calendar-view";
import {
  useMyLeaveRequests,
  useDeleteLeaveRequest,
  useSubmitLeaveRequest,
  useCancelLeaveRequest,
  usePendingSubstituteRequests,
  useSubstituteResponse,
} from "@/lib/hooks/use-leave-requests";
import { LeaveRequest } from "@/lib/api/leave-requests";
import { CheckCircle2, UserCheck } from "lucide-react";
import { Request } from "@/types";
import { toast } from "sonner";

export default function MyRequestsPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();

  // --- Admin requests state ---
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [cancelAdminDialogOpen, setCancelAdminDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Request | null>(null);

  const { data: adminData, isLoading: adminLoading } = useMyRequests();
  const submitAdminRequest = useSubmitRequest();
  const cancelAdminRequest = useCancelRequest();

  const adminRequests: Request[] = Array.isArray(adminData)
    ? adminData
    : (adminData as any)?.data?.items || (adminData as any)?.data || [];

  const handleAdminSubmit = async (req: Request) => {
    try {
      await submitAdminRequest.mutateAsync(req.id);
      toast.success("تم تقديم الطلب بنجاح");
    } catch (error: any) {
      const errData = error?.response?.data;
      const msg =
        errData?.error?.message ||
        errData?.message ||
        (Array.isArray(errData?.error?.message) ? errData.error.message.join(", ") : null) ||
        "حدث خطأ أثناء تقديم الطلب";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    }
  };

  const handleAdminCancelConfirm = async (reason: string) => {
    if (selectedAdmin) {
      await cancelAdminRequest.mutateAsync({ id: selectedAdmin.id, reason });
      setCancelAdminDialogOpen(false);
      setSelectedAdmin(null);
    }
  };

  const [hourlyLeaveDialogOpen, setHourlyLeaveDialogOpen] = useState(false);

  // --- Leave requests state ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitLeaveDialogOpen, setSubmitLeaveDialogOpen] = useState(false);
  const [cancelLeaveDialogOpen, setCancelLeaveDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [cancelLeaveReason, setCancelLeaveReason] = useState("");

  const { data: leaveData, isLoading: leaveLoading } = useMyLeaveRequests();
  const deleteLeaveRequest = useDeleteLeaveRequest();
  const submitLeaveRequest = useSubmitLeaveRequest();
  const cancelLeaveRequest = useCancelLeaveRequest();

  const [substituteDialogOpen, setSubstituteDialogOpen] = useState(false);
  const [substituteRequest, setSubstituteRequest] = useState<LeaveRequest | null>(null);
  const [substituteNotes, setSubstituteNotes] = useState("");
  const [substituteAction, setSubstituteAction] = useState<"approve" | "reject">("approve");
  const { data: pendingSubstitute, isLoading: loadingSubstitute, isFetching: fetchingSubstitute } = usePendingSubstituteRequests();
  const substituteResponse = useSubstituteResponse();
  const pendingSubstituteList: LeaveRequest[] = Array.isArray(pendingSubstitute) ? pendingSubstitute : [];

  const openSubstituteDialog = (req: LeaveRequest, action: "approve" | "reject") => {
    setSubstituteRequest(req);
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

  const leaveRequests: LeaveRequest[] = (leaveData as any)?.items || (leaveData as any)?.data?.items || [];

  const draftLeaves = leaveRequests.filter((r) => r.status === "DRAFT");
  const pendingLeaves = leaveRequests.filter((r) =>
    ["PENDING_MANAGER", "PENDING_HR", "MANAGER_APPROVED"].includes(r.status)
  );
  const approvedLeaves = leaveRequests.filter((r) =>
    ["APPROVED", "IN_PROGRESS", "COMPLETED"].includes(r.status)
  );
  const rejectedLeaves = leaveRequests.filter((r) =>
    ["REJECTED", "MANAGER_REJECTED", "CANCELLED"].includes(r.status)
  );

  const confirmLeaveDelete = async () => {
    if (selectedLeave) {
      await deleteLeaveRequest.mutateAsync(selectedLeave.id);
      setDeleteDialogOpen(false);
      setSelectedLeave(null);
    }
  };

  const confirmLeaveSubmit = async () => {
    if (selectedLeave) {
      await submitLeaveRequest.mutateAsync(selectedLeave.id);
      setSubmitLeaveDialogOpen(false);
      setSelectedLeave(null);
    }
  };

  const confirmLeaveCancel = async () => {
    if (selectedLeave && cancelLeaveReason) {
      await cancelLeaveRequest.mutateAsync({ id: selectedLeave.id, data: { reason: cancelLeaveReason } });
      setCancelLeaveDialogOpen(false);
      setSelectedLeave(null);
      setCancelLeaveReason("");
    }
  };

  const renderLeaveTable = (list: LeaveRequest[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("leaves.fields.leaveType")}</TableHead>
          <TableHead>{t("leaves.fields.startDate")}</TableHead>
          <TableHead>{t("leaves.fields.endDate")}</TableHead>
          <TableHead>المدة</TableHead>
          <TableHead>الوقت</TableHead>
          <TableHead>{t("leaves.fields.status")}</TableHead>
          <TableHead className="w-17.5">{t("common.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leaveLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 7 }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
              ))}
            </TableRow>
          ))
        ) : list.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">{t("common.noData")}</TableCell>
          </TableRow>
        ) : (
          list.map((request) => (
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
              <TableCell><StatusBadge status={request.status} /></TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/${locale}/leaves/view/${request.id}`)}>
                      <Eye className="h-4 w-4 ml-2" />
                      {t("common.view")}
                    </DropdownMenuItem>
                    {request.status === "DRAFT" && (
                      <>
                        <DropdownMenuItem onClick={() => router.push(`/${locale}/leaves/edit/${request.id}`)}>
                          <Edit className="h-4 w-4 ml-2" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelectedLeave(request); setSubmitLeaveDialogOpen(true); }}>
                          <Send className="h-4 w-4 ml-2" />
                          {t("requests.actions.submit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelectedLeave(request); setDeleteDialogOpen(true); }} className="text-destructive">
                          <Trash2 className="h-4 w-4 ml-2" />
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </>
                    )}
                    {["PENDING_MANAGER", "PENDING_HR", "MANAGER_APPROVED"].includes(request.status) && (
                      <DropdownMenuItem onClick={() => { setSelectedLeave(request); setCancelLeaveDialogOpen(true); }} className="text-destructive">
                        <XCircle className="h-4 w-4 ml-2" />
                        {t("requests.actions.cancel")}
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
        title={t("requests.myRequests")}
        description={t("requests.myRequestsDescription")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setHourlyLeaveDialogOpen(true)}>
              <Clock className="h-4 w-4 ml-2" />
              إجازة ساعية
            </Button>
            <Button onClick={() => router.push(`/${locale}/requests/new`)}>
              <Plus className="h-4 w-4 ml-2" />
              {t("requests.newRequest")}
            </Button>
          </div>
        }
      />

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

      <Tabs defaultValue="leaves" className="space-y-4">
        <div className="flex justify-end">
          <TabsList>
            <TabsTrigger value="leaves">{t("requests.tabs.leaveRequests")}</TabsTrigger>
            <TabsTrigger value="admin">{t("requests.tabs.adminRequests")}</TabsTrigger>
            <TabsTrigger value="holidays">العطل الرسمية</TabsTrigger>
          </TabsList>
        </div>

        {/* ===== Leave Requests Tab ===== */}
        <TabsContent value="leaves" className="space-y-4">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">{t("leaves.tabs.all")} ({leaveRequests.length})</TabsTrigger>
              <TabsTrigger value="draft">{t("leaves.tabs.draft")} ({draftLeaves.length})</TabsTrigger>
              <TabsTrigger value="pending">{t("leaves.tabs.pending")} ({pendingLeaves.length})</TabsTrigger>
              <TabsTrigger value="approved">{t("leaves.tabs.approved")} ({approvedLeaves.length})</TabsTrigger>
              <TabsTrigger value="rejected">{t("leaves.tabs.rejected")} ({rejectedLeaves.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="rounded-md border mt-2">{renderLeaveTable(leaveRequests)}</TabsContent>
            <TabsContent value="draft" className="rounded-md border mt-2">{renderLeaveTable(draftLeaves)}</TabsContent>
            <TabsContent value="pending" className="rounded-md border mt-2">{renderLeaveTable(pendingLeaves)}</TabsContent>
            <TabsContent value="approved" className="rounded-md border mt-2">{renderLeaveTable(approvedLeaves)}</TabsContent>
            <TabsContent value="rejected" className="rounded-md border mt-2">{renderLeaveTable(rejectedLeaves)}</TabsContent>
          </Tabs>
        </TabsContent>

        {/* ===== Holidays Tab ===== */}
        <TabsContent value="holidays">
          <HolidaysCalendarView />
        </TabsContent>

        {/* ===== Admin Requests Tab ===== */}
        <TabsContent value="admin">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("requests.fields.requestNumber")}</TableHead>
                  <TableHead>{t("requests.fields.type")}</TableHead>
                  <TableHead>{t("requests.fields.reason")}</TableHead>
                  <TableHead>{t("requests.fields.status")}</TableHead>
                  <TableHead>{t("requests.fields.createdAt")}</TableHead>
                  <TableHead className="w-17.5">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : adminRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">{t("common.noData")}</TableCell>
                  </TableRow>
                ) : (
                  adminRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-sm">{req.requestNumber}</TableCell>
                      <TableCell>{t(`requests.types.${req.type}`)}</TableCell>
                      <TableCell className="max-w-48 truncate">{req.reason}</TableCell>
                      <TableCell><RequestStatusBadge status={req.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/${locale}/requests/${req.id}`)}>
                              <Eye className="h-4 w-4 ml-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                            {req.status === "DRAFT" && (
                              <DropdownMenuItem onClick={() => handleAdminSubmit(req)}>
                                <Send className="h-4 w-4 ml-2" />
                                {t("requests.actions.submit")}
                              </DropdownMenuItem>
                            )}
                            {(req.status === "DRAFT" || req.status === "PENDING_MANAGER") && (
                              <DropdownMenuItem
                                onClick={() => { setSelectedAdmin(req); setCancelAdminDialogOpen(true); }}
                                className="text-destructive"
                              >
                                <X className="h-4 w-4 ml-2" />
                                {t("requests.actions.cancel")}
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
          </div>
        </TabsContent>
      </Tabs>

      {/* Substitute response dialog */}
      <Dialog open={substituteDialogOpen} onOpenChange={setSubstituteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{substituteAction === "approve" ? "تأكيد الموافقة كبديل" : "تأكيد الرفض كبديل"}</DialogTitle>
            <DialogDescription>
              {substituteRequest && `${substituteRequest.employee?.firstNameAr} ${substituteRequest.employee?.lastNameAr} — ${substituteRequest.leaveType?.nameAr}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sub-notes-req">ملاحظات (اختياري)</Label>
            <Textarea
              id="sub-notes-req"
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

      {/* New admin request dialog */}
      <NewRequestDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />

      {/* Admin cancel dialog */}
      <RequestActionDialog
        open={cancelAdminDialogOpen}
        onOpenChange={setCancelAdminDialogOpen}
        action="cancel"
        onConfirm={handleAdminCancelConfirm}
        isLoading={cancelAdminRequest.isPending}
      />

      {/* Leave delete confirm */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("messages.confirmDelete")}
        description={t("messages.actionCantUndo")}
        onConfirm={confirmLeaveDelete}
        variant="destructive"
      />

      {/* Leave submit confirm */}
      <ConfirmDialog
        open={submitLeaveDialogOpen}
        onOpenChange={setSubmitLeaveDialogOpen}
        title="إرسال الطلب للموافقة"
        description="هل أنت متأكد من إرسال هذا الطلب للموافقة؟ لن تتمكن من تعديله بعد الإرسال."
        onConfirm={confirmLeaveSubmit}
      />

      {/* Leave cancel dialog */}
      <Dialog open={cancelLeaveDialogOpen} onOpenChange={setCancelLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إلغاء طلب الإجازة</DialogTitle>
            <DialogDescription>الرجاء كتابة سبب الإلغاء</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-leave-reason">سبب الإلغاء</Label>
            <Textarea
              id="cancel-leave-reason"
              rows={3}
              value={cancelLeaveReason}
              onChange={(e) => setCancelLeaveReason(e.target.value)}
              placeholder="اكتب سبب الإلغاء..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelLeaveDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmLeaveCancel}>
              {t("requests.actions.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
