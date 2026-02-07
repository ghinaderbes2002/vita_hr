"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Eye, Edit, Trash2, Send, XCircle } from "lucide-react";
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
import {
  useMyLeaveRequests,
  useDeleteLeaveRequest,
  useSubmitLeaveRequest,
  useCancelLeaveRequest,
} from "@/lib/hooks/use-leave-requests";
import { LeaveRequest } from "@/lib/api/leave-requests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MyLeavesPage() {
  const t = useTranslations();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data, isLoading } = useMyLeaveRequests();
  const deleteRequest = useDeleteLeaveRequest();
  const submitRequest = useSubmitLeaveRequest();
  const cancelRequest = useCancelLeaveRequest();

  // Extract array from API response
  const requests = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

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

  const renderTable = (requestsList: LeaveRequest[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("leaves.fields.leaveType")}</TableHead>
          <TableHead>{t("leaves.fields.startDate")}</TableHead>
          <TableHead>{t("leaves.fields.endDate")}</TableHead>
          <TableHead>{t("leaves.fields.totalDays")}</TableHead>
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
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-8" /></TableCell>
            </TableRow>
          ))
        ) : requestsList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              {t("common.noData")}
            </TableCell>
          </TableRow>
        ) : (
          requestsList.map((request: LeaveRequest) => (
            <TableRow key={request.id}>
              <TableCell>
                <Badge variant="outline" style={{ backgroundColor: request.leaveType?.color }}>
                  {request.leaveType?.nameAr}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(request.startDate), "PPP", { locale: ar })}</TableCell>
              <TableCell>{format(new Date(request.endDate), "PPP", { locale: ar })}</TableCell>
              <TableCell>
                {request.totalDays} {t("common.days")}
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
          <Button onClick={() => router.push("/leaves/new-request")}>
            <Plus className="h-4 w-4 ml-2" />
            {t("leaves.newRequest")}
          </Button>
        }
      />

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">الكل ({requests.length})</TabsTrigger>
          <TabsTrigger value="draft">مسودة ({draftRequests.length})</TabsTrigger>
          <TabsTrigger value="pending">معلق ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="approved">معتمد ({approvedRequests.length})</TabsTrigger>
          <TabsTrigger value="rejected">مرفوض ({rejectedRequests.length})</TabsTrigger>
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
    </div>
  );
}
