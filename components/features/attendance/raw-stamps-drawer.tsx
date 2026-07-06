"use client";

import { useState, useMemo } from "react";
import { useBiometricDevices } from "@/lib/hooks/use-biometric-devices";
import { BiometricDevice } from "@/lib/api/biometric-devices";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  X, RotateCcw, CheckCircle2, Plus, Trash2, Pencil, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAttendanceRecord,
  useRawStamps,
  useUpdateStampInterpretation,
  useDeleteStamp,
  useRecomputeRecord,
  useApproveRecord,
  useAddManualStamp,
} from "@/lib/hooks/use-attendance-records";
import { InterpretedType, RawStamp } from "@/lib/hooks/use-attendance-records";

const INTERPRETATION_LABELS: Record<InterpretedType, string> = {
  CLOCK_IN:  "دخول",
  CLOCK_OUT: "خروج",
  BREAK_OUT: "بريك خروج",
  BREAK_IN:  "بريك دخول",
  EXCLUDED:  "مُستبعَد",
};

const PUNCH_STATUS_CFG: Record<string, { label: string; className: string }> = {
  NEEDS_REVIEW: { label: "بحاجة مراجعة", className: "bg-amber-50 text-amber-700 border-amber-300" },
  PARTIAL:      { label: "جزئي",         className: "bg-orange-50 text-orange-700 border-orange-300" },
  INVALID:      { label: "غير صالح",     className: "bg-red-50 text-red-700 border-red-300" },
  VALID:        { label: "صالح",         className: "bg-green-50 text-green-700 border-green-300" },
};

interface Props {
  recordId: string;
  open: boolean;
  onClose: () => void;
}

