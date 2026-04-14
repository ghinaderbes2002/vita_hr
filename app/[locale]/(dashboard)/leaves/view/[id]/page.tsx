"use client";

import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { ArrowRight, Edit, Send, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/features/leave-requests/status-badge";
import {
  useLeaveRequest,
  useSubmitLeaveRequest,
  useCancelLeaveRequest,
} from "@/lib/hooks/use-leave-requests";
import { useState } from "react";
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

export default function ViewLeaveRequestPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { data: request, isLoading } = useLeaveRequest(id);
  const submitRequest = useSubmitLeaveRequest();
  const cancelRequest = useCancelLeaveRequest();

  const handleSubmit = async () => {
    await submitRequest.mutateAsync(id);
    setSubmitDialogOpen(false);
  };

  const handleCancel = async () => {
    if (cancelReason) {
      await cancelRequest.mutateAsync({ id, data: { reason: cancelReason } });
      setCancelDialogOpen(false);
      setCancelReason("");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("leaves.viewRequest")} description="عرض تفاصيل طلب الإجازة" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("leaves.viewRequest")} description="عرض تفاصيل طلب الإجازة" />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("common.noData")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEdit = request.status === "DRAFT";
  const canSubmit = request.status === "DRAFT";
  const canCancel = ["PENDING_MANAGER", "PENDING_HR", "MANAGER_APPROVED"].includes(request.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("leaves.viewRequest")}
        description="عرض تفاصيل طلب الإجازة"
        actions={
          <div className="flex gap-2">
            {canEdit && (
              <Button onClick={() => router.push(`/leaves/edit/${id}`)}>
                <Edit className="h-4 w-4 ml-2" />
                {t("common.edit")}
              </Button>
            )}
            {canSubmit && (
              <Button onClick={() => setSubmitDialogOpen(true)}>
                <Send className="h-4 w-4 ml-2" />
                إرسال للموافقة
              </Button>
            )}
            {canCancel && (
              <Button variant="destructive" onClick={() => setCancelDialogOpen(true)}>
                <XCircle className="h-4 w-4 ml-2" />
                إلغاء الطلب
              </Button>
            )}
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowRight className="h-4 w-4 ml-2" />
              {t("common.back")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>معلومات الطلب</CardTitle>
            <CardDescription>التفاصيل الأساسية لطلب الإجازة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>نوع الإجازة</Label>
              <div>
                <Badge variant="outline" style={{ backgroundColor: request.leaveType?.color }}>
                  {request.leaveType?.nameAr}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>تاريخ البداية</Label>
              <div className="text-sm">
                {format(new Date(request.startDate), "PPP", { locale: ar })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>تاريخ النهاية</Label>
              <div className="text-sm">
                {format(new Date(request.endDate), "PPP", { locale: ar })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>عدد الأيام</Label>
              <div className="text-sm">
                {request.totalDays} {t("common.days")}
              </div>
            </div>

            {request.isHalfDay && (
              <div className="space-y-2">
                <Label>نصف يوم</Label>
                <div className="text-sm">
                  <Badge variant="secondary">
                    {request.halfDayPeriod === "MORNING" ? "صباحي" : "مسائي"}
                  </Badge>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>الحالة</Label>
              <div>
                <StatusBadge status={request.status} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>معلومات إضافية</CardTitle>
            <CardDescription>تفاصيل أخرى متعلقة بالطلب</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.substitute && (
              <div className="space-y-2">
                <Label>البديل</Label>
                <div className="text-sm">
                  {request.substitute.firstNameAr} {request.substitute.lastNameAr}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>تاريخ الإنشاء</Label>
              <div className="text-sm">
                {format(new Date(request.createdAt), "PPP", { locale: ar })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>آخر تحديث</Label>
              <div className="text-sm">
                {format(new Date(request.updatedAt), "PPP", { locale: ar })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سبب الإجازة</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{request.reason}</p>
        </CardContent>
      </Card>

      {request.managerNotes && (
        <Card>
          <CardHeader>
            <CardTitle>ملاحظات المدير</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{request.managerNotes}</p>
          </CardContent>
        </Card>
      )}

      {request.hrNotes && (
        <Card>
          <CardHeader>
            <CardTitle>ملاحظات الموارد البشرية</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{request.hrNotes}</p>
          </CardContent>
        </Card>
      )}

      {request.cancelReason && (
        <Card>
          <CardHeader>
            <CardTitle>سبب الإلغاء</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{request.cancelReason}</p>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        title="إرسال الطلب للموافقة"
        description="هل أنت متأكد من إرسال هذا الطلب للموافقة؟ لن تتمكن من تعديله بعد الإرسال."
        onConfirm={handleSubmit}
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
            <Button variant="destructive" onClick={handleCancel}>
              إلغاء الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
