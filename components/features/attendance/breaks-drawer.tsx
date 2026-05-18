"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Coffee, Clock } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { AttendanceRecord } from "@/lib/api/attendance-records";
import { AttendanceBreak, BreakType, BREAK_TYPE_LABELS } from "@/lib/api/attendance-breaks";
import {
  useAttendanceBreaks,
  useAuthorizeBreak,
  useRejectBreak,
  useUpdateBreakType,
} from "@/lib/hooks/use-attendance-breaks";
import { formatTime } from "@/lib/utils/date";

const BREAK_TYPES: BreakType[] = ["PRAYER", "MEAL", "PERSONAL", "WORK_RELATED", "OTHER"];

function StatusBadge({ status }: { status: AttendanceBreak["status"] }) {
  if (status === "AUTHORIZED")
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">مُعتمد</Badge>;
  if (status === "REJECTED")
    return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">مرفوض</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">بانتظار الاعتماد</Badge>;
}

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} د`;
  return m === 0 ? `${h} س` : `${h} س ${m} د`;
}

interface BreakCardProps {
  brk: AttendanceBreak;
  index: number;
  recordId: string;
  canManage: boolean;
}

function BreakCard({ brk, index, recordId, canManage }: BreakCardProps) {
  const [actionDialog, setActionDialog] = useState<"authorize" | "reject" | "type" | null>(null);
  const [reason, setReason] = useState("");
  const [newType, setNewType] = useState<BreakType>(brk.type || "OTHER");

  const authorize = useAuthorizeBreak();
  const reject = useRejectBreak();
  const updateType = useUpdateBreakType();

  const isPending =
    authorize.isPending || reject.isPending || updateType.isPending;

  function handleAuthorize() {
    authorize.mutate(
      { breakId: brk.id, reason, recordId },
      { onSuccess: () => { setActionDialog(null); setReason(""); } }
    );
  }

  function handleReject() {
    reject.mutate(
      { breakId: brk.id, reason, recordId },
      { onSuccess: () => { setActionDialog(null); setReason(""); } }
    );
  }

  function handleUpdateType() {
    updateType.mutate(
      { breakId: brk.id, type: newType, recordId },
      { onSuccess: () => setActionDialog(null) }
    );
  }

  return (
    <>
      <div className="rounded-lg border p-3 space-y-2">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">
              {index}. {brk.type ? BREAK_TYPE_LABELS[brk.type] : "غير محدد"}
            </span>
          </div>
          <StatusBadge status={brk.status} />
        </div>

        {/* Time row */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {formatTime(brk.startTime)}
            {brk.endTime ? ` ← ${formatTime(brk.endTime)}` : " (لم يُسجَّل الخروج بعد)"}
          </span>
          {brk.durationMinutes != null && (
            <Badge variant="outline" className="text-xs">
              {formatDuration(brk.durationMinutes)}
            </Badge>
          )}
        </div>

        {/* Reason */}
        {brk.reason && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
            {brk.reason}
          </p>
        )}
        {brk.rejectionReason && (
          <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
            سبب الرفض: {brk.rejectionReason}
          </p>
        )}

        {/* Actions */}
        {canManage && (
          <div className="flex gap-1.5 flex-wrap pt-1">
            {brk.status === "PENDING" && (
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                  onClick={() => { setReason(""); setActionDialog("authorize"); }}
                  disabled={isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  اعتماد
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs gap-1"
                  onClick={() => { setReason(""); setActionDialog("reject"); }}
                  disabled={isPending}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  رفض
                </Button>
              </>
            )}
            {brk.status === "AUTHORIZED" && (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs gap-1"
                onClick={() => { setReason(""); setActionDialog("reject"); }}
                disabled={isPending}
              >
                <XCircle className="h-3.5 w-3.5" />
                رفض
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => { setNewType(brk.type || "OTHER"); setActionDialog("type"); }}
              disabled={isPending}
            >
              تعديل النوع
            </Button>
          </div>
        )}
      </div>

      {/* Authorize dialog */}
      <Dialog open={actionDialog === "authorize"} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>اعتماد الاستراحة</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>ملاحظة (اختياري)</Label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="سبب الاعتماد..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>إلغاء</Button>
            <Button onClick={handleAuthorize} disabled={authorize.isPending} className="bg-green-600 hover:bg-green-700">
              اعتماد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={actionDialog === "reject"} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>رفض الاستراحة</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>سبب الرفض *</Label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اذكر سبب الرفض..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!reason.trim() || reject.isPending}
            >
              رفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update type dialog */}
      <Dialog open={actionDialog === "type"} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>تعديل نوع الاستراحة</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>النوع</Label>
            <Select value={newType} onValueChange={(v) => setNewType(v as BreakType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BREAK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{BREAK_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>إلغاء</Button>
            <Button onClick={handleUpdateType} disabled={updateType.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface BreaksDrawerProps {
  record: AttendanceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
}

export function BreaksDrawer({ record, open, onOpenChange, canManage = false }: BreaksDrawerProps) {
  const { data: breaks, isLoading } = useAttendanceBreaks(record?.id || "");
  const brkList: AttendanceBreak[] = (breaks as any) || [];

  const totalBreakMinutes = brkList.reduce((s, b) => s + (b.durationMinutes || 0), 0);
  const allowedMinutes: number | undefined = (record as any)?.employee?.attendanceConfig?.allowedBreakMinutes;

  const exceeded =
    allowedMinutes != null && totalBreakMinutes > allowedMinutes
      ? totalBreakMinutes - allowedMinutes
      : null;

  function formatNetWork(minutes?: number | null) {
    if (!minutes) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} س ${m.toString().padStart(2, "0")} د`;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base">
            تفاصيل اليوم —{" "}
            {record?.date
              ? new Date(record.date).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })
              : ""}
          </SheetTitle>
        </SheetHeader>

        {record && (
          <>
            {/* Record summary */}
            <div className="rounded-lg border p-3 mb-4 space-y-1.5 text-sm">
              {record.employee && (
                <div className="font-medium text-base">
                  {record.employee.firstNameAr} {record.employee.lastNameAr}
                </div>
              )}
              <div className="flex gap-4 text-muted-foreground">
                <span>الدخول: <strong className="text-foreground">{record.clockInTime ? formatTime(record.clockInTime) : "—"}</strong></span>
                <span>الخروج: <strong className="text-foreground">{record.clockOutTime ? formatTime(record.clockOutTime) : "—"}</strong></span>
              </div>
              <div className="text-muted-foreground">
                الصافي: <strong className="text-foreground">{formatNetWork((record as any).netWorkedMinutes ?? record.workedMinutes)}</strong>
              </div>
            </div>

            {/* Breaks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Coffee className="h-4 w-4 text-amber-600" />
                  الاستراحات
                  {!isLoading && (
                    <Badge variant="secondary" className="text-xs">{brkList.length}</Badge>
                  )}
                </p>
                {!isLoading && totalBreakMinutes > 0 && (
                  <span className={`text-xs font-medium ${exceeded ? "text-red-600" : "text-muted-foreground"}`}>
                    المجموع: {formatDuration(totalBreakMinutes)}
                    {exceeded != null && ` ⚠ تجاوز ${formatDuration(exceeded)}`}
                  </span>
                )}
              </div>

              {allowedMinutes != null && (
                <p className="text-xs text-muted-foreground">
                  المسموح: {formatDuration(allowedMinutes)}
                </p>
              )}

              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                </div>
              ) : brkList.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
                  لا توجد استراحات مسجلة لهذا اليوم
                </div>
              ) : (
                <div className="space-y-2">
                  {brkList.map((brk, i) => (
                    <BreakCard
                      key={brk.id}
                      brk={brk}
                      index={i + 1}
                      recordId={record.id}
                      canManage={canManage}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