export function RawStampsDrawer({ recordId, open, onClose }: Props) {
  const { data: record, isLoading: recordLoading } = useAttendanceRecord(recordId);
  const { data: stamps = [], isLoading: stampsLoading } = useRawStamps(recordId);

  const { data: devicesData } = useBiometricDevices();
  const deviceBySN = useMemo(() => {
    const list = (devicesData as BiometricDevice[]) || [];
    return new Map(list.map((d) => [d.serialNumber, d]));
  }, [devicesData]);

  const updateInterp  = useUpdateStampInterpretation(recordId);
  const deleteStamp   = useDeleteStamp(recordId);
  const recompute     = useRecomputeRecord(recordId);
  const approveRecord = useApproveRecord(recordId);
  const addManual     = useAddManualStamp(recordId);

  const [editStamp, setEditStamp]       = useState<RawStamp | null>(null);
  const [editInterp, setEditInterp]     = useState<InterpretedType>("CLOCK_IN");
  const [editDeviceId, setEditDeviceId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RawStamp | null>(null);
  const [addOpen, setAddOpen]           = useState(false);
  const [newTimestamp, setNewTimestamp] = useState("");
  const [newInterp, setNewInterp]       = useState<InterpretedType>("CLOCK_IN");
  const [newDeviceId, setNewDeviceId]   = useState("");
  const activeDevices: BiometricDevice[] = useMemo(
    () => (Array.isArray(devicesData) ? (devicesData as BiometricDevice[]).filter((d) => d.isActive) : []),
    [devicesData]
  );

  const punchStatus = (record as any)?.punchSequenceStatus ?? "NEEDS_REVIEW";
  const statusCfg   = PUNCH_STATUS_CFG[punchStatus] ?? PUNCH_STATUS_CFG.NEEDS_REVIEW;
  const isValid     = punchStatus === "VALID";

  const empName = (record as any)?.employee
    ? `${(record as any).employee.firstNameAr} ${(record as any).employee.lastNameAr}`
    : null;

  const handleEditSave = async () => {
    if (!editStamp) return;
    await updateInterp.mutateAsync({ logId: editStamp.id, interpretedAs: editInterp, ...(editDeviceId ? { deviceId: editDeviceId } : {}) });
    setEditStamp(null);
    setEditDeviceId("");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteStamp.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleAddManual = async () => {
    if (!newTimestamp) return;
    await addManual.mutateAsync({
      timestamp: new Date(newTimestamp).toISOString(),
      interpretedAs: newInterp,
      ...(newDeviceId ? { deviceId: newDeviceId } : {}),
    });
    setAddOpen(false);
    setNewTimestamp("");
    setNewInterp("CLOCK_IN");
    setNewDeviceId("");
  };

  const isLoading = recordLoading || stampsLoading;

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              تفاصيل اليوم
              {!isLoading && record && (
                <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>
                  {statusCfg.label}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !record ? null : (
            <div className="space-y-5">
              {/* Header info */}
              <div className="text-sm space-y-1">
                <p className="font-medium">
                  {format(new Date((record as any).date), "EEEE، d MMMM yyyy", { locale: ar })}
                </p>
                {empName && <p className="text-muted-foreground">{empName}</p>}
              </div>

              {/* Needs review banner */}
              {!isValid && (
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  هذا السجل بحاجة لمراجعة
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: "الدخول",      val: (record as any).clockInTime  ? format(new Date((record as any).clockInTime), "HH:mm")  : "—" },
                  { label: "الخروج",      val: (record as any).clockOutTime ? format(new Date((record as any).clockOutTime), "HH:mm") : "—" },
                  { label: "صافي العمل",  val: (record as any).netWorkedMinutes != null ? `${Math.floor((record as any).netWorkedMinutes / 60)}:${String((record as any).netWorkedMinutes % 60).padStart(2,"0")} س` : "—" },
                  { label: "التأخير",     val: (record as any).lateMinutes ? `${(record as any).lateMinutes} د` : "0 د" },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-lg border bg-muted/30 p-2.5">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium mt-0.5">{val}</p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Raw stamps */}
              <div>
                <p className="text-sm font-medium mb-2">البصمات الخام ({stamps.length})</p>
                <div className="space-y-2">
                  {stamps.map((stamp) => {
                    const isExcluded = stamp.interpretedAs === "EXCLUDED";
                    return (
                      <div
                        key={stamp.id}
                        className={`rounded-lg border p-3 space-y-2 ${isExcluded ? "opacity-50 bg-muted/20" : "bg-card"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-sm font-medium">
                              {format(new Date(stamp.timestamp), "HH:mm:ss")}
                            </span>
                            {stamp.syncError && (
                              <Badge variant="outline" className="mr-2 text-xs border-amber-300 text-amber-700">
                                <AlertTriangle className="h-2.5 w-2.5 ml-0.5" />
                                مشتبه بها
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => { setEditStamp(stamp); setEditInterp(stamp.interpretedAs ?? "CLOCK_IN"); setEditDeviceId(""); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(stamp)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {stamp.interpretedAs ? INTERPRETATION_LABELS[stamp.interpretedAs] : "غير محدد"}
                          </Badge>
                          {(() => {
                            const dev = deviceBySN.get(stamp.deviceSN);
                            const label = dev
                              ? dev.nameAr + (dev.location ? ` — ${dev.location}` : "")
                              : "جهاز غير معروف";
                            return <span title={stamp.deviceSN}>الجهاز: {label}</span>;
                          })()}
                          <span>rawType: {stamp.rawType}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <Separator />
              <div className="flex flex-wrap gap-2 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => recompute.mutate()}
                  disabled={recompute.isPending}
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${recompute.isPending ? "animate-spin" : ""}`} />
                  إعادة حساب
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => approveRecord.mutate()}
                  disabled={isValid || approveRecord.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  اعتماد السجل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة بصمة
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit interpretation dialog */}
      <Dialog open={!!editStamp} onOpenChange={(v) => !v && setEditStamp(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تعديل تفسير البصمة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editStamp && (
              <p className="text-sm text-muted-foreground">
                الوقت: {format(new Date(editStamp.timestamp), "HH:mm:ss")}
              </p>
            )}
            <div className="space-y-1.5">
              <Label>التفسير الجديد</Label>
              <Select value={editInterp} onValueChange={(v) => setEditInterp(v as InterpretedType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(INTERPRETATION_LABELS) as InterpretedType[]).map((k) => (
                    <SelectItem key={k} value={k}>{INTERPRETATION_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>الجهاز <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
              <Select value={editDeviceId || "__auto__"} onValueChange={(v) => setEditDeviceId(v === "__auto__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">— بدون تغيير —</SelectItem>
                  {activeDevices.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.nameAr ?? d.name ?? d.serialNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStamp(null)}>إلغاء</Button>
            <Button onClick={handleEditSave} disabled={updateInterp.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف البصمة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            سيتم استبعاد هذه البصمة من الحساب. هل أنت متأكد؟
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteStamp.isPending}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add manual stamp dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>إضافة بصمة يدوية</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>التاريخ والوقت *</Label>
              <Input
                type="datetime-local"
                value={newTimestamp}
                onChange={(e) => setNewTimestamp(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>النوع *</Label>
              <Select value={newInterp} onValueChange={(v) => setNewInterp(v as InterpretedType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(INTERPRETATION_LABELS) as InterpretedType[]).map((k) => (
                    <SelectItem key={k} value={k}>{INTERPRETATION_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>الجهاز <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
              <Select value={newDeviceId || "__auto__"} onValueChange={(v) => setNewDeviceId(v === "__auto__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">— تلقائي (أول جهاز نشط) —</SelectItem>
                  {activeDevices.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.nameAr ?? d.name ?? d.serialNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
            <Button onClick={handleAddManual} disabled={!newTimestamp || addManual.isPending}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
