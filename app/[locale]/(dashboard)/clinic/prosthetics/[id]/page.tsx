"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight, User, Clock, Trash2, Plus, Download, Loader2,
  CheckCircle2, ChevronDown, ChevronUp, Check, X, Camera, Archive, Bell, Reply,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CaseStatusBadge } from "@/components/clinic/case-status-badge";
import { PatientSignatureField } from "@/components/clinic/patient-signature-field";
import { KLevelSelector } from "@/components/clinic/k-level-selector";
import { AmputationLevelSelector } from "@/components/clinic/amputation-level-selector";
import { InventoryItemCombobox } from "@/components/clinic/inventory-item-combobox";
import { SignaturePadDialog } from "@/components/clinic/signature-pad-dialog";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { cn } from "@/lib/utils";
import { ActionGuard } from "@/components/permissions/action-guard";
import { useClinicPatient, useUpdateClinicPatient, usePatientDocuments } from "@/lib/hooks/use-clinic-patients";
import { useInventoryItems } from "@/lib/hooks/use-clinic-inventory";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { clinicPatientsApi } from "@/lib/api/clinic-patients";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  useProstheticsCase, useUpdateProstheticsCase, useUpdateProstheticsStatus,
  useSubmitAssessmentUpper, useSubmitAssessmentLower,
  useSubmitCommitteeOpinion, useSubmitCommitteeDecision, useSignCommitteeDecision,
  useCaseComponents, useAddCaseComponent, useDeleteCaseComponent,
  useSubmitGaitAnalysis,
  useAddConsumable, useSubmitFinalEvaluation, useSignFinalEvaluation,
  useSubmitDelivery, useSignDelivery,
  useProstheticsFollowUps, useAddProstheticsFollowUp,
  useProstheticsTimeline, useDownloadProstheticsPdf,
  useProstheticsAttachments, useUploadProstheticsAttachment, useDeleteProstheticsAttachment,
  useSubmitAnkleDisarticulation,
  useSubmitKneeDisarticulation,
  useSubmitTransfemoral,
  useSubmitTranstibial,
  useSubmitHemipelvectomy,
  useSubmitElbowDisarticulation,
  useSubmitTranshumeral,
  useSubmitTransradial,
  useTreatmentPrograms,
  useCreateTreatmentProgram,
  useUpdateTreatmentProgram,
  useArchiveTreatmentProgram,
  useCaseAlerts,
  useSendCaseAlert,
  useRespondToAlert,
  useReviewPrograms,
  useCreateReviewProgram,
  useUpdateReviewProgram,
  useDeleteReviewProgram,
  useProstheticDelivery,
  useSaveProstheticDelivery,
  useFinalDelivery,
  useCreateFinalDelivery,
  useUpdateFinalDelivery,
  useBalanceAssessments,
  useAddBalanceAssessment,
  useUpdateBalanceAssessment,
  useSaveBalanceAssessmentForm,
  useArchiveBalanceAssessment,
  useGaitAnalysisForms,
  useAddGaitAnalysisForm,
  useUpdateGaitAnalysisForm,
  useSaveGaitAnalysisForm,
  useArchiveGaitAnalysisForm,
  useFinalEvaluation,
} from "@/lib/hooks/use-clinic-prosthetics";
import {
  clinicProstheticsApi,
  ProstheticsStatus, ProstheticsCase,
  AmputationType, AmputationSide, AmputationCause, KLevel, CommitteeDecision, ProstheticType,
  AnkleDisarticulationDto, KneeDisarticulationDto, TransfemoralDto, TranstibialDto, HemipelvectomyDto, ElbowDisarticulationDto, TranshumeralDto, TransradialDto, TreatmentProgramDto, ProstheticDeliveryDto, DeliveryItemDto, FinalEvaluationDto,
  MeasurementAssessment, AssessmentResult,
} from "@/lib/api/clinic-prosthetics";

// ─── Labels ───────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = { UPPER: "طرف علوي", LOWER: "طرف سفلي" };
const SIDE_LABEL: Record<string, string> = { RIGHT: "أيمن", LEFT: "أيسر", BILATERAL: "ثنائي" };
const REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING: "معلق", APPROVED: "معتمد", DONE: "تم", NOT_AVAILABLE: "لا يوجد",
};
const REQUEST_STATUS_BADGE: Record<string, string> = {
  PENDING: "border-amber-300 bg-amber-50 text-amber-700",
  APPROVED: "border-blue-300 bg-blue-50 text-blue-700",
  DONE: "border-green-300 bg-green-50 text-green-700",
  NOT_AVAILABLE: "border-red-300 bg-red-50 text-red-700",
};
const SOURCE_LOCATION_LABEL: Record<string, string> = {
  WAREHOUSE: "مستودع", EXTERNAL: "خارجي", PATIENT_OWNED: "ملك المريض", OTHER: "أخرى",
  SUPPLIER: "مورد", // legacy value from old saved data
};
const DECISION_LABEL: Record<CommitteeDecision, string> = {
  APPROVED: "مقبول", NEEDS_ADJUSTMENT: "يحتاج تعديل", REJECTED: "مرفوض",
};
const PROSTHETIC_TYPE_LABEL: Record<ProstheticType, string> = {
  BIONIC: "بيوني", MYOBOCK: "ميوبوك", MECHANIC: "ميكانيكي", COSMETIC: "تجميلي",
};

// ─── Workflow step order ───────────────────────────────────────────────────────

const STATUS_ORDER: ProstheticsStatus[] = [
  "INTAKE", "ASSESSMENT", "FITTING", "SOCKET_TRIAL",
  "GAIT_TRAINING", "FOLLOW_UP", "DELIVERED", "FINAL_REVIEW",
];

function StepIndicator({ status }: { status: ProstheticsStatus }) {
  const idx = STATUS_ORDER.indexOf(status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STATUS_ORDER.map((s, i) => (
        <div key={s} className="flex items-center gap-1 shrink-0">
          <div className={`w-2 h-2 rounded-full ${
            i < idx ? "bg-primary" : i === idx ? "bg-primary ring-2 ring-primary/30" : "bg-muted-foreground/30"
          }`} />
          {i < STATUS_ORDER.length - 1 && (
            <div className={`h-0.5 w-4 ${i < idx ? "bg-primary" : "bg-muted-foreground/20"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Patient photo via authenticated download ─────────────────────────────────
function PatientPhotoViewer({ patientId, docId }: { patientId: string; docId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string;
    clinicPatientsApi.downloadDocument(patientId, docId).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    }).catch(() => {});
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [patientId, docId]);
  if (!src) return <span className="opacity-40 text-xs">جاري التحميل...</span>;
  return <img src={src} alt="الصورة الشخصية" className="h-full w-full object-cover" />;
}

// ─── Attachment card (authenticated fetch → object URL) ───────────────────────
function AttachmentCard({
  caseId, att, onDelete, deleteDisabled,
}: {
  caseId: string;
  att: { id: string; fileName: string; fileSize?: number; mimeType?: string };
  onDelete: () => void;
  deleteDisabled?: boolean;
}) {
  const isImage = att.mimeType?.startsWith("image/");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string;
    clinicProstheticsApi.downloadAttachment(caseId, att.id)
      .then((blob) => { url = URL.createObjectURL(blob); setObjectUrl(url); })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [caseId, att.id]);

  const handleDownload = () => {
    if (!objectUrl) return;
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = att.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="group relative rounded-lg border overflow-hidden hover:border-primary transition-colors">
      <button type="button" onClick={handleDownload} className="block w-full text-right">
        {isImage ? (
          objectUrl
            ? <img src={objectUrl} alt={att.fileName} className="w-full h-32 object-cover bg-muted" />
            : <div className="w-full h-32 bg-muted flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
        ) : (
          <div className="w-full h-32 bg-muted flex flex-col items-center justify-center gap-1">
            <span className="text-2xl font-mono font-bold text-muted-foreground">
              {att.fileName.split(".").pop()?.toUpperCase() ?? "—"}
            </span>
            <Download className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="p-2 border-t bg-background">
          <p className="text-xs font-medium truncate">{att.fileName}</p>
          {att.fileSize && <p className="text-xs text-muted-foreground">{(att.fileSize / 1024).toFixed(0)} KB</p>}
        </div>
      </button>
      <button
        onClick={onDelete}
        disabled={deleteDisabled}
        className="absolute top-1 left-1 h-6 w-6 rounded bg-destructive/80 hover:bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
      >
        <Trash2 className="h-3 w-3 text-white" />
      </button>
    </div>
  );
}

// ─── Treatment program card (inline form — Pro-004) ────────────────────────────
function TreatmentProgramCard({
  caseId, program, idx, staffList, currentUser, locked,
}: {
  caseId: string;
  program: any;
  idx: number;
  staffList: any[];
  currentUser: any;
  locked?: boolean;
}) {
  const updateProgram = useUpdateTreatmentProgram();
  const archiveProgram = useArchiveTreatmentProgram();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveNotes, setArchiveNotes] = useState("");
  const isArchived = !!program.archivedAt;
  // Auto-created sessions (from a confirmed appointment) carry only date + time.
  // Show the edit button only while those "rest" fields are still empty — once
  // the technician fills any of them, the session is considered complete.
  const hasOtherData = !!(
    program.technicianId ||
    program.description ||
    program.sessionStartTime ||
    program.sessionEndTime ||
    program.notes ||
    program.technicianSignatureUrl ||
    program.managerSignatureUrl
  );
  const [form, setForm] = useState({
    sessionDate: program.sessionDate ? new Date(program.sessionDate).toISOString().slice(0, 10) : "",
    sessionTime: program.sessionTime ?? "",
    technicianId: program.technicianId ?? "",
    description: program.description ?? "",
    sessionStartTime: program.sessionStartTime ?? "",
    sessionEndTime: program.sessionEndTime ?? "",
    notes: program.notes ?? "",
    technicianSignatureUrl: program.technicianSignatureUrl ?? "",
    managerSignatureUrl: program.managerSignatureUrl ?? "",
  });
  const [sigUploadFor, setSigUploadFor] = useState<"technician" | "manager" | null>(null);
  const sigFileRef = useRef<HTMLInputElement>(null);

  const handleSignatureClick = async (role: "technician" | "manager") => {
    const empId = role === "technician" ? form.technicianId : currentUser?.employeeId;
    if (!empId) { toast.error(role === "technician" ? "أدخل رقم المعالج أولاً" : "لم يُعثر على بيانات المستخدم"); return; }
    try {
      const sig = await clinicProstheticsApi.getEmployeeSignature(empId);
      if (sig.hasSignature && sig.signatureUrl) {
        const url = sig.signatureUrl.startsWith("http") ? sig.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${sig.signatureUrl}`;
        if (role === "technician") setForm((f) => ({ ...f, technicianSignatureUrl: url }));
        else setForm((f) => ({ ...f, managerSignatureUrl: url }));
      } else {
        setSigUploadFor(role);
        setTimeout(() => sigFileRef.current?.click(), 50);
      }
    } catch { toast.error("فشل جلب بيانات التوقيع"); }
  };

  const handleSignatureFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sigUploadFor) return;
    const empId = sigUploadFor === "technician" ? form.technicianId : currentUser?.employeeId;
    if (!empId) return;
    try {
      const res = await clinicProstheticsApi.uploadEmployeeSignature(empId, file);
      const url = res.signatureUrl.startsWith("http") ? res.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${res.signatureUrl}`;
      if (sigUploadFor === "technician") setForm((f) => ({ ...f, technicianSignatureUrl: url }));
      else setForm((f) => ({ ...f, managerSignatureUrl: url }));
      toast.success("تم رفع التوقيع");
    } catch { toast.error("فشل رفع التوقيع"); }
    setSigUploadFor(null);
    e.target.value = "";
  };

  const handleSave = async () => {
    await updateProgram.mutateAsync({
      caseId,
      programId: program.id,
      dto: {
        sessionDate: form.sessionDate ? new Date(form.sessionDate).toISOString() : undefined,
        sessionTime: form.sessionTime || undefined,
        description: form.description || undefined,
        sessionStartTime: form.sessionStartTime || undefined,
        sessionEndTime: form.sessionEndTime || undefined,
        technicianId: form.technicianId || undefined,
        technicianSignatureUrl: form.technicianSignatureUrl || undefined,
        managerSignatureUrl: form.managerSignatureUrl || undefined,
        notes: form.notes || undefined,
      },
    });
    setEditing(false);
  };

  const technicianName = staffList.find((e) => e.id === form.technicianId);
  const displayDate = form.sessionDate ? new Date(form.sessionDate).toLocaleDateString("en-GB") : null;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex justify-between items-start">
        <button
          type="button"
          onClick={() => { if (expanded) setEditing(false); setExpanded(!expanded); }}
          aria-expanded={expanded}
          className="flex gap-2 items-center flex-wrap text-start rounded-md -m-1 p-1 hover:bg-muted/50 transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          <Badge variant="secondary" className="text-base font-bold px-3 py-1">#{idx + 1}</Badge>
          {displayDate && <span className="font-medium text-sm">{displayDate}</span>}
          {form.sessionTime && <span className="text-xs text-muted-foreground">{form.sessionTime}</span>}
        </button>
        <div className="flex gap-1.5 items-center flex-wrap justify-end">
          {isArchived && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs gap-1">
              <Archive className="h-3 w-3" />
              مؤرشف
            </Badge>
          )}
          {!locked && !hasOtherData && (
            <Button size="sm" variant={editing ? "default" : "outline"} onClick={() => { setEditing((v) => !v); setExpanded(true); }}>
              {editing ? "إغلاق" : "تعديل"}
            </Button>
          )}
          {!locked && !isArchived && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setArchiveNotes(""); setArchiveOpen(true); }}>
              <Archive className="h-3.5 w-3.5" />
              أرشفة
            </Button>
          )}
        </div>
      </div>

      {expanded && isArchived && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-0.5">
          <p className="flex items-center gap-1 font-medium">
            <Archive className="h-3 w-3" />
            أُرشِفت{program.archivedAt ? ` بتاريخ ${new Date(program.archivedAt).toLocaleDateString("en-GB")}` : ""}
          </p>
          {program.archiveNotes && (
            <p><span className="font-medium">ملاحظة الأرشفة: </span>{program.archiveNotes}</p>
          )}
        </div>
      )}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>أرشفة الجلسة</DialogTitle>
            <DialogDescription>سيتم إغلاق الجلسة. يمكنك إضافة ملاحظة اختيارية.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder="ملاحظة اختيارية..."
            value={archiveNotes}
            onChange={(e) => setArchiveNotes(e.target.value)}
          />
          <DialogFooter className="flex gap-2 justify-end sm:justify-end">
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>إلغاء</Button>
            <Button
              disabled={archiveProgram.isPending}
              onClick={async () => {
                await archiveProgram.mutateAsync({ caseId, programId: program.id, notes: archiveNotes.trim() || undefined });
                setArchiveOpen(false);
              }}
            >
              {archiveProgram.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "أرشفة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {expanded && !editing && (
        <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
          {form.description && <p><span className="font-medium text-foreground">الشرح: </span>{form.description}</p>}
          {technicianName && <p><span className="font-medium text-foreground">المعالج: </span>{technicianName.firstNameAr} {technicianName.lastNameAr}</p>}
          {(form.sessionStartTime || form.sessionEndTime) && (
            <p><span className="font-medium text-foreground">الوقت: </span>{form.sessionStartTime || "—"} — {form.sessionEndTime || "—"}</p>
          )}
          {form.notes && <p><span className="font-medium text-foreground">ملاحظات: </span>{form.notes}</p>}
          {(form.technicianSignatureUrl || form.managerSignatureUrl) && (
            <div className="flex gap-3 pt-1">
              {form.technicianSignatureUrl && (
                <div className="text-center">
                  <img src={form.technicianSignatureUrl} alt="التوقيع" className="h-10 object-contain border rounded bg-white" />
                  <p className="text-[10px] mt-0.5">التوقيع</p>
                </div>
              )}
              {form.managerSignatureUrl && (
                <div className="text-center">
                  <img src={form.managerSignatureUrl} alt="توقيع مدير القسم" className="h-10 object-contain border rounded bg-white" />
                  <p className="text-[10px] mt-0.5">توقيع مدير القسم</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className="space-y-3 pt-2 border-t">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">تاريخ الجلسة</Label>
              <Input type="date" value={form.sessionDate} onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">وقت الجلسة</Label>
              <Input type="time" value={form.sessionTime} onChange={(e) => setForm((f) => ({ ...f, sessionTime: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">الشرح / الوصف</Label>
            <Textarea rows={2} placeholder="وصف الجلسة..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="resize-none" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">اسم المعالج</Label>
            <Select value={form.technicianId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, technicianId: v === "none" ? "" : v, technicianSignatureUrl: "" }))}>
              <SelectTrigger><SelectValue placeholder="اختر المعالج..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— غير محدد —</SelectItem>
                {staffList.filter((e: any) => {
                  if (e.employmentStatus !== "ACTIVE") return false;
                  const dep = e.department?.nameAr ?? "";
                  return dep.includes("الاطراف الصناعية") || dep.includes("الأطراف الصناعية") || dep.includes("العلاج الفيزيائي") || dep.includes("الادارة الطبية") || dep.includes("الإدارة الطبية");
                }).map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.firstNameAr} {emp.lastNameAr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">وقت دخول الجلسة</Label>
              <Input type="time" value={form.sessionStartTime} onChange={(e) => setForm((f) => ({ ...f, sessionStartTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">وقت الخروج من الجلسة</Label>
              <Input type="time" value={form.sessionEndTime} onChange={(e) => setForm((f) => ({ ...f, sessionEndTime: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">ملاحظات</Label>
            <Textarea rows={2} placeholder="ملاحظات إضافية..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold">التوقيع</p>
              {form.technicianSignatureUrl ? (
                <div className="relative">
                  <img src={form.technicianSignatureUrl} alt="التوقيع" className="h-16 w-full object-contain border rounded bg-white" />
                  <button onClick={() => setForm((f) => ({ ...f, technicianSignatureUrl: "" }))} className="absolute top-0 left-0 text-destructive text-xs p-0.5">✕</button>
                </div>
              ) : (
                <Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={() => handleSignatureClick("technician")} disabled={!form.technicianId}>
                  {form.technicianId ? "جلب / رفع التوقيع" : "اختر المعالج أولاً"}
                </Button>
              )}
            </div>
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold">توقيع مدير القسم</p>
              {form.managerSignatureUrl ? (
                <div className="relative">
                  <img src={form.managerSignatureUrl} alt="توقيع مدير القسم" className="h-16 w-full object-contain border rounded bg-white" />
                  <button onClick={() => setForm((f) => ({ ...f, managerSignatureUrl: "" }))} className="absolute top-0 left-0 text-destructive text-xs p-0.5">✕</button>
                </div>
              ) : (
                <Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={() => handleSignatureClick("manager")}>
                  جلب / رفع التوقيع
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={updateProgram.isPending} className="flex-1 gap-1">
              {updateProgram.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              حفظ
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>إلغاء</Button>
          </div>

          <input ref={sigFileRef} type="file" accept="image/*" className="hidden" onChange={handleSignatureFileChange} />
        </div>
      )}
    </div>
  );
}

// ─── Treatment programs section (Pro-004) ─────────────────────────────────────
function TreatmentProgramsSection({
  caseId, staffList, currentUser, locked,
}: {
  caseId: string;
  staffList: any[];
  currentUser: any;
  /** Case already delivered — the programme is history, not something to edit. */
  locked?: boolean;
}) {
  const { data: programs = [], isLoading } = useTreatmentPrograms(caseId);
  const createProgram = useCreateTreatmentProgram();
  // Case-level alerts (whole follow-up program). A case can have several.
  const { data: alerts = [] } = useCaseAlerts(caseId);
  const sendAlert = useSendCaseAlert();
  const respondAlert = useRespondToAlert();
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertNote, setAlertNote] = useState("");
  const [respondFor, setRespondFor] = useState<string | null>(null);
  const [respondNote, setRespondNote] = useState("");
  const pendingAlerts = alerts.filter((a) => !a.respondedAt).length;
  const [showForm, setShowForm] = useState(false);
  const [newForm, setNewForm] = useState({
    sessionDate: new Date().toISOString().slice(0, 10),
    sessionTime: "",
    description: "",
    technicianId: "",
    sessionStartTime: "",
    sessionEndTime: "",
    notes: "",
    technicianSignatureUrl: "",
    managerSignatureUrl: "",
  });
  const [newSigUploadFor, setNewSigUploadFor] = useState<"technician" | "manager" | null>(null);
  const newSigFileRef = useRef<HTMLInputElement>(null);

  const handleNewSignatureClick = async (role: "technician" | "manager") => {
    const empId = role === "technician" ? newForm.technicianId : currentUser?.employeeId;
    if (!empId) { toast.error(role === "technician" ? "أدخل رقم المعالج أولاً" : "لم يُعثر على بيانات المستخدم"); return; }
    try {
      const sig = await clinicProstheticsApi.getEmployeeSignature(empId);
      if (sig.hasSignature && sig.signatureUrl) {
        const url = sig.signatureUrl.startsWith("http") ? sig.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${sig.signatureUrl}`;
        if (role === "technician") setNewForm((f) => ({ ...f, technicianSignatureUrl: url }));
        else setNewForm((f) => ({ ...f, managerSignatureUrl: url }));
      } else {
        setNewSigUploadFor(role);
        setTimeout(() => newSigFileRef.current?.click(), 50);
      }
    } catch { toast.error("فشل جلب بيانات التوقيع"); }
  };

  const handleNewSignatureFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !newSigUploadFor) return;
    const empId = newSigUploadFor === "technician" ? newForm.technicianId : currentUser?.employeeId;
    if (!empId) return;
    try {
      const res = await clinicProstheticsApi.uploadEmployeeSignature(empId, file);
      const url = res.signatureUrl.startsWith("http") ? res.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${res.signatureUrl}`;
      if (newSigUploadFor === "technician") setNewForm((f) => ({ ...f, technicianSignatureUrl: url }));
      else setNewForm((f) => ({ ...f, managerSignatureUrl: url }));
      toast.success("تم رفع التوقيع");
    } catch { toast.error("فشل رفع التوقيع"); }
    setNewSigUploadFor(null);
    e.target.value = "";
  };

  const handleAdd = async () => {
    if (!newForm.sessionDate) return;
    await createProgram.mutateAsync({
      caseId,
      dto: {
        sessionDate: new Date(newForm.sessionDate).toISOString(),
        sessionTime: newForm.sessionTime || undefined,
        description: newForm.description || undefined,
        technicianId: newForm.technicianId || undefined,
        sessionStartTime: newForm.sessionStartTime || undefined,
        sessionEndTime: newForm.sessionEndTime || undefined,
        notes: newForm.notes || undefined,
        technicianSignatureUrl: newForm.technicianSignatureUrl || undefined,
        managerSignatureUrl: newForm.managerSignatureUrl || undefined,
      },
    });
    setNewForm({ sessionDate: new Date().toISOString().slice(0, 10), sessionTime: "", description: "", technicianId: "", sessionStartTime: "", sessionEndTime: "", notes: "", technicianSignatureUrl: "", managerSignatureUrl: "" });
    setShowForm(false);
  };

  return (
    <Section
      title={`برنامج المتابعة${programs.length > 0 ? ` (${programs.length})` : ""}`}
      action={
        <div className="flex gap-1.5 items-center flex-wrap justify-end">
          {pendingAlerts > 0 && (
            <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700 text-xs gap-1">
              <Bell className="h-3 w-3" />
              {pendingAlerts} بانتظار الرد
            </Badge>
          )}
          {!locked && (
            <>
              <Button size="sm" variant="outline" className="gap-1 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => { setAlertNote(""); setAlertOpen(true); }}>
                <Bell className="h-3.5 w-3.5" />
                تنبيه رئيس القسم
              </Button>
              <Button size="sm" variant={showForm ? "secondary" : "outline"} className="gap-1 text-xs" onClick={() => setShowForm((v) => !v)}>
                <Plus className="h-3.5 w-3.5" />
                {showForm ? "إغلاق" : "إضافة جلسة"}
              </Button>
            </>
          )}
        </div>
      }
    >
      {alerts.length > 0 && (
        <div className="space-y-2 mb-3">
          {alerts.map((a) => (
            <div key={a.id} className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-900 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="flex items-center gap-1 font-medium">
                    <Bell className="h-3 w-3" />
                    تنبيه رئيس القسم{a.sentAt ? ` — ${new Date(a.sentAt).toLocaleString("en-GB")}` : ""}
                  </p>
                  {a.note && <p><span className="font-medium">ملاحظة الفني: </span>{a.note}</p>}
                </div>
                {!a.respondedAt && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 shrink-0"
                    onClick={() => { setRespondNote(""); setRespondFor(a.id); }}>
                    <Reply className="h-3.5 w-3.5" />
                    رد
                  </Button>
                )}
              </div>
              {a.respondedAt && (
                <div className="space-y-0.5 border-t border-orange-200 pt-1">
                  <p className="flex items-center gap-1 font-medium text-blue-800">
                    <Reply className="h-3 w-3" />
                    رد رئيس القسم{a.respondedAt ? ` — ${new Date(a.respondedAt).toLocaleString("en-GB")}` : ""}
                  </p>
                  {a.responseNote && <p className="text-blue-900"><span className="font-medium">الرد: </span>{a.responseNote}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تنبيه رئيس القسم</DialogTitle>
            <DialogDescription>سيتم إرسال إشعار لرئيس القسم مع ملاحظتك حول برنامج المتابعة.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder="اكتب ملاحظتك لرئيس القسم..."
            value={alertNote}
            onChange={(e) => setAlertNote(e.target.value)}
          />
          <DialogFooter className="flex gap-2 justify-end sm:justify-end">
            <Button variant="outline" onClick={() => setAlertOpen(false)}>إلغاء</Button>
            <Button
              disabled={sendAlert.isPending || !alertNote.trim()}
              onClick={async () => {
                await sendAlert.mutateAsync({ caseId, note: alertNote.trim() });
                setAlertOpen(false);
              }}
            >
              {sendAlert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال التنبيه"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!respondFor} onOpenChange={(o) => { if (!o) setRespondFor(null); }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>رد رئيس القسم</DialogTitle>
            <DialogDescription>سيتم إرسال إشعار للفني الذي أرسل التنبيه مع ردّك.</DialogDescription>
          </DialogHeader>
          {(() => {
            const target = alerts.find((a) => a.id === respondFor);
            return target?.note ? (
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">ملاحظة الفني: </span>{target.note}
              </p>
            ) : null;
          })()}
          <Textarea
            rows={3}
            placeholder="اكتب ردّك للفني..."
            value={respondNote}
            onChange={(e) => setRespondNote(e.target.value)}
          />
          <DialogFooter className="flex gap-2 justify-end sm:justify-end">
            <Button variant="outline" onClick={() => setRespondFor(null)}>إلغاء</Button>
            <Button
              disabled={respondAlert.isPending || !respondNote.trim()}
              onClick={async () => {
                if (!respondFor) return;
                await respondAlert.mutateAsync({ caseId, alertId: respondFor, note: respondNote.trim() });
                setRespondFor(null);
              }}
            >
              {respondAlert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال الرد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showForm && (
        <div className="rounded-lg border border-dashed p-3 space-y-3 mb-3 bg-muted/30">
          <p className="text-sm font-medium">جلسة جديدة</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">تاريخ الجلسة *</Label>
              <Input type="date" value={newForm.sessionDate} onChange={(e) => setNewForm((f) => ({ ...f, sessionDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">وقت الجلسة</Label>
              <Input type="time" value={newForm.sessionTime} onChange={(e) => setNewForm((f) => ({ ...f, sessionTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">الشرح / الوصف</Label>
              <Textarea rows={2} className="resize-none" placeholder="وصف الجلسة..." value={newForm.description} onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">اسم المعالج</Label>
              <Select value={newForm.technicianId || "none"} onValueChange={(v) => setNewForm((f) => ({ ...f, technicianId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المعالج..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— غير محدد —</SelectItem>
                  {staffList.filter((e: any) => {
                    if (e.employmentStatus !== "ACTIVE") return false;
                    const dep = e.department?.nameAr ?? "";
                    return dep.includes("الاطراف الصناعية") || dep.includes("الأطراف الصناعية") || dep.includes("العلاج الفيزيائي") || dep.includes("الادارة الطبية") || dep.includes("الإدارة الطبية");
                  }).map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.firstNameAr} {emp.lastNameAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">وقت دخول الجلسة</Label>
              <Input type="time" value={newForm.sessionStartTime} onChange={(e) => setNewForm((f) => ({ ...f, sessionStartTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">وقت الخروج من الجلسة</Label>
              <Input type="time" value={newForm.sessionEndTime} onChange={(e) => setNewForm((f) => ({ ...f, sessionEndTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">ملاحظات</Label>
              <Textarea rows={2} className="resize-none" placeholder="ملاحظات الجلسة..." value={newForm.notes} onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold">التوقيع</p>
                {newForm.technicianSignatureUrl ? (
                  <div className="relative">
                    <img src={newForm.technicianSignatureUrl} alt="التوقيع" className="h-16 w-full object-contain border rounded bg-white" />
                    <button onClick={() => setNewForm((f) => ({ ...f, technicianSignatureUrl: "" }))} className="absolute top-0 left-0 text-destructive text-xs p-0.5">✕</button>
                  </div>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={() => handleNewSignatureClick("technician")} disabled={!newForm.technicianId}>
                    {newForm.technicianId ? "جلب / رفع التوقيع" : "اختر المعالج أولاً"}
                  </Button>
                )}
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold">توقيع مدير القسم</p>
                {newForm.managerSignatureUrl ? (
                  <div className="relative">
                    <img src={newForm.managerSignatureUrl} alt="توقيع مدير القسم" className="h-16 w-full object-contain border rounded bg-white" />
                    <button onClick={() => setNewForm((f) => ({ ...f, managerSignatureUrl: "" }))} className="absolute top-0 left-0 text-destructive text-xs p-0.5">✕</button>
                  </div>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={() => handleNewSignatureClick("manager")}>
                    جلب / رفع التوقيع
                  </Button>
                )}
              </div>
            </div>
          </div>
          <input ref={newSigFileRef} type="file" accept="image/*" className="hidden" onChange={handleNewSignatureFileChange} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!newForm.sessionDate || createProgram.isPending} className="gap-1">
              {createProgram.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              إضافة
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : programs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">لا توجد جلسات مسجّلة</p>
      ) : (
        <div className="space-y-3">
          {programs.map((program: any, idx: number) => (
            <TreatmentProgramCard
              key={program.id ?? idx}
              caseId={caseId}
              program={program}
              idx={idx}
              staffList={staffList}
              currentUser={currentUser}
              locked={locked}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Review Program card & section ────────────────────────────────────────────
function ReviewProgramCard({
  caseId, review, idx, staffList, currentUser, locked,
}: {
  caseId: string;
  review: any;
  idx: number;
  staffList: any[];
  currentUser: any;
  locked?: boolean;
}) {
  const updateReview = useUpdateReviewProgram();
  const deleteReview = useDeleteReviewProgram();
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [form, setForm] = useState({
    sessionDate: review.sessionDate ? new Date(review.sessionDate).toISOString().slice(0, 10) : "",
    sessionTime: review.sessionTime ?? "",
    description: review.description ?? "",
    technicianId: review.technicianId ?? "",
    sessionStartTime: review.sessionStartTime ?? "",
    sessionEndTime: review.sessionEndTime ?? "",
    signatureUrl: review.signatureUrl ?? "",
    notes: review.notes ?? "",
  });
  const [sigUploadFor, setSigUploadFor] = useState(false);
  const sigFileRef = useRef<HTMLInputElement>(null);

  const handleSignatureClick = async () => {
    const empId = form.technicianId;
    if (!empId) { toast.error("أدخل اسم المعالج أولاً"); return; }
    try {
      const sig = await clinicProstheticsApi.getEmployeeSignature(empId);
      if (sig.hasSignature && sig.signatureUrl) {
        const url = sig.signatureUrl.startsWith("http") ? sig.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${sig.signatureUrl}`;
        setForm((f) => ({ ...f, signatureUrl: url }));
      } else {
        setSigUploadFor(true);
        setTimeout(() => sigFileRef.current?.click(), 50);
      }
    } catch { toast.error("فشل جلب بيانات التوقيع"); }
  };

  const handleSignatureFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sigUploadFor) return;
    const empId = form.technicianId;
    if (!empId) return;
    try {
      const res = await clinicProstheticsApi.uploadEmployeeSignature(empId, file);
      const url = res.signatureUrl.startsWith("http") ? res.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${res.signatureUrl}`;
      setForm((f) => ({ ...f, signatureUrl: url }));
      toast.success("تم رفع التوقيع");
    } catch { toast.error("فشل رفع التوقيع"); }
    setSigUploadFor(false);
    e.target.value = "";
  };

  const handleSave = async () => {
    await updateReview.mutateAsync({
      caseId,
      reviewId: review.id,
      dto: {
        sessionDate: form.sessionDate ? new Date(form.sessionDate).toISOString() : undefined,
        sessionTime: form.sessionTime || undefined,
        description: form.description || undefined,
        technicianId: form.technicianId || undefined,
        sessionStartTime: form.sessionStartTime || undefined,
        sessionEndTime: form.sessionEndTime || undefined,
        signatureUrl: form.signatureUrl || undefined,
        notes: form.notes || undefined,
      },
    });
    setEditing(false);
  };

  const technicianName = staffList.find((e) => e.id === form.technicianId);
  const displayDate = form.sessionDate ? new Date(form.sessionDate).toLocaleDateString("en-GB") : null;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex justify-between items-start">
        <div className="flex gap-2 items-center flex-wrap">
          <Badge variant="secondary" className="text-base font-bold px-3 py-1">#{idx + 1}</Badge>
          {displayDate && <span className="font-medium text-sm">{displayDate}</span>}
          {form.sessionTime && <span className="text-xs text-muted-foreground">{form.sessionTime}</span>}
        </div>
        {!locked && (
          <div className="flex gap-1.5">
            <Button size="sm" variant={editing ? "default" : "outline"} onClick={() => setEditing((v) => !v)}>
              {editing ? "إغلاق" : "تعديل"}
            </Button>
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDel(true)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <Dialog open={confirmDel} onOpenChange={setConfirmDel}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>هل تريد حذف هذه الزيارة؟ لا يمكن التراجع عن هذا الإجراء.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmDel(false)}>لا</Button>
            <Button variant="destructive" disabled={deleteReview.isPending}
              onClick={() => { deleteReview.mutate({ caseId, reviewId: review.id }); setConfirmDel(false); }}>
              {deleteReview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "نعم، احذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!editing && (
        <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
          {form.description && <p><span className="font-medium text-foreground">الشرح: </span>{form.description}</p>}
          {technicianName && <p><span className="font-medium text-foreground">المعالج: </span>{technicianName.firstNameAr} {technicianName.lastNameAr}</p>}
          {(form.sessionStartTime || form.sessionEndTime) && (
            <p><span className="font-medium text-foreground">الوقت: </span>{form.sessionStartTime || "—"} — {form.sessionEndTime || "—"}</p>
          )}
          {form.notes && <p><span className="font-medium text-foreground">ملاحظات: </span>{form.notes}</p>}
          {form.signatureUrl && (
            <div className="pt-1">
              <img src={form.signatureUrl} alt="التوقيع" className="h-10 object-contain border rounded bg-white" />
              <p className="text-[10px] mt-0.5">التوقيع</p>
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className="space-y-3 pt-2 border-t">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">تاريخ الزيارة</Label>
              <Input type="date" value={form.sessionDate} onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الوقت</Label>
              <Input type="time" value={form.sessionTime} onChange={(e) => setForm((f) => ({ ...f, sessionTime: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">الشرح / الوصف</Label>
            <Textarea rows={2} placeholder="وصف الزيارة..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="resize-none" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">اسم المعالج</Label>
            <Select value={form.technicianId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, technicianId: v === "none" ? "" : v, signatureUrl: "" }))}>
              <SelectTrigger><SelectValue placeholder="اختر المعالج..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— غير محدد —</SelectItem>
                {staffList.filter((e: any) => {
                  if (e.employmentStatus !== "ACTIVE") return false;
                  const dep = e.department?.nameAr ?? "";
                  return dep.includes("الاطراف الصناعية") || dep.includes("الأطراف الصناعية") || dep.includes("العلاج الفيزيائي") || dep.includes("الادارة الطبية") || dep.includes("الإدارة الطبية");
                }).map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.firstNameAr} {emp.lastNameAr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">وقت الدخول</Label>
              <Input type="time" value={form.sessionStartTime} onChange={(e) => setForm((f) => ({ ...f, sessionStartTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">وقت الخروج</Label>
              <Input type="time" value={form.sessionEndTime} onChange={(e) => setForm((f) => ({ ...f, sessionEndTime: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">ملاحظات</Label>
            <Textarea rows={2} placeholder="ملاحظات..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="resize-none" />
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-xs font-semibold">التوقيع</p>
            {form.signatureUrl ? (
              <div className="relative">
                <img src={form.signatureUrl} alt="التوقيع" className="h-16 w-full object-contain border rounded bg-white" />
                <button onClick={() => setForm((f) => ({ ...f, signatureUrl: "" }))} className="absolute top-0 left-0 text-destructive text-xs p-0.5">✕</button>
              </div>
            ) : (
              <Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={handleSignatureClick} disabled={!form.technicianId}>
                {form.technicianId ? "جلب / رفع التوقيع" : "اختر المعالج أولاً"}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={updateReview.isPending} className="flex-1 gap-1">
              {updateReview.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              حفظ
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>إلغاء</Button>
          </div>

          <input ref={sigFileRef} type="file" accept="image/*" className="hidden" onChange={handleSignatureFileChange} />
        </div>
      )}
    </div>
  );
}

function ReviewProgramsSection({
  caseId, staffList, currentUser, locked,
}: {
  caseId: string;
  staffList: any[];
  currentUser: any;
  locked?: boolean;
}) {
  const { data: reviews = [], isLoading } = useReviewPrograms(caseId);
  const createReview = useCreateReviewProgram();
  const [showForm, setShowForm] = useState(false);
  const [newForm, setNewForm] = useState({
    sessionDate: new Date().toISOString().slice(0, 10),
    sessionTime: "",
    description: "",
    technicianId: "",
    sessionStartTime: "",
    sessionEndTime: "",
    notes: "",
  });

  const handleAdd = async () => {
    if (!newForm.sessionDate) return;
    await createReview.mutateAsync({
      caseId,
      dto: {
        sessionDate: new Date(newForm.sessionDate).toISOString(),
        sessionTime: newForm.sessionTime || undefined,
        description: newForm.description || undefined,
        technicianId: newForm.technicianId || undefined,
        sessionStartTime: newForm.sessionStartTime || undefined,
        sessionEndTime: newForm.sessionEndTime || undefined,
        notes: newForm.notes || undefined,
      },
    });
    setNewForm({ sessionDate: new Date().toISOString().slice(0, 10), sessionTime: "", description: "", technicianId: "", sessionStartTime: "", sessionEndTime: "", notes: "" });
    setShowForm(false);
  };

  return (
    <Section
      title={`برنامج المراجعة${reviews.length > 0 ? ` (${reviews.length})` : ""}`}
      action={!locked && (
        <Button size="sm" variant={showForm ? "secondary" : "outline"} className="gap-1 text-xs" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-3.5 w-3.5" />
          {showForm ? "إغلاق" : "إضافة زيارة"}
        </Button>
      )}
    >
      {showForm && (
        <div className="rounded-lg border border-dashed p-3 space-y-3 mb-3 bg-muted/30">
          <p className="text-sm font-medium">زيارة مراجعة جديدة</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">تاريخ الزيارة *</Label>
              <Input type="date" value={newForm.sessionDate} onChange={(e) => setNewForm((f) => ({ ...f, sessionDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الوقت</Label>
              <Input type="time" value={newForm.sessionTime} onChange={(e) => setNewForm((f) => ({ ...f, sessionTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">الشرح / الوصف</Label>
              <Textarea rows={2} className="resize-none" placeholder="وصف الزيارة..." value={newForm.description} onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">اسم المعالج</Label>
              <Select value={newForm.technicianId || "none"} onValueChange={(v) => setNewForm((f) => ({ ...f, technicianId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المعالج..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— غير محدد —</SelectItem>
                  {staffList.filter((e: any) => {
                    if (e.employmentStatus !== "ACTIVE") return false;
                    const dep = e.department?.nameAr ?? "";
                    return dep.includes("الاطراف الصناعية") || dep.includes("الأطراف الصناعية") || dep.includes("العلاج الفيزيائي") || dep.includes("الادارة الطبية") || dep.includes("الإدارة الطبية");
                  }).map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.firstNameAr} {emp.lastNameAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">وقت الدخول</Label>
              <Input type="time" value={newForm.sessionStartTime} onChange={(e) => setNewForm((f) => ({ ...f, sessionStartTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">وقت الخروج</Label>
              <Input type="time" value={newForm.sessionEndTime} onChange={(e) => setNewForm((f) => ({ ...f, sessionEndTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">ملاحظات</Label>
              <Textarea rows={2} className="resize-none" placeholder="ملاحظات..." value={newForm.notes} onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!newForm.sessionDate || createReview.isPending} className="gap-1">
              {createReview.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              إضافة
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">لا توجد زيارات مراجعة مسجّلة</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review: any, idx: number) => (
            <ReviewProgramCard
              key={review.id ?? idx}
              caseId={caseId}
              review={review}
              idx={idx}
              staffList={staffList}
              currentUser={currentUser}
              locked={locked}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Gait Analysis (Pro-016) ──────────────────────────────────────────────────

const SUSPENSION_OPTS = [
  { v: "PIN", l: "Pin" }, { v: "PASSIVE_VACUUM", l: "Passive vacuum" }, { v: "ACTIVE_VACUUM", l: "Active vacuum" },
  { v: "DVS", l: "DVS" }, { v: "SOFT_SOCKET", l: "Soft socket" }, { v: "BELT_STRAP", l: "belt/strap" }, { v: "OTHER", l: "other" },
];
const SOCKET_BEARING_OPTS = [
  { v: "PTB", l: "التحميل على وتر الرصفة " },
  { v: "TSB", l: "تحميل كامل على سطح الجذع " },
  { v: "MAS", l: "سوكيت تشريحي عند الكاحل " },
  { v: "ISCHIAL_CONTAINMENT", l: "التحميل على عظم الاسك " },
  { v: "OTHER", l: "أخر " },
];
const KNEE_JOINT_OPTS = [
  { v: "MKP", l: "MKP" }, { v: "MONOCENTRIC", l: "monocentric" }, { v: "POLYCENTRIC", l: "polycentric" },
  { v: "HYDRAULIC", l: "hydraulic" }, { v: "MECHANICAL", l: "mechanical" }, { v: "OTHER", l: "other" },
];
const FOOT_TYPE_OPTS = [
  { v: "DYNAMIC", l: "dynamic" }, { v: "HYDRAULIC", l: "hydraulic" }, { v: "SACH", l: "SACH" },
  { v: "CARBON", l: "Carbon" }, { v: "SINGLE_AXIS", l: "single-axis" }, { v: "MULTI_AXIS", l: "multi-axis" }, { v: "OTHER", l: "other" },
];
const COMPLAINT_OPTS = [
  { v: "RAPID_FATIGUE", l: "تعب سريع " }, { v: "FALL_NEAR_FALL", l: "تعثّر " },
  { v: "DIFFICULTY_STAIRS", l: "صعوبة استخدام الدرج " }, { v: "FOOT_DRAG", l: "جر القدم " },
  { v: "KNEE_INSTABILITY", l: "عدم ثبات بالركبة " }, { v: "SOCKET_PAIN", l: "ألم بالسوكيت " },
  { v: "RESIDUAL_LIMB_PAIN", l: "ألم بالجذمور " }, { v: "NONE", l: "لا يوجد " },
];
const GFP_OPTS = [{ v: "GOOD", l: "جيد" }, { v: "FAIR", l: "متوسط" }, { v: "POOR", l: "ضعيف" }];
const SITTING_BAL_OPTS = [{ v: "INDEPENDENT", l: "مستقل" }, { v: "ASSISTED", l: "بمساعدة" }, { v: "UNSTABLE", l: "غير مستقر" }];
const STANDING_BAL_OPTS = [{ v: "STABLE", l: "مستقر" }, { v: "ASSISTED", l: "بمساعدة" }, { v: "UNSTABLE", l: "غير مستقر" }];
const GAIT_DEVICE_OPTS = [{ v: "NONE", l: "لا يوجد" }, { v: "CANE", l: "عصا" }, { v: "CRUTCHES", l: "عكاز" }, { v: "WALKER", l: "مشاية" }];
const SYMMETRY_OPTS_G = [{ v: "GOOD", l: "جيد" }, { v: "FAIR", l: "متوسط" }, { v: "POOR", l: "ضعيف" }, { v: "NONE", l: "لا يوجد" }];

const GAIT_PHASES = [
  { key: "initialContact", label: "بداية ملامسة الأرض", extraField: "notes" as const, deviations: [
    { v: "FLAT_FOOT", l: "ملامسة كاملة للقدم" }, { v: "TOE_CONTACT", l: "ملامسة الأصابع أولاً" },
    { v: "FOOT_SLAP", l: "سقوط القدم" }, { v: "UNSTABLE_KNEE", l: "عدم ثبات الركبة" },
    { v: "WIDE_BASE", l: "قاعدة مشي واسعة" }, { v: "TRUNK_LEAN", l: "ميل الجذع" },
    { v: "LATERAL_HEEL_WHIP", l: "ميلان الكعب للخارج" }, { v: "MEDIAL_HEEL_WHIP", l: "ميلان الكعب للداخل" },
  ]},
  { key: "loadingResponse", label: "استجابة التحميل", extraField: "cause" as const, deviations: [
    { v: "EXCESSIVE_KNEE_FLEXION", l: "انثناء زائد للركبة" }, { v: "KNEE_HYPEREXTENSION", l: "فرط بسط الركبة" },
    { v: "SOCKET_ROTATION", l: "دوران السوكت" }, { v: "LATERAL_TRUNK_BEND", l: "ميل جانبي للجذع" },
    { v: "PAIN_AVOIDANCE", l: "تجنب الألم" }, { v: "VARUS_MOMENT", l: "انحراف للداخل" }, { v: "VALGUS_MOMENT", l: "انحراف للخارج" },
  ]},
  { key: "midStance", label: "منتصف الارتكاز", extraField: "cause" as const, deviations: [
    { v: "ABNORMAL_GAIT_PATTERN", l: "نمط مشي غير طبيعي" }, { v: "LATERAL_TRUNK_LEAN", l: "ميل جانبي للجذع" },
    { v: "SHORT_STANCE_TIME", l: "وقت ارتكاز قصير على الطرف الصناعي" }, { v: "UNEQUAL_STEP_LENGTH", l: "عدم تساوي طول الخطوة" },
    { v: "BODY_RISE_SOUND", l: "رفع الجسم على الطرف السليم" },
  ]},
  { key: "terminalStance", label: "نهاية الارتكاز / الدفع", extraField: "cause" as const, deviations: [
    { v: "REDUCED_PUSH_OFF", l: "ضعف الدفع" }, { v: "EARLY_HEEL_RISE", l: "رفع الكعب مبكراً" },
    { v: "LATE_HEEL", l: "رفع الكعب متأخراً" }, { v: "KNEE_INSTABILITY", l: "عدم ثبات الركبة" },
  ]},
  { key: "preSwing", label: "قبل التأرجح", extraField: "cause" as const, deviations: [
    { v: "HIP_HIKING", l: "رفع الحوض" }, { v: "CIRCUMDUCTION", l: "دوران جانبي للطرف" },
    { v: "EXCESSIVE_PELVIC_ROTATION", l: "دوران زائد للحوض" }, { v: "DELAYED_TOE_OFF", l: "تأخر رفع الأصابع" },
  ]},
  { key: "swingPhase", label: "مرحلة التأرجح", extraField: "notes" as const, deviations: [
    { v: "TOE_DRAG", l: "جر الأصابع" }, { v: "CIRCUMDUCTION", l: "دوران جانبي" }, { v: "HIP_HIKING", l: "رفع الحوض" },
    { v: "TERMINAL_IMPACT", l: "اصطدام نهاية التأرجح" }, { v: "LACK_KNEE_FLEXION", l: "نقص انثناء الركبة" }, { v: "EXCESS_KNEE_FLEXION", l: "انثناء زائد للركبة" },
  ]},
] as const;

const PROSTHETIC_ISSUE_OPTS = [
  { v: "PISTONING", l: "حركة عمودية داخل السوكت" },
  { v: "LOOSE_SUSPENSION", l: "تعليق ضعيف" },
  { v: "TOO_MANY_SOCKS", l: "الحاجة إلى جوارب كثيرة" },
  { v: "LEG_TOO_LONG", l: "الطرف طويل" },
  { v: "LEG_TOO_SHORT", l: "الطرف قصير" },
  { v: "FOOT_TOO_STIFF", l: "القدم قاسية" },
  { v: "FOOT_TOO_SOFT", l: "القدم طرية" },
  { v: "INCORRECT_KNEE_SETTINGS", l: "إعدادات الركبة غير مناسبة" },
];
const LIKELY_CAUSE_OPTS = [
  { v: "ALIGNMENT", l: "ضبط" }, { v: "SOCKET", l: "سوكت" }, { v: "SUSPENSION", l: "تعليق" },
  { v: "COMPONENT_SELECTION", l: "اختيار المكونات" }, { v: "MUSCLE_WEAKNESS", l: "ضعف عضلي" },
  { v: "PAIN", l: "ألم" }, { v: "LEARNED_GAIT_PATTERN", l: "نمط مكتسب" }, { v: "BALANCE", l: "توازن" },
];
const RECOMMENDATION_OPTS = [
  { v: "ALIGNMENT_ADJUSTMENT", l: "تعديل الضبط" },
  { v: "SOCKET_MODIFICATION", l: "تعديل / تبديل السوكت" },
  { v: "IMPROVE_SUSPENSION", l: "تحسين التعليق" },
  { v: "CHANGE_FOOT", l: "تغيير القدم" },
  { v: "ADJUST_KNEE_SETTINGS", l: "تعديل إعدادات الركبة" },
  { v: "ADD_SHOCK_ABSORBER", l: "إضافة ممتص صدمات / تخميد" },
];
const REHAB_PLAN_OPTS = [
  { v: "STRENGTHENING", l: "تقوية (مبعدات الورك / الجذع) " },
  { v: "BALANCE_TRAINING", l: "تدريب توازن " },
  { v: "GAIT_STEP_SYMMETRY", l: "تدريب مشي (تماثل الخطوات) " },
  { v: "STAIRS_SLOPES", l: "تدريب درج ومنحدرات " },
  { v: "COMMUNITY_AMBULATION", l: "تدريب خارج المنزل " },
];

const INITIAL_GAIT_FORM = {
  sessionDate: "",
  suspensionSystem: [] as string[],
  socketBearing: "", kneeJointType: "", footType: "",
  patientComplaints: [] as string[], painIntensity: "" as string | number,
  alignmentCheck: "", hasRomLimitations: null as boolean | null,
  hasHipFlexionContracture: null as boolean | null, hasKneeFlexionContracture: null as boolean | null,
  weakHipAbductors: null as boolean | null, weakHipExtensors: null as boolean | null,
  weakTrunkMuscles: null as boolean | null, otherWeakness: "",
  trunkStability: "", abdominalControl: "", pelvicControl: "", sittingBalance: "", standingBalance: "",
  assistiveDevice: "", speedMs: "", cadence: "", stepLengthProsCm: "", stepLengthSoundCm: "",
  stancePercProsthetic: "", stancePercSound: "", symmetry: "",
  phases: {} as Record<string, { deviations: string[]; possibleCause: string; notes: string }>,
  gaitNotes: "",
  prostheticIssues: [] as string[],
  mainProblem: "", likelyCauses: [] as string[], recommendations: [] as string[],
  rehabPlanItems: [] as string[], rehabNotes: "",
  examinerProsthetistId: "", prosthetistSignatureUrl: "",
  notes: "",
  // Optional free-text notes (diagnosis/recommendations + "other" answers).
  recommendationsNotes: "", mainProblemNotes: "",
  patientComplaintsOtherNotes: "", suspensionSystemOtherNotes: "",
  prostheticIssuesOtherNotes: "", likelyCausesOtherNotes: "",
};
type GaitForm = typeof INITIAL_GAIT_FORM;

function gaitFormFromData(d: any): GaitForm {
  const phases: Record<string, { deviations: string[]; possibleCause: string; notes: string }> = {};
  ["initialContact","loadingResponse","midStance","terminalStance","preSwing","swingPhase"].forEach((k) => {
    phases[k] = { deviations: d[k]?.deviations ?? [], possibleCause: d[k]?.possibleCause ?? "", notes: d[k]?.notes ?? "" };
  });
  return {
    sessionDate: d.sessionDate?.slice(0,10) ?? "",
    suspensionSystem: d.suspensionSystem ?? [],
    socketBearing: d.socketBearing ?? "", kneeJointType: d.kneeJointType ?? "", footType: d.footType ?? "",
    patientComplaints: d.patientComplaints ?? [], painIntensity: d.painIntensity?.toString() ?? "",
    alignmentCheck: d.alignmentCheck ?? "", hasRomLimitations: d.hasRomLimitations ?? null,
    hasHipFlexionContracture: d.hasHipFlexionContracture ?? null, hasKneeFlexionContracture: d.hasKneeFlexionContracture ?? null,
    weakHipAbductors: d.weakHipAbductors ?? null, weakHipExtensors: d.weakHipExtensors ?? null,
    weakTrunkMuscles: d.weakTrunkMuscles ?? null, otherWeakness: d.otherWeakness ?? "",
    trunkStability: d.trunkStability ?? "", abdominalControl: d.abdominalControl ?? "",
    pelvicControl: d.pelvicControl ?? "", sittingBalance: d.sittingBalance ?? "", standingBalance: d.standingBalance ?? "",
    assistiveDevice: d.assistiveDevice ?? "", speedMs: d.speedMs?.toString() ?? "", cadence: d.cadence?.toString() ?? "",
    stepLengthProsCm: d.stepLengthProsCm?.toString() ?? "", stepLengthSoundCm: d.stepLengthSoundCm?.toString() ?? "",
    stancePercProsthetic: d.stancePercProsthetic?.toString() ?? "", stancePercSound: d.stancePercSound?.toString() ?? "",
    symmetry: d.symmetry ?? "", phases, gaitNotes: d.gaitNotes ?? "",
    prostheticIssues: d.prostheticIssues ?? [],
    mainProblem: d.mainProblem ?? "", likelyCauses: d.likelyCauses ?? [], recommendations: d.recommendations ?? [],
    rehabPlanItems: [
      ...(d.rehabPlan?.strengthening ?? []),
      ...(d.rehabPlan?.balanceTrain ?? []),
      ...(d.rehabPlan?.gaitTrain ?? []),
    ], rehabNotes: d.rehabNotes ?? "",
    examinerProsthetistId: d.examinerProsthetistId ?? "", prosthetistSignatureUrl: d.prosthetistSignatureUrl ?? "",
    notes: d.notes ?? "",
    recommendationsNotes: d.recommendationsNotes ?? "", mainProblemNotes: d.mainProblemNotes ?? "",
    patientComplaintsOtherNotes: d.patientComplaintsOtherNotes ?? "", suspensionSystemOtherNotes: d.suspensionSystemOtherNotes ?? "",
    prostheticIssuesOtherNotes: d.prostheticIssuesOtherNotes ?? "", likelyCausesOtherNotes: d.likelyCausesOtherNotes ?? "",
  };
}

function gaitFormToDto(f: GaitForm) {
  const phaseDto = (k: string) => ({
    deviations: f.phases[k]?.deviations?.length ? f.phases[k].deviations : undefined,
    possibleCause: f.phases[k]?.possibleCause || undefined,
    notes: f.phases[k]?.notes || undefined,
  });
  return {
    sessionDate: f.sessionDate || undefined,
    suspensionSystem: f.suspensionSystem.length ? f.suspensionSystem : undefined,
    socketBearing: f.socketBearing || undefined, kneeJointType: f.kneeJointType || undefined, footType: f.footType || undefined,
    patientComplaints: f.patientComplaints.length ? f.patientComplaints : undefined,
    painIntensity: f.painIntensity !== "" ? Number(f.painIntensity) : undefined,
    alignmentCheck: f.alignmentCheck || undefined,
    hasRomLimitations: f.hasRomLimitations ?? undefined,
    hasHipFlexionContracture: f.hasHipFlexionContracture ?? undefined,
    hasKneeFlexionContracture: f.hasKneeFlexionContracture ?? undefined,
    weakHipAbductors: f.weakHipAbductors ?? undefined, weakHipExtensors: f.weakHipExtensors ?? undefined,
    weakTrunkMuscles: f.weakTrunkMuscles ?? undefined, otherWeakness: f.otherWeakness || undefined,
    trunkStability: f.trunkStability || undefined, abdominalControl: f.abdominalControl || undefined,
    pelvicControl: f.pelvicControl || undefined, sittingBalance: f.sittingBalance || undefined, standingBalance: f.standingBalance || undefined,
    assistiveDevice: f.assistiveDevice || undefined,
    speedMs: f.speedMs !== "" ? Number(f.speedMs) : undefined,
    cadence: f.cadence !== "" ? Number(f.cadence) : undefined,
    stepLengthProsCm: f.stepLengthProsCm !== "" ? Number(f.stepLengthProsCm) : undefined,
    stepLengthSoundCm: f.stepLengthSoundCm !== "" ? Number(f.stepLengthSoundCm) : undefined,
    stancePercProsthetic: f.stancePercProsthetic !== "" ? Number(f.stancePercProsthetic) : undefined,
    stancePercSound: f.stancePercSound !== "" ? Number(f.stancePercSound) : undefined,
    symmetry: f.symmetry || undefined,
    initialContact: phaseDto("initialContact"), loadingResponse: phaseDto("loadingResponse"),
    midStance: phaseDto("midStance"), terminalStance: phaseDto("terminalStance"),
    preSwing: phaseDto("preSwing"), swingPhase: phaseDto("swingPhase"),
    gaitNotes: f.gaitNotes || undefined,
    prostheticIssues: f.prostheticIssues.length ? f.prostheticIssues : undefined,
    mainProblem: f.mainProblem || undefined, likelyCauses: f.likelyCauses.length ? f.likelyCauses : undefined,
    recommendations: f.recommendations.length ? f.recommendations : undefined,
    rehabPlan: f.rehabPlanItems.length ? { gaitTrain: f.rehabPlanItems } : undefined,
    rehabNotes: f.rehabNotes || undefined,
    examinerProsthetistId: f.examinerProsthetistId || undefined, prosthetistSignatureUrl: f.prosthetistSignatureUrl || undefined,
    notes: f.notes || undefined,
    recommendationsNotes: f.recommendationsNotes || undefined,
    mainProblemNotes: f.mainProblemNotes || undefined,
    patientComplaintsOtherNotes: f.patientComplaintsOtherNotes || undefined,
    suspensionSystemOtherNotes: f.suspensionSystemOtherNotes || undefined,
    prostheticIssuesOtherNotes: f.prostheticIssuesOtherNotes || undefined,
    likelyCausesOtherNotes: f.likelyCausesOtherNotes || undefined,
  };
}

function GfpButtons({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1">
      {GFP_OPTS.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(value === o.v ? "" : o.v)}
          className={`flex-1 py-1 rounded border text-xs font-medium transition-colors ${value === o.v ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
        >{o.l}</button>
      ))}
    </div>
  );
}

function YesNoButtons({ value, onChange }: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div className="flex gap-1">
      {([true, false] as const).map((v) => (
        <button key={String(v)} type="button" onClick={() => onChange(value === v ? null : v)}
          className={`flex-1 py-1 rounded border text-xs font-medium transition-colors ${value === v ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
        >{v ? "نعم" : "لا"}</button>
      ))}
    </div>
  );
}

function GaitAnalysisCard({
  caseId, staffList, session, idx, onCancel, patient,
}: { caseId: string; staffList: any[]; session?: any; idx?: number; onCancel?: () => void; patient?: any }) {
  const isNew = !session;
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<GaitForm>(() => session ? gaitFormFromData(session) : { ...INITIAL_GAIT_FORM, phases: {} });
  const [activeTab, setActiveTab] = useState("basic");
  const [pdfExporting, setPdfExporting] = useState(false);
  const prostoSigRef = useRef<HTMLInputElement>(null);
  const addMut = useAddGaitAnalysisForm();
  const updateMut = useUpdateGaitAnalysisForm();
  const saveMut = useSaveGaitAnalysisForm();
  const archiveMut = useArchiveGaitAnalysisForm();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  // Frozen after POST /save — the backend rejects any further PATCH (400).
  const isSaved = !!session?.isSaved;
  const isArchived = !!session?.archivedAt;

  const toggleMulti = (field: keyof GaitForm, v: string) =>
    setForm((f) => {
      const arr = (f[field] as string[]);
      return { ...f, [field]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
    });

  const togglePhaseDeviation = (phase: string, v: string) =>
    setForm((f) => {
      const cur = f.phases[phase] ?? { deviations: [], possibleCause: "", notes: "" };
      const devs = cur.deviations.includes(v) ? cur.deviations.filter((x) => x !== v) : [...cur.deviations, v];
      return { ...f, phases: { ...f.phases, [phase]: { ...cur, deviations: devs } } };
    });

  const setPhaseText = (phase: string, field: "possibleCause" | "notes", val: string) =>
    setForm((f) => {
      const cur = f.phases[phase] ?? { deviations: [], possibleCause: "", notes: "" };
      return { ...f, phases: { ...f.phases, [phase]: { ...cur, [field]: val } } };
    });

  const handleSigFile = async (e: React.ChangeEvent<HTMLInputElement>, _role: "prosto") => {
    const file = e.target.files?.[0]; if (!file) return;
    const empId = form.examinerProsthetistId;
    if (!empId) return;
    try {
      const res = await clinicProstheticsApi.uploadEmployeeSignature(empId, file);
      const url = res.signatureUrl.startsWith("http") ? res.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${res.signatureUrl}`;
      setForm((f) => ({ ...f, prosthetistSignatureUrl: url }));
      toast.success("تم رفع التوقيع");
    } catch { toast.error("فشل رفع التوقيع"); }
    e.target.value = "";
  };

  const handleSigClick = async (_role: "prosto") => {
    const empId = form.examinerProsthetistId;
    if (!empId) { toast.error("اختر الموظف أولاً"); return; }
    try {
      const sig = await clinicProstheticsApi.getEmployeeSignature(empId);
      if (sig.hasSignature && sig.signatureUrl) {
        const url = sig.signatureUrl.startsWith("http") ? sig.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${sig.signatureUrl}`;
        setForm((f) => ({ ...f, prosthetistSignatureUrl: url }));
      } else {
        setTimeout(() => prostoSigRef.current?.click(), 50);
      }
    } catch { toast.error("فشل جلب التوقيع"); }
  };

  const handleSave = async () => {
    const dto = gaitFormToDto(form);
    if (isNew) { await addMut.mutateAsync({ caseId, dto }); onCancel?.(); return; }
    // Existing session: persist the edits, then freeze the form (PATCH is
    // rejected afterwards) — a single "حفظ نهائي" action.
    await updateMut.mutateAsync({ caseId, formId: session.id, dto });
    await saveMut.mutateAsync({ caseId, formId: session.id });
    setEditing(false);
  };
  const isSaving = addMut.isPending || updateMut.isPending || saveMut.isPending;

  // ── PDF Export — same style/header/footer/colors as the physio full PDF ──────
  const handleExportPdf = async () => {
    if (pdfExporting) return;
    setPdfExporting(true);
    try {
      const { downloadProstheticsGaitPdf } = await import("@/components/clinic/prosthetics-gait-pdf");
      const pros = staffList.find((e: any) => e.id === form.examinerProsthetistId);
      await downloadProstheticsGaitPdf({
        patient: patient
          ? {
              firstName: patient.firstName,
              lastName: patient.lastName,
              patientNumber: patient.patientNumber,
              dateOfBirth: patient.dateOfBirth,
            }
          : undefined,
        caseId,
        sessionNumber: (idx ?? 0) + 1,
        prosthetistName: pros ? `${pros.firstNameAr ?? ""} ${pros.lastNameAr ?? ""}`.trim() : undefined,
        form,
      });
      toast.success("تم تصدير PDF");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`فشل تصدير PDF: ${msg.slice(0, 120)}`);
      console.error("[Gait PDF Export]", e);
    } finally {
      setPdfExporting(false);
    }
  };

  // Collapsed card
  if (!isNew && !editing) {
    return (
      <>
        <div className="rounded-lg border p-3 space-y-1 transition-colors cursor-pointer hover:bg-muted/30"
          onClick={() => setEditing(true)}>
          <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center flex-wrap">
              <Badge variant="secondary" className="font-bold">#{(idx ?? 0) + 1}</Badge>
              {session.sessionDate && <span className="text-sm">{new Date(session.sessionDate).toLocaleDateString("en-GB")}</span>}
              {session.symmetry && <Badge variant="outline" className="text-xs">{SYMMETRY_OPTS_G.find((o) => o.v === session.symmetry)?.l}</Badge>}
              {session.assistiveDevice && session.assistiveDevice !== "NONE" && (
                <Badge className="text-xs bg-blue-100 text-blue-800">{GAIT_DEVICE_OPTS.find((o) => o.v === session.assistiveDevice)?.l}</Badge>
              )}
              {isSaved && (
                <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  محفوظ
                </Badge>
              )}
              {isArchived && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs gap-1">
                  <Archive className="h-3 w-3" />
                  مؤرشف
                </Badge>
              )}
            </div>
            <div className="flex gap-1 flex-wrap justify-end" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="outline" className="gap-1" onClick={handleExportPdf} disabled={pdfExporting}>
                {pdfExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {pdfExporting ? "جاري..." : "تصدير PDF"}
              </Button>
              {!isArchived && (
                <Button size="sm" variant="outline" className="gap-1"
                  onClick={() => { setArchiveReason(""); setArchiveOpen(true); }}>
                  <Archive className="h-3.5 w-3.5" />
                  أرشفة
                </Button>
              )}
            </div>
          </div>
          {session.mainProblem && <p className="text-xs text-muted-foreground">{session.mainProblem}</p>}
          {isArchived && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800 space-y-0.5">
              <p className="flex items-center gap-1 font-medium">
                <Archive className="h-3 w-3" />
                أُرشِف{session.archivedAt ? ` بتاريخ ${new Date(session.archivedAt).toLocaleDateString("en-GB")}` : ""}
              </p>
              {session.archiveNotes && <p><span className="font-medium">السبب: </span>{session.archiveNotes}</p>}
            </div>
          )}
        </div>

        <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle>أرشفة النموذج</DialogTitle>
              <DialogDescription>اذكر سبب الأرشفة.</DialogDescription>
            </DialogHeader>
            <Textarea rows={3} placeholder="سبب الأرشفة..." value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} />
            <DialogFooter className="flex gap-2 justify-end sm:justify-end">
              <Button variant="outline" onClick={() => setArchiveOpen(false)}>إلغاء</Button>
              <Button disabled={archiveMut.isPending || !archiveReason.trim()}
                onClick={async () => {
                  await archiveMut.mutateAsync({ caseId, formId: session.id, reason: archiveReason.trim() });
                  setArchiveOpen(false);
                }}>
                {archiveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "أرشفة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      {!isNew && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{isSaved ? "تفاصيل" : "تعديل"} الجلسة #{(idx ?? 0) + 1}</p>
            {isSaved && (
              <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" />
                محفوظ — للقراءة فقط
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="gap-1" onClick={handleExportPdf} disabled={pdfExporting}>
              {pdfExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {pdfExporting ? "جاري..." : "تصدير PDF"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>إغلاق</Button>
          </div>
        </div>
      )}

      {/* Saved forms are frozen server-side (PATCH → 400) — render read-only. */}
      <fieldset disabled={isSaved} className="contents">
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="basic" className="text-xs py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">تفاصيل الطرف الصناعي</TabsTrigger>
          <TabsTrigger value="phases" className="text-xs py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">أخطاء المشي</TabsTrigger>
          <TabsTrigger value="diagnosis" className="text-xs py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">التشخيص</TabsTrigger>
          <TabsTrigger value="rehab" className="text-xs py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">خطة العلاج</TabsTrigger>
          <TabsTrigger value="signatures" className="text-xs py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">التوقيعات</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: تفاصيل الطرف الصناعي ── */}
        <TabsContent value="basic" className="mt-4 space-y-0">
          {/* Session date */}
          <div className="mb-3 space-y-1.5">
            <Label className="text-xs">تاريخ الجلسة</Label>
            <Input type="date" value={form.sessionDate} onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))} />
          </div>

          {/* Paper-style table */}
          <div className="rounded-lg overflow-hidden border text-sm">

            {/* نظام التعليق */}
            <div className="grid grid-cols-[160px_1fr] divide-x divide-x-reverse border-b">
              <div className="bg-muted/40 px-3 py-2.5 text-xs font-semibold flex items-center">نظام التعليق</div>
              <div className="px-3 py-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                {SUSPENSION_OPTS.map((o) => (
                  <label key={o.v} className="flex items-center gap-1.5 cursor-pointer">
                    {/* Single-select: picking one clears the rest (still sent as an array). */}
                    <input type="checkbox" checked={form.suspensionSystem.includes(o.v)}
                      onChange={() => setForm((f) => {
                        const next = f.suspensionSystem.includes(o.v) ? [] : [o.v];
                        return { ...f, suspensionSystem: next, suspensionSystemOtherNotes: next.includes("OTHER") ? f.suspensionSystemOtherNotes : "" };
                      })}
                      className="w-[15px] h-[15px] checkbox-orange rounded-sm shrink-0" />
                    <span className="text-xs">{o.l}</span>
                  </label>
                ))}
                {form.suspensionSystem.includes("OTHER") && (
                  <Input value={form.suspensionSystemOtherNotes} onChange={(e) => setForm((f) => ({ ...f, suspensionSystemOtherNotes: e.target.value }))}
                    placeholder="تفاصيل نظام التعليق الآخر (اختياري)..." className="h-7 text-xs mt-1 w-full" />
                )}
              </div>
            </div>

            {/* التحميل على السوكيت */}
            <div className="grid grid-cols-[160px_1fr] divide-x divide-x-reverse border-b">
              <div className="bg-muted/40 px-3 py-2.5 text-xs font-semibold flex items-center">التحميل على السوكيت</div>
              <div className="px-3 py-2.5 space-y-1.5">
                {SOCKET_BEARING_OPTS.map((o) => (
                  <label key={o.v} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.socketBearing === o.v}
                      onChange={() => setForm((f) => ({ ...f, socketBearing: f.socketBearing === o.v ? "" : o.v }))}
                      className="w-[15px] h-[15px] checkbox-orange rounded-sm shrink-0" />
                    <span className="text-xs">{o.l}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* نوع مفصل الركبة */}
            <div className="grid grid-cols-[160px_1fr] divide-x divide-x-reverse border-b">
              <div className="bg-muted/40 px-3 py-2.5 text-xs font-semibold flex items-center">نوع مفصل الركبة</div>
              <div className="px-3 py-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                {KNEE_JOINT_OPTS.map((o) => (
                  <label key={o.v} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={form.kneeJointType === o.v}
                      onChange={() => setForm((f) => ({ ...f, kneeJointType: f.kneeJointType === o.v ? "" : o.v }))}
                      className="w-[15px] h-[15px] checkbox-orange rounded-sm shrink-0" />
                    <span className="text-xs">{o.l}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* نوع مفصل القدم */}
            <div className="grid grid-cols-[160px_1fr] divide-x divide-x-reverse border-b">
              <div className="bg-muted/40 px-3 py-2.5 text-xs font-semibold flex items-center">نوع مفصل القدم</div>
              <div className="px-3 py-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                {FOOT_TYPE_OPTS.map((o) => (
                  <label key={o.v} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={form.footType === o.v}
                      onChange={() => setForm((f) => ({ ...f, footType: f.footType === o.v ? "" : o.v }))}
                      className="w-[15px] h-[15px] checkbox-orange rounded-sm shrink-0" />
                    <span className="text-xs">{o.l}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* شكاوى المريض */}
            <div className="grid grid-cols-[160px_1fr] divide-x divide-x-reverse border-b">
              <div className="bg-muted/40 px-3 py-2.5 text-xs font-semibold flex items-center">شكاوى المريض</div>
              <div className="px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {COMPLAINT_OPTS.map((o) => (
                  <label key={o.v} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.patientComplaints.includes(o.v)} onChange={() => toggleMulti("patientComplaints", o.v)} className="w-[15px] h-[15px] checkbox-orange rounded-sm shrink-0" />
                    <span className="text-xs">{o.l}</span>
                  </label>
                ))}
                <Input value={form.patientComplaintsOtherNotes} onChange={(e) => setForm((f) => ({ ...f, patientComplaintsOtherNotes: e.target.value }))}
                  placeholder="تفاصيل شكوى أخرى (اختياري)..." className="h-7 text-xs mt-1 col-span-2" />
              </div>
            </div>

            {/* شدة الألم */}
            <div className="grid grid-cols-[160px_1fr] divide-x divide-x-reverse border-b">
              <div className="bg-muted/40 px-3 py-2.5 text-xs font-semibold flex items-center">شدة الألم</div>
              <div className="px-3 py-2.5 flex gap-3 items-center flex-wrap">
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <label key={n} className="flex flex-col items-center gap-0.5 cursor-pointer">
                    <input type="checkbox" checked={Number(form.painIntensity) === n}
                      onChange={() => setForm((f) => ({ ...f, painIntensity: Number(f.painIntensity) === n ? "" : n }))}
                      className="w-[17px] h-[17px] checkbox-orange rounded-sm" />
                    <span className="text-[10px] text-muted-foreground">{n}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* فحص الضبط + المدى الحركي */}
            <div className="grid grid-cols-[160px_1fr] divide-x divide-x-reverse border-b">
              <div className="bg-muted/40 px-3 py-2.5 text-xs font-semibold flex items-center">فحص الضبط</div>
              <div className="px-3 py-2.5 flex gap-4">
                {[{ v: "GOOD", l: "جيد" }, { v: "NEEDS_ADJUSTMENT", l: "يحتاج تعديل" }].map((o) => (
                  <label key={o.v} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.alignmentCheck === o.v}
                      onChange={() => setForm((f) => ({ ...f, alignmentCheck: f.alignmentCheck === o.v ? "" : o.v }))}
                      className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                    <span className="text-xs">{o.l}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[160px_1fr] divide-x divide-x-reverse border-b">
              <div className="bg-muted/40 px-3 py-2.5 text-xs font-semibold flex items-center">المدى الحركي</div>
              <div className="px-3 py-2.5 flex gap-4">
                {([true, false] as const).map((v) => (
                  <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.hasRomLimitations === v}
                      onChange={() => setForm((f) => ({ ...f, hasRomLimitations: f.hasRomLimitations === v ? null : v }))}
                      className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                    <span className="text-xs">{v ? "نعم" : "لا"}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[160px_1fr] divide-x divide-x-reverse border-b">
              <div className="bg-muted/40 px-3 py-2.5 text-xs font-semibold flex items-center">ملاحظات</div>
              <div className="px-3 py-1.5">
                <Input value={form.otherWeakness} onChange={(e) => setForm((f) => ({ ...f, otherWeakness: e.target.value }))} placeholder="..." className="h-7 text-xs border-0 shadow-none px-0 focus-visible:ring-0" />
              </div>
            </div>

            {/* فحص الجذمور */}
            <div className="border-b mt-4">
              <div className="bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground">فحص الجذمور</div>
              <div className="px-3 py-2.5 space-y-2">
                <p className="text-[11px] text-foreground font-semibold">تيبس/قصر:</p>
                <div className="flex gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form.hasHipFlexionContracture}
                      onChange={() => setForm((f) => ({ ...f, hasHipFlexionContracture: f.hasHipFlexionContracture ? null : true }))}
                      className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                    <span className="text-xs">قصر عطف الورك</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form.hasKneeFlexionContracture}
                      onChange={() => setForm((f) => ({ ...f, hasKneeFlexionContracture: f.hasKneeFlexionContracture ? null : true }))}
                      className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                    <span className="text-xs">قصر عطف الركبة</span>
                  </label>
                </div>
                <p className="text-[11px] text-foreground font-semibold">ضعف عضلي:</p>
                <div className="flex gap-4 flex-wrap items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form.weakHipAbductors}
                      onChange={() => setForm((f) => ({ ...f, weakHipAbductors: f.weakHipAbductors ? null : true }))}
                      className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                    <span className="text-xs">تبعيد</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form.weakHipExtensors}
                      onChange={() => setForm((f) => ({ ...f, weakHipExtensors: f.weakHipExtensors ? null : true }))}
                      className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                    <span className="text-xs">بسط</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form.weakTrunkMuscles}
                      onChange={() => setForm((f) => ({ ...f, weakTrunkMuscles: f.weakTrunkMuscles ? null : true }))}
                      className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                    <span className="text-xs">عضلات الجذع</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!form.otherWeakness}
                        onChange={() => setForm((f) => ({ ...f, otherWeakness: f.otherWeakness ? "" : " " }))}
                        className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                      <span className="text-xs">أخرى:</span>
                    </label>
                    {!!form.otherWeakness && (
                      <Input value={form.otherWeakness.trim()} onChange={(e) => setForm((f) => ({ ...f, otherWeakness: e.target.value }))}
                        className="h-6 text-xs w-28 px-2" placeholder="..." />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Core Assessment */}
            <div className="border-b mt-4">
              <div className="bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground">التقييم الأساسي</div>
              {([
                ["trunkStability", "ثبات الجذع "],
                ["abdominalControl", "التحكم البطني "],
                ["pelvicControl", "التحكم الحوضي "],
              ] as const).map(([fld, lbl]) => (
                <div key={fld} className="grid grid-cols-[160px_1fr] divide-x divide-x-reverse border-t">
                  <div className="bg-muted/40 px-3 py-2.5 text-xs flex items-center">{lbl}</div>
                  <div className="px-3 py-2.5 flex gap-4">
                    {GFP_OPTS.map((o) => (
                      <label key={o.v} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={form[fld] === o.v}
                          onChange={() => setForm((f) => ({ ...f, [fld]: f[fld] === o.v ? "" : o.v }))}
                          className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                        <span className="text-xs">{o.l}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Balance */}
            <div className="mt-4">
              <div className="grid grid-cols-[160px_1fr] divide-x divide-x-reverse border-b border-t">
                <div className="bg-muted/40 px-3 py-2.5 text-xs flex items-center">التوازن أثناء الجلوس</div>
                <div className="px-3 py-2.5 flex gap-4">
                  {[{ v: "INDEPENDENT", l: "مستقل" }, { v: "ASSISTED", l: "بمساعدة" }].map((o) => (
                    <label key={o.v} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={form.sittingBalance === o.v}
                        onChange={() => setForm((f) => ({ ...f, sittingBalance: f.sittingBalance === o.v ? "" : o.v }))}
                        className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                      <span className="text-xs">{o.l}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-[160px_1fr] divide-x divide-x-reverse">
                <div className="bg-muted/40 px-3 py-2.5 text-xs flex items-center">التوازن أثناء الوقوف</div>
                <div className="px-3 py-2.5 flex gap-4">
                  {[{ v: "STABLE", l: "مستقر" }, { v: "UNSTABLE", l: "غير مستقر" }].map((o) => (
                    <label key={o.v} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={form.standingBalance === o.v}
                        onChange={() => setForm((f) => ({ ...f, standingBalance: f.standingBalance === o.v ? "" : o.v }))}
                        className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                      <span className="text-xs">{o.l}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Gait Assessment */}
            <div className="mt-4">
              <div className="bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground border-t">تقييم المشي</div>

              {/* التماثل */}
              <div className="grid grid-cols-[160px_1fr] divide-x divide-x-reverse border-t">
                <div className="bg-muted/40 px-3 py-2.5 text-xs flex items-center">التماثل</div>
                <div className="px-3 py-2.5 flex gap-4">
                  {[{ v: "GOOD", l: "جيد" }, { v: "FAIR", l: "متوسط" }, { v: "POOR", l: "ضعيف" }].map((o) => (
                    <label key={o.v} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={form.symmetry === o.v}
                        onChange={() => setForm((f) => ({ ...f, symmetry: f.symmetry === o.v ? "" : o.v }))}
                        className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                      <span className="text-xs">{o.l}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* وسيلة المساعدة */}
              <div className="grid grid-cols-[160px_1fr] divide-x divide-x-reverse border-t">
                <div className="bg-muted/40 px-3 py-2.5 text-xs flex items-center">الوسيلة المساعدة</div>
                <div className="px-3 py-2.5 flex gap-4 flex-wrap">
                  {GAIT_DEVICE_OPTS.map((o) => (
                    <label key={o.v} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={form.assistiveDevice === o.v}
                        onChange={() => setForm((f) => ({ ...f, assistiveDevice: f.assistiveDevice === o.v ? "" : o.v }))}
                        className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                      <span className="text-xs">{o.l}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Spatiotemporal Parameters */}
              <div className="border-t px-3 py-2">
                <p className="text-[11px] text-foreground font-semibold mb-2">قياسات المشي</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-44 shrink-0">السرعة</span>
                    <Input type="number" step="0.01" value={form.speedMs} onChange={(e) => setForm((f) => ({ ...f, speedMs: e.target.value }))} className="h-7 text-xs w-20" />
                    <span className="text-xs text-muted-foreground shrink-0">m/s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-44 shrink-0">عدد الخطوات/دقيقة</span>
                    <Input type="number" value={form.cadence} onChange={(e) => setForm((f) => ({ ...f, cadence: e.target.value }))} className="h-7 text-xs w-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-44 shrink-0">طول الخطوة — صناعي</span>
                    <Input type="number" value={form.stepLengthProsCm} onChange={(e) => setForm((f) => ({ ...f, stepLengthProsCm: e.target.value }))} className="h-7 text-xs w-20" />
                    <span className="text-xs text-muted-foreground shrink-0">cm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-44 shrink-0">طول الخطوة — سليم</span>
                    <Input type="number" value={form.stepLengthSoundCm} onChange={(e) => setForm((f) => ({ ...f, stepLengthSoundCm: e.target.value }))} className="h-7 text-xs w-20" />
                    <span className="text-xs text-muted-foreground shrink-0">cm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-44 shrink-0">نسبة الارتكاز — صناعي</span>
                    <Input type="number" value={form.stancePercProsthetic} onChange={(e) => setForm((f) => ({ ...f, stancePercProsthetic: e.target.value }))} className="h-7 text-xs w-20" />
                    <span className="text-xs text-muted-foreground shrink-0">%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-44 shrink-0">نسبة الارتكاز — سليم</span>
                    <Input type="number" value={form.stancePercSound} onChange={(e) => setForm((f) => ({ ...f, stancePercSound: e.target.value }))} className="h-7 text-xs w-20" />
                    <span className="text-xs text-muted-foreground shrink-0">%</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </TabsContent>

        {/* ── Tab 2: أخطاء المشي ── */}
        <TabsContent value="phases" className="mt-4 space-y-4">
          {GAIT_PHASES.map((phase) => (
            <div key={phase.key} className="rounded-lg border overflow-hidden">
              <div className="bg-muted/40 px-3 py-2 text-sm font-semibold flex items-center gap-2"><span>•</span>{phase.label}</div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  {phase.deviations.map((d) => (
                    <label key={d.v} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input type="checkbox"
                        checked={form.phases[phase.key]?.deviations?.includes(d.v) ?? false}
                        onChange={() => togglePhaseDeviation(phase.key, d.v)}
                        className="w-[17px] h-[17px] checkbox-orange rounded-sm shrink-0"
                      />
                      <span className="text-xs">{d.l}</span>
                    </label>
                  ))}
                </div>
                {phase.extraField === "cause" && (
                  <Input value={form.phases[phase.key]?.possibleCause ?? ""} onChange={(e) => setPhaseText(phase.key, "possibleCause", e.target.value)}
                    placeholder="السبب المحتمل..." className="h-7 text-xs" />
                )}
                {phase.extraField === "notes" && (
                  <Input value={form.phases[phase.key]?.notes ?? ""} onChange={(e) => setPhaseText(phase.key, "notes", e.target.value)}
                    placeholder="ملاحظات..." className="h-7 text-xs" />
                )}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── Tab 3: التشخيص ── */}
        <TabsContent value="diagnosis" className="mt-4 space-y-0">
          <div className="rounded-lg overflow-hidden border text-sm">

            {/* مشاكل خاصة بالطرف */}
            <div>
              <div className="bg-muted/40 px-3 py-1.5 text-xs font-semibold flex items-center gap-2"><span>•</span>مشاكل خاصة بالطرف</div>
              <div className="px-3 py-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {PROSTHETIC_ISSUE_OPTS.map((o) => (
                  <label key={o.v} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.prostheticIssues.includes(o.v)} onChange={() => toggleMulti("prostheticIssues", o.v)} className="w-[15px] h-[15px] checkbox-orange rounded-sm shrink-0" />
                    <span className="text-xs">{o.l}</span>
                  </label>
                ))}
              </div>
              <div className="px-3 pb-3 space-y-1.5">
                <Label className="text-xs font-medium">تفاصيل مشكلة أخرى (اختياري)</Label>
                <Textarea rows={2} value={form.prostheticIssuesOtherNotes} onChange={(e) => setForm((f) => ({ ...f, prostheticIssuesOtherNotes: e.target.value }))} className="resize-none text-xs" placeholder="تفاصيل إضافية..." />
              </div>
            </div>

            {/* الاستنتاج السريري */}
            <div className="border-t">
              <div className="bg-muted/40 px-3 py-1.5 text-xs font-semibold flex items-center gap-2"><span>•</span>الاستنتاج السريري</div>
              <div className="px-3 py-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">المشكلة الأساسية</Label>
                  <Textarea rows={2} value={form.mainProblem} onChange={(e) => setForm((f) => ({ ...f, mainProblem: e.target.value }))} className="resize-none text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">ملاحظات التشخيص (اختياري)</Label>
                  <Textarea rows={2} value={form.mainProblemNotes} onChange={(e) => setForm((f) => ({ ...f, mainProblemNotes: e.target.value }))} className="resize-none text-xs" placeholder="ملاحظات إضافية على التشخيص..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">السبب المرجح</Label>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {LIKELY_CAUSE_OPTS.map((o) => (
                      <label key={o.v} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.likelyCauses.includes(o.v)} onChange={() => toggleMulti("likelyCauses", o.v)} className="w-[15px] h-[15px] checkbox-orange rounded-sm shrink-0" />
                        <span className="text-xs">{o.l}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">تفاصيل سبب آخر (اختياري)</Label>
                  <Textarea rows={2} value={form.likelyCausesOtherNotes} onChange={(e) => setForm((f) => ({ ...f, likelyCausesOtherNotes: e.target.value }))} className="resize-none text-xs" placeholder="تفاصيل إضافية..." />
                </div>
              </div>
            </div>

            {/* التوصيات */}
            <div className="border-t">
              <div className="bg-muted/40 px-3 py-1.5 text-xs font-semibold flex items-center gap-2"><span>•</span>التوصيات</div>
              <div className="px-3 py-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {RECOMMENDATION_OPTS.map((o) => (
                  <label key={o.v} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.recommendations.includes(o.v)} onChange={() => toggleMulti("recommendations", o.v)} className="w-[15px] h-[15px] checkbox-orange rounded-sm shrink-0" />
                    <span className="text-xs">{o.l}</span>
                  </label>
                ))}
              </div>
              <div className="px-3 pb-3 space-y-1.5">
                <Label className="text-xs font-medium">ملاحظات التوصيات (اختياري)</Label>
                <Textarea rows={2} value={form.recommendationsNotes} onChange={(e) => setForm((f) => ({ ...f, recommendationsNotes: e.target.value }))} className="resize-none text-xs" placeholder="ملاحظات إضافية على التوصيات..." />
              </div>
            </div>

          </div>

        </TabsContent>

        {/* ── Tab 4: خطة العلاج ── */}
        <TabsContent value="rehab" className="mt-4 space-y-0">
          <div className="rounded-lg overflow-hidden border text-sm">
            <div className="bg-muted/40 px-3 py-1.5 text-xs font-semibold flex items-center gap-2"><span>•</span>خطة العلاج</div>
            <div className="px-3 py-3 space-y-2">
              {REHAB_PLAN_OPTS.map((o) => (
                <label key={o.v} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.rehabPlanItems.includes(o.v)} onChange={() => toggleMulti("rehabPlanItems", o.v)} className="w-[15px] h-[15px] checkbox-orange rounded-sm shrink-0" />
                  <span className="text-xs">{o.l}</span>
                </label>
              ))}
            </div>
            <div className="border-t px-3 py-3 space-y-1.5">
              <Label className="text-xs font-medium">ملاحظات | Notes</Label>
              <Textarea rows={2} value={form.rehabNotes} onChange={(e) => setForm((f) => ({ ...f, rehabNotes: e.target.value }))} className="resize-none text-xs" />
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 5: التوقيعات ── */}
        <TabsContent value="signatures" className="mt-4 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {([
              ["prosto","اسم فني الأطراف الصناعية ","examinerProsthetistId","prosthetistSignatureUrl"],
            ] as const).map(([role,lbl,idField,sigField]) => (
              <div key={role} className="space-y-2 rounded-lg border p-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{lbl}</Label>
                  <Select value={(form as any)[idField] || "none"} onValueChange={(v) => setForm((f) => ({ ...f, [idField]: v === "none" ? "" : v, [sigField]: "" }))}>
                    <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— غير محدد —</SelectItem>
                      {(role === "prosto"
                        ? staffList.filter((e: any) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("الاطراف الصناعية") || e.department?.nameAr?.includes("الأطراف الصناعية")))
                        : staffList.filter((e: any) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("العلاج الفيزيائي") || e.department?.nameAr?.includes("العلاج الطبيعي")))
                      ).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">التوقيع</Label>
                  <div className="rounded border min-h-[64px] flex items-center justify-center bg-white/50 p-2">
                    {(form as any)[sigField] ? (
                      <div className="relative inline-block">
                        <img src={(form as any)[sigField]} alt="توقيع" className="h-14 object-contain" />
                        <button onClick={() => setForm((f) => ({ ...f, [sigField]: "" }))} className="absolute -top-1 -left-1 bg-destructive text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">✕</button>
                      </div>
                    ) : (
                      <Button type="button" size="sm" variant="outline" className="text-xs w-full" onClick={() => handleSigClick(role)} disabled={!(form as any)[idField]}>
                        {(form as any)[idField] ? "جلب / رفع التوقيع" : "اختر أولاً"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <input ref={prostoSigRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSigFile(e, "prosto")} />
          <div className="space-y-1.5">
            <Label className="text-xs">ملاحظات عامة</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="resize-none text-xs" placeholder="ملاحظات إضافية..." />
          </div>
        </TabsContent>

      </Tabs>
      </fieldset>

      {!isSaved && (
        <div className="flex gap-2 pt-2 border-t">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1 gap-1">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isNew ? "إضافة الجلسة" : "حفظ نهائي"}
          </Button>
          <Button variant="outline" onClick={() => isNew ? onCancel?.() : setEditing(false)}>إلغاء</Button>
        </div>
      )}
    </div>
  );
}

function GaitAnalysisSection({ caseId, staffList, patient }: { caseId: string; staffList: any[]; patient?: any }) {
  const { data: sessions = [], isLoading } = useGaitAnalysisForms(caseId);
  const [showAdd, setShowAdd] = useState(false);
  const [formKey, setFormKey] = useState(0);
  return (
    <Section
      title={`تحليل المشي — Pro-016${sessions.length > 0 ? ` (${sessions.length})` : ""}`}
      action={
        <Button size="sm" variant={showAdd ? "secondary" : "outline"} className="gap-1 text-xs" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="h-3.5 w-3.5" />
          {showAdd ? "إغلاق" : "إضافة جلسة"}
        </Button>
      }
    >
      {showAdd && (
        <div className="mb-4 border rounded-lg p-1">
          <GaitAnalysisCard key={formKey} caseId={caseId} staffList={staffList} patient={patient}
            onCancel={() => { setShowAdd(false); setFormKey((k) => k + 1); }} />
        </div>
      )}
      {isLoading ? (
        <div className="py-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : sessions.length === 0 && !showAdd ? (
        <p className="text-sm text-muted-foreground text-center py-4">لا توجد جلسات تحليل مشي مسجّلة</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s: any, i: number) => (
            <GaitAnalysisCard key={s.id} caseId={caseId} staffList={staffList} session={s} idx={i} patient={patient} />
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Balance Assessment (Pro-015) ─────────────────────────────────────────────

const STATIC_BALANCE_KEYS = [
  { key: "standing_feet_together", label: "الوقوف والقدمان متلاصقتان" },
  { key: "narrow_base_standing", label: "الوقوف بقاعدة ضيقة" },
  { key: "prosthetic_side", label: "الوقوف على الطرف الصناعي" },
  { key: "sound_side", label: "الوقوف على الطرف السليم" },
  { key: "eyes_closed", label: "الوقوف مع إغماض العينين" },
];
const STATIC_BALANCE_OPTS = [{ value: "INDEPENDENT", label: "مستقل" }, { value: "ASSISTED", label: "بمساعدة" }, { value: "UNABLE", label: "غير قادر" }];

const DYNAMIC_TASK_KEYS = [
  { key: "weight_shifting", label: "نقل الوزن (أمامي/خلفي ـ جانبي)" },
  { key: "reaching_outside_bos", label: "الوصول خارج قاعدة الارتكاز" },
  { key: "turning", label: "الالتفاف (360°/180°)" },
  { key: "stepping_forward_back", label: "الخطو للأمام / للخلف" },
  { key: "obstacle_negotiation", label: "تجاوز العوائق" },
];
const DYNAMIC_TASK_OPTS = [{ value: "GOOD", label: "جيد" }, { value: "FAIR", label: "متوسط" }, { value: "POOR", label: "ضعيف" }];

const DYNAMIC_ACTIVITY_KEYS = [
  { key: "sit_to_stand", label: "الجلوس إلى الوقوف" },
  { key: "stand_to_sit", label: "الوقوف إلى الجلوس" },
  { key: "gait_initiation", label: "بدء المشي" },
  { key: "stair_negotiation", label: "صعود ونزول الدرج" },
  { key: "uneven_surface_walking", label: "المشي على أسطح غير مستوية" },
];
const DYNAMIC_ACTIVITY_OPTS = [{ value: "INDEPENDENT", label: "مستقل" }, { value: "WITH_DIFFICULTY", label: "بصعوبة" }, { value: "UNABLE", label: "غير قادر" }];

const LIMITING_FACTOR_OPTS = [
  { value: "PROSTHETIC_CONTROL", label: "التحكم بالطرف الصناعي" },
  { value: "MUSCLE_WEAKNESS", label: "ضعف العضلات" },
  { value: "CORE_INSTABILITY", label: "عدم استقرار الجذع" },
  { value: "FEAR_OF_FALLING", label: "الخوف من السقوط" },
  { value: "ALIGNMENT_FIT_ISSUES", label: "مشاكل المحاذاة والملاءمة" },
];
const PROGRAM_PROGRESSION_OPTS = [
  { value: "REDUCE_HAND_SUPPORT", label: "تقليل دعم اليدين" },
  { value: "INCREASE_DURATION", label: "زيادة المدة" },
  { value: "INCREASE_REPS", label: "زيادة التكرار" },
  { value: "INCREASE_DIFFICULTY", label: "زيادة الصعوبة" },
  { value: "ADD_DUAL_TASKS", label: "إضافة مهام مزدوجة" },
  { value: "HOME_EXERCISE_PROGRAM", label: "برنامج تمارين منزلية" },
  { value: "NOT_PRESCRIBED", label: "لم يوصف" },
  { value: "PRESCRIBED_WITH_SAFETY", label: "وصف وتم شرح السلامة للمريض" },
];
const EXPECTED_OUTCOME_OPTS = [
  { value: "IMPROVE_WEIGHT", label: "تحسين الوزن" },
  { value: "REDUCED_FALL_RISK", label: "تقليل خطر السقوط" },
  { value: "IMPROVED_CONFIDENCE", label: "زيادة الثقة" },
];
const ROM_GRADES = ["1","1+","2","2+","3","3+","4","4+","5","5+"];
const ARABIC_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
// Month names come from the shared payroll.months.* catalogue (1-indexed).
const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
type RomEntry = { selected: boolean; grade?: string };

// `key` is the wire/DB identifier for romData (see buildUpperDto/buildLowerDto) —
// it is Arabic on the server and MUST NOT be translated or every saved romData
// entry stops matching. Only labelKey/groupKey feed the UI.
type RomMove = { key: string; labelKey: string; groupKey: string; hasGrade: boolean };

const UPPER_ROM_MOVES: RomMove[] = [
  { key: "عطف المرفق",   labelKey: "flexion",          groupKey: "elbow",    hasGrade: true  },
  { key: "بسط المرفق",   labelKey: "extension",        groupKey: "elbow",    hasGrade: true  },
  { key: "الكب",         labelKey: "pronation",        groupKey: "elbow",    hasGrade: true  },
  { key: "الاستلقاء",    labelKey: "supination",       groupKey: "elbow",    hasGrade: true  },
  { key: "عطف الكتف",   labelKey: "flexion",          groupKey: "shoulder", hasGrade: true  },
  { key: "بسط الكتف",   labelKey: "extension",        groupKey: "shoulder", hasGrade: true  },
  { key: "التقريب",      labelKey: "adduction",        groupKey: "shoulder", hasGrade: true  },
  { key: "التبعيد",      labelKey: "abduction",        groupKey: "shoulder", hasGrade: true  },
  { key: "دوران داخلي",  labelKey: "internalRotation", groupKey: "shoulder", hasGrade: false },
  { key: "عطف الرسغ",   labelKey: "flexion",          groupKey: "wrist",    hasGrade: true  },
  { key: "بسط الرسغ",   labelKey: "extension",        groupKey: "wrist",    hasGrade: true  },
  { key: "انحراف كعبري", labelKey: "radialDeviation",  groupKey: "wrist",    hasGrade: false },
  { key: "انحراف زندي",  labelKey: "ulnarDeviation",   groupKey: "wrist",    hasGrade: false },
];

const LOWER_ROM_MOVES: RomMove[] = [
  { key: "عطف ظهري",    labelKey: "dorsiflexion",     groupKey: "ankle", hasGrade: true  },
  { key: "عطف أخمصي",   labelKey: "plantarflexion",   groupKey: "ankle", hasGrade: true  },
  { key: "انقلاب داخلي", labelKey: "inversion",        groupKey: "ankle", hasGrade: false },
  { key: "انقلاب خارجي", labelKey: "eversion",         groupKey: "ankle", hasGrade: false },
  { key: "عطف الركبة",  labelKey: "flexion",          groupKey: "knee",  hasGrade: true  },
  { key: "بسط الركبة",  labelKey: "extension",        groupKey: "knee",  hasGrade: true  },
  { key: "عطف الورك",   labelKey: "flexion",          groupKey: "hip",   hasGrade: true  },
  { key: "بسط الورك",   labelKey: "extension",        groupKey: "hip",   hasGrade: true  },
  { key: "التقريب",      labelKey: "adduction",        groupKey: "hip",   hasGrade: true  },
  { key: "التبعيد",      labelKey: "abduction",        groupKey: "hip",   hasGrade: true  },
  { key: "دوران داخلي",  labelKey: "internalRotation", groupKey: "hip",   hasGrade: false },
];

const SUPPORT_OPTS = [
  { value: "NONE", label: "لا يوجد" },
  { value: "BARS", label: "قضبان" },
  { value: "SUPPORT", label: "بدعم" },
  { value: "SUPERVISED", label: "إشراف" },
];
const DEFAULT_EXERCISE_PROGRAM = [
  { exercise: "نقل الوزن", position: "وقوف", dosage: "10-15 reps", support: "NONE", notes: "", selected: false },
  { exercise: "توازن وقوف ثابت", position: "وقوف", dosage: "30-60 sec", support: "NONE", notes: "", selected: false },
  { exercise: "الوقوف على الطرف السليم", position: "وقوف", dosage: "20-30 sec", support: "NONE", notes: "", selected: false },
  { exercise: "تمارين الوصول", position: "وقوف", dosage: "10 reps", support: "NONE", notes: "", selected: false },
  { exercise: "نقر القدم (أمام/جانب)", position: "وقوف", dosage: "10 reps", support: "BARS", notes: "", selected: false },
  { exercise: "قرفصاء خفيفة", position: "وقوف", dosage: "10 reps", support: "NONE", notes: "", selected: false },
  { exercise: "المشي بالمكان", position: "وقوف", dosage: "30-60 sec", support: "SUPPORT", notes: "", selected: false },
  { exercise: "تجاوز عوائق", position: "مشي", dosage: "5-10 trials", support: "SUPERVISED", notes: "", selected: false },
  { exercise: "تدريب الجلوس والوقوف", position: "كرسي", dosage: "10 reps", support: "NONE", notes: "", selected: false },
  { exercise: "وقوف متعاقب (إن كان آمناً)", position: "وقوف", dosage: "20-30 sec", support: "SUPPORT", notes: "", selected: false },
];

const INITIAL_BALANCE_FORM = {
  assessmentDate: "", previousProsthesis: null as boolean | null, assistiveDevice: "",
  staticBalance: {} as Record<string, string>, dynamicTasks: {} as Record<string, string>, dynamicActivities: {} as Record<string, string>,
  historyOfFalls: null as boolean | null, nearFalls: null as boolean | null, fearOfFalling: null as boolean | null,
  fallRiskLevel: "", overallBalanceLevel: "", limitingFactors: [] as string[],
  exerciseProgram: DEFAULT_EXERCISE_PROGRAM.map((e) => ({ ...e })),
  programProgression: [] as string[], followUpWeeks: "", expectedOutcomes: [] as string[],
  physiotherapistId: "", physiotherapistSignatureUrl: "", physiotherapistSignatureDate: "",
  committeeHeadId: "", committeeHeadSignatureUrl: "", committeeHeadSignatureDate: "",
  followUpDate: "", notes: "",
  // Optional free-text details for the conditional / "other" answers.
  previousProsthesisNotes: "", fallRiskNotes: "", limitingFactorsOtherNotes: "",
};
type BalanceForm = typeof INITIAL_BALANCE_FORM;

function parseBalanceRecord(raw: any): Record<string, string> {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const r: Record<string, string> = {};
    raw.forEach((item: any) => { if (item?.key) r[item.key] = item.result ?? ""; });
    return r;
  }
  return raw as Record<string, string>;
}
function parseExerciseProgram(raw: any): any[] {
  if (!raw) return DEFAULT_EXERCISE_PROGRAM.map((e) => ({ ...e }));
  if (Array.isArray(raw)) return raw;
  return Object.values(raw);
}

function balanceFormFromData(data: any): BalanceForm {
  return {
    assessmentDate: data.assessmentDate?.slice(0, 10) ?? "",
    previousProsthesis: data.previousProsthesis ?? null,
    assistiveDevice: data.assistiveDevice ?? "",
    staticBalance: parseBalanceRecord(data.staticBalance),
    dynamicTasks: parseBalanceRecord(data.dynamicTasks),
    dynamicActivities: parseBalanceRecord(data.dynamicActivities),
    historyOfFalls: data.historyOfFalls ?? null,
    nearFalls: data.nearFalls ?? null,
    fearOfFalling: data.fearOfFalling ?? null,
    fallRiskLevel: data.fallRiskLevel ?? "",
    overallBalanceLevel: data.overallBalanceLevel ?? "",
    limitingFactors: data.limitingFactors ?? [],
    exerciseProgram: parseExerciseProgram(data.exerciseProgram).map((e: any) => ({
      ...e,
      support: (() => {
        const s = (e.support ?? "").toLowerCase().trim();
        if (s === "bars") return "BARS";
        if (s === "support") return "SUPPORT";
        if (s === "supervised") return "SUPERVISED";
        return "NONE";
      })(),
    })),
    programProgression: data.programProgression ?? [],
    followUpWeeks: data.followUpWeeks?.toString() ?? "",
    expectedOutcomes: data.expectedOutcomes ?? [],
    physiotherapistId: data.physiotherapistId ?? "",
    physiotherapistSignatureUrl: data.physiotherapistSignatureUrl ?? "",
    physiotherapistSignatureDate: data.physiotherapistSignatureDate?.slice(0, 10) ?? "",
    committeeHeadId: data.committeeHeadId ?? "",
    committeeHeadSignatureUrl: data.committeeHeadSignatureUrl ?? "",
    committeeHeadSignatureDate: data.committeeHeadSignatureDate?.slice(0, 10) ?? "",
    followUpDate: data.followUpDate?.slice(0, 10) ?? "",
    notes: data.notes ?? "",
    previousProsthesisNotes: data.previousProsthesisNotes ?? "",
    fallRiskNotes: data.fallRiskNotes ?? "",
    limitingFactorsOtherNotes: data.limitingFactorsOtherNotes ?? "",
  };
}

function balanceFormToDto(form: BalanceForm) {
  return {
    assessmentDate: form.assessmentDate || undefined,
    previousProsthesis: form.previousProsthesis ?? undefined,
    assistiveDevice: form.assistiveDevice || undefined,
    staticBalance: Object.keys(form.staticBalance).length > 0 ? form.staticBalance : undefined,
    dynamicTasks: Object.keys(form.dynamicTasks).length > 0 ? form.dynamicTasks : undefined,
    dynamicActivities: Object.keys(form.dynamicActivities).length > 0 ? form.dynamicActivities : undefined,
    historyOfFalls: form.historyOfFalls ?? undefined,
    nearFalls: form.nearFalls ?? undefined,
    fearOfFalling: form.fearOfFalling ?? undefined,
    fallRiskLevel: form.fallRiskLevel || undefined,
    overallBalanceLevel: form.overallBalanceLevel || undefined,
    limitingFactors: form.limitingFactors.length ? form.limitingFactors : undefined,
    exerciseProgram: form.exerciseProgram.length > 0 ? Object.fromEntries(form.exerciseProgram.map((e, i) => [String(i), e])) : undefined,
    programProgression: form.programProgression.length ? form.programProgression : undefined,
    followUpWeeks: form.followUpWeeks ? Number(form.followUpWeeks) : undefined,
    expectedOutcomes: form.expectedOutcomes.length ? form.expectedOutcomes : undefined,
    physiotherapistId: form.physiotherapistId || undefined,
    physiotherapistSignatureUrl: form.physiotherapistSignatureUrl || undefined,
    physiotherapistSignatureDate: form.physiotherapistSignatureDate || undefined,
    committeeHeadId: form.committeeHeadId || undefined,
    committeeHeadSignatureUrl: form.committeeHeadSignatureUrl || undefined,
    committeeHeadSignatureDate: form.committeeHeadSignatureDate || undefined,
    followUpDate: form.followUpDate || undefined,
    notes: form.notes || undefined,
    previousProsthesisNotes: form.previousProsthesisNotes || undefined,
    fallRiskNotes: form.fallRiskNotes || undefined,
    limitingFactorsOtherNotes: form.limitingFactorsOtherNotes || undefined,
  };
}

function BalanceAssessmentCard({
  caseId, staffList, session, idx, onCancel,
}: { caseId: string; staffList: any[]; session?: any; idx?: number; onCancel?: () => void }) {
  const isNew = !session;
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<BalanceForm>(() =>
    session ? balanceFormFromData(session) : { ...INITIAL_BALANCE_FORM, exerciseProgram: DEFAULT_EXERCISE_PROGRAM.map((e) => ({ ...e })) }
  );
  const physioSigRef = useRef<HTMLInputElement>(null);
  const committeeSigRef = useRef<HTMLInputElement>(null);
  const [sigUploadFor, setSigUploadFor] = useState<"physio" | "committee" | null>(null);
  const addMut = useAddBalanceAssessment();
  const updateMut = useUpdateBalanceAssessment();
  const saveMut = useSaveBalanceAssessmentForm();
  const archiveMut = useArchiveBalanceAssessment();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  // Frozen after POST /save — the backend rejects any further PATCH (400).
  const isSaved = !!session?.isSaved;
  const isArchived = !!session?.archivedAt;

  const handleSigClick = async (role: "physio" | "committee") => {
    const empId = role === "physio" ? form.physiotherapistId : form.committeeHeadId;
    if (!empId) { toast.error(role === "physio" ? "اختر المعالج الفيزيائي أولاً" : "اختر رئيس اللجنة أولاً"); return; }
    try {
      const sig = await clinicProstheticsApi.getEmployeeSignature(empId);
      if (sig.hasSignature && sig.signatureUrl) {
        const url = sig.signatureUrl.startsWith("http") ? sig.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${sig.signatureUrl}`;
        if (role === "physio") setForm((f) => ({ ...f, physiotherapistSignatureUrl: url }));
        else setForm((f) => ({ ...f, committeeHeadSignatureUrl: url }));
      } else {
        setSigUploadFor(role);
        setTimeout(() => (role === "physio" ? physioSigRef : committeeSigRef).current?.click(), 50);
      }
    } catch { toast.error("فشل جلب التوقيع"); }
  };

  const handleSigFile = async (e: React.ChangeEvent<HTMLInputElement>, role: "physio" | "committee") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const empId = role === "physio" ? form.physiotherapistId : form.committeeHeadId;
    if (!empId) return;
    try {
      const res = await clinicProstheticsApi.uploadEmployeeSignature(empId, file);
      const url = res.signatureUrl.startsWith("http") ? res.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${res.signatureUrl}`;
      if (role === "physio") setForm((f) => ({ ...f, physiotherapistSignatureUrl: url }));
      else setForm((f) => ({ ...f, committeeHeadSignatureUrl: url }));
      toast.success("تم رفع التوقيع");
    } catch { toast.error("فشل رفع التوقيع"); }
    setSigUploadFor(null);
    e.target.value = "";
  };

  const handleSave = async () => {
    const dto = balanceFormToDto(form);
    if (isNew) { await addMut.mutateAsync({ caseId, dto }); onCancel?.(); return; }
    // Existing form: persist the edits, then freeze it (PATCH is rejected
    // afterwards) — a single "حفظ نهائي" action.
    await updateMut.mutateAsync({ caseId, formId: session.id, dto });
    await saveMut.mutateAsync({ caseId, formId: session.id });
    setEditing(false);
  };

  const isSaving = addMut.isPending || updateMut.isPending || saveMut.isPending;

  // Collapsed card for existing sessions
  if (!isNew && !editing) {
    return (
      <div className="rounded-lg border p-3 space-y-1 transition-colors cursor-pointer hover:bg-muted/30"
        onClick={() => setEditing(true)}>
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center flex-wrap">
            <Badge variant="secondary" className="font-bold">#{(idx ?? 0) + 1}</Badge>
            {session.assessmentDate && <span className="text-sm">{new Date(session.assessmentDate).toLocaleDateString("en-GB")}</span>}
            {session.overallBalanceLevel && <Badge variant="outline" className="text-xs">{session.overallBalanceLevel === "GOOD" ? "جيد" : session.overallBalanceLevel === "FAIR" ? "مقبول" : "ضعيف"}</Badge>}
            {session.fallRiskLevel && (
              <Badge className={`text-xs ${session.fallRiskLevel === "HIGH" ? "bg-red-100 text-red-800" : session.fallRiskLevel === "MODERATE" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                {session.fallRiskLevel === "HIGH" ? "خطر عالي" : session.fallRiskLevel === "MODERATE" ? "خطر متوسط" : "خطر منخفض"}
              </Badge>
            )}
            {isSaved && (
              <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" />
                محفوظ
              </Badge>
            )}
            {isArchived && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs gap-1">
                <Archive className="h-3 w-3" />
                مؤرشف
              </Badge>
            )}
          </div>
          <div className="flex gap-1 items-center flex-wrap justify-end" onClick={(e) => e.stopPropagation()}>
            {!isArchived && (
              <Button size="sm" variant="outline" className="gap-1"
                onClick={() => { setArchiveReason(""); setArchiveOpen(true); }}>
                <Archive className="h-3.5 w-3.5" />
                أرشفة
              </Button>
            )}
          </div>
        </div>
        {session.notes && <p className="text-xs text-muted-foreground">{session.notes}</p>}
        {isArchived && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800 space-y-0.5">
            <p className="flex items-center gap-1 font-medium">
              <Archive className="h-3 w-3" />
              أُرشِف{session.archivedAt ? ` بتاريخ ${new Date(session.archivedAt).toLocaleDateString("en-GB")}` : ""}
            </p>
            {session.archiveNotes && <p><span className="font-medium">السبب: </span>{session.archiveNotes}</p>}
          </div>
        )}

        <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle>أرشفة النموذج</DialogTitle>
              <DialogDescription>اذكر سبب الأرشفة.</DialogDescription>
            </DialogHeader>
            <Textarea rows={3} placeholder="سبب الأرشفة..." value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} />
            <DialogFooter className="flex gap-2 justify-end sm:justify-end">
              <Button variant="outline" onClick={() => setArchiveOpen(false)}>إلغاء</Button>
              <Button disabled={archiveMut.isPending || !archiveReason.trim()}
                onClick={async () => {
                  await archiveMut.mutateAsync({ caseId, formId: session.id, reason: archiveReason.trim() });
                  setArchiveOpen(false);
                }}>
                {archiveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "أرشفة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Full form
  const setArr = (field: "staticBalance" | "dynamicTasks" | "dynamicActivities", key: string, val: string) =>
    setForm((f) => ({ ...f, [field]: { ...f[field], [key]: f[field][key] === val ? "" : val } }));

  const toggleArr = (field: "limitingFactors" | "programProgression" | "expectedOutcomes", val: string, checked: boolean) =>
    setForm((f) => ({ ...f, [field]: checked ? [...f[field], val] : f[field].filter((v) => v !== val) }));

  return (
    <div className="rounded-lg border p-4 space-y-5">
      {!isNew && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">
              {isSaved ? "تفاصيل" : "تعديل"} التقييم #{(idx ?? 0) + 1}
            </p>
            {isSaved && (
              <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" />
                محفوظ — للقراءة فقط
              </Badge>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            إغلاق
          </Button>
        </div>
      )}

      {/* Saved forms are frozen server-side (PATCH → 400) — render read-only. */}
      <fieldset disabled={isSaved} className="contents">

      {/* Basic Info */}
      <div className="space-y-3">
        <p className="text-[12px] font-semibold text-foreground">
          بيانات أساسية
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">تاريخ التقييم</Label>
            <Input
              type="date"
              value={form.assessmentDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, assessmentDate: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">هل استخدم طرف صناعي سابق</Label>
            <div className="flex gap-4">
              {(
                [
                  ["true", "نعم"],
                  ["false", "لا"],
                ] as const
              ).map(([val, label]) => (
                <label
                  key={val}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.previousProsthesis === (val === "true")}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        previousProsthesis:
                          f.previousProsthesis === (val === "true")
                            ? null
                            : val === "true",
                      }))
                    }
                    className="w-[15px] h-[15px] checkbox-orange rounded-sm"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
            {form.previousProsthesis === true && (
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs">تفاصيل الطرف السابق (اختياري)</Label>
                <Textarea rows={2} className="resize-none text-xs" placeholder="تفاصيل الطرف الصناعي السابق..."
                  value={form.previousProsthesisNotes}
                  onChange={(e) => setForm((f) => ({ ...f, previousProsthesisNotes: e.target.value }))} />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">وسيلة مساعدة</Label>
            <div className="flex gap-4 flex-wrap">
              {(
                [
                  ["NONE", "لا يوجد"],
                  ["CANE", "عصا"],
                  ["CRUTCHES", "عكاز"],
                  ["WALKER", "مشاية"],
                ] as const
              ).map(([val, label]) => (
                <label
                  key={val}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.assistiveDevice === val}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        assistiveDevice: f.assistiveDevice === val ? "" : val,
                      }))
                    }
                    className="w-[15px] h-[15px] checkbox-orange rounded-sm"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Static Balance */}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-foreground">
          تقييم التوازن الثابت
        </p>
        <div className="rounded-lg overflow-hidden border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#2563eb] text-white">
                <th className="text-right py-2.5 px-3 font-medium">الاختبار</th>
                <th className="py-2.5 px-3 font-medium text-center w-20">
                  مستقل
                </th>
                <th className="py-2.5 px-3 font-medium text-center w-20">
                  بمساعدة
                </th>
                <th className="py-2.5 px-3 font-medium text-center w-20">
                  غير قادر
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {STATIC_BALANCE_KEYS.map(({ key, label }, i) => (
                <tr
                  key={key}
                  className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}
                >
                  <td className="py-2.5 px-3 text-sm">{label}</td>
                  {STATIC_BALANCE_OPTS.map((o) => (
                    <td key={o.value} className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={form.staticBalance[key] === o.value}
                        onChange={() => setArr("staticBalance", key, o.value)}
                        className="w-[18px] h-[18px] rounded-sm cursor-pointer checkbox-orange"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Balance */}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-foreground">
          تقييم التوازن الديناميكي
        </p>
        <div className="rounded-lg overflow-hidden border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#2563eb] text-white">
                <th className="text-right py-2.5 px-3 font-medium">المهمة</th>
                <th className="py-2.5 px-3 font-medium text-center w-16">
                  جيد
                </th>
                <th className="py-2.5 px-3 font-medium text-center w-16">
                  متوسط
                </th>
                <th className="py-2.5 px-3 font-medium text-center w-16">
                  ضعيف
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {DYNAMIC_TASK_KEYS.map(({ key, label }, i) => (
                <tr
                  key={key}
                  className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}
                >
                  <td className="py-2.5 px-3 text-sm">{label}</td>
                  {DYNAMIC_TASK_OPTS.map((o) => (
                    <td key={o.value} className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={form.dynamicTasks[key] === o.value}
                        onChange={() => setArr("dynamicTasks", key, o.value)}
                        className="w-[18px] h-[18px] rounded-sm cursor-pointer checkbox-orange"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Activities */}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-foreground">
          تقييم الأنشطة الديناميكية
        </p>
        <div className="rounded-lg overflow-hidden border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#2563eb] text-white">
                <th className="text-right py-2.5 px-3 font-medium">النشاط</th>
                <th className="py-2.5 px-3 font-medium text-center w-20">
                  مستقل
                </th>
                <th className="py-2.5 px-3 font-medium text-center w-20">
                  بصعوبة
                </th>
                <th className="py-2.5 px-3 font-medium text-center w-20">
                  غير قادر
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {DYNAMIC_ACTIVITY_KEYS.map(({ key, label }, i) => (
                <tr
                  key={key}
                  className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}
                >
                  <td className="py-2.5 px-3 text-sm">{label}</td>
                  {DYNAMIC_ACTIVITY_OPTS.map((o) => (
                    <td key={o.value} className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={form.dynamicActivities[key] === o.value}
                        onChange={() =>
                          setArr("dynamicActivities", key, o.value)
                        }
                        className="w-[18px] h-[18px] rounded-sm cursor-pointer checkbox-orange"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Separator />

      {/* Fall Risk */}
      <div className="space-y-3">
        <p className="text-[12px] font-semibold text-foreground">
          تقييم خطر السقوط
        </p>
        <div className="rounded-lg overflow-hidden border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#2563eb] text-white">
                <th className="text-right py-2.5 px-3 font-medium">البند</th>
                <th className="py-2.5 px-3 font-medium text-center w-24">
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="w-4 h-4 rounded-sm border border-white inline-block" />
                    نعم
                  </span>
                </th>
                <th className="py-2.5 px-3 font-medium text-center w-24">
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="w-4 h-4 rounded-sm border border-white inline-block" />
                    لا
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(
                [
                  ["historyOfFalls", "تاريخ سقوط سابق"],
                  ["nearFalls", "شبه سقوط"],
                  ["fearOfFalling", "خوف من السقوط"],
                ] as const
              ).map(([fld, lbl], i) => (
                <tr
                  key={fld}
                  className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}
                >
                  <td className="py-2.5 px-3 text-sm">
                    {lbl}
                    {/* Fall details — only for "تاريخ سقوط سابق" when answered نعم */}
                    {fld === "historyOfFalls" && form.historyOfFalls === true && (
                      <Input
                        className="mt-2 h-8 text-xs"
                        placeholder="تاريخ السقوط"
                        value={form.fallRiskNotes}
                        onChange={(e) => setForm((f) => ({ ...f, fallRiskNotes: e.target.value }))}
                      />
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={(form as any)[fld] === true}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          [fld]: (f as any)[fld] === true ? null : true,
                        }))
                      }
                      className="w-[18px] h-[18px] rounded-sm cursor-pointer checkbox-orange"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={(form as any)[fld] === false}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          [fld]: (f as any)[fld] === false ? null : false,
                        }))
                      }
                      className="w-[18px] h-[18px] rounded-sm cursor-pointer checkbox-orange"
                    />
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 border-t">
                <td className="py-2.5 px-3 text-sm font-medium">مستوى خطر السقوط</td>
                <td colSpan={2} className="py-2.5 px-3">
                  <div className="flex gap-4">
                    {[{ value: "LOW", label: "منخفض" }, { value: "MODERATE", label: "متوسط" }, { value: "HIGH", label: "عالي" }].map((o) => (
                      <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.fallRiskLevel === o.value}
                          onChange={() => setForm((f) => ({ ...f, fallRiskLevel: f.fallRiskLevel === o.value ? "" : o.value }))}
                          className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                        <span className="text-sm">{o.label}</span>
                      </label>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Separator />

      {/* Overall + Limiting Factors */}
      <div className="space-y-3">
        <p className="text-[12px] font-semibold text-foreground">
          {" "}
          خلاصة التوازن والانطباع السريري
        </p>
        <div className="space-y-1.5">
          <Label className="text-xs">مستوى التوازن العام</Label>
          <div className="flex gap-4">
            {[
              { value: "GOOD", label: "جيد" },
              { value: "FAIR", label: "مقبول" },
              { value: "POOR", label: "ضعيف" },
            ].map((o) => (
              <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.overallBalanceLevel === o.value}
                  onChange={() => setForm((f) => ({ ...f, overallBalanceLevel: f.overallBalanceLevel === o.value ? "" : o.value }))}
                  className="w-[15px] h-[15px] checkbox-orange rounded-sm" />
                <span className="text-sm">{o.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">العوامل المؤثرة الرئيسية</Label>
          <div className="space-y-1">
            {LIMITING_FACTOR_OPTS.map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="w-[15px] h-[15px] rounded-sm shrink-0 checkbox-orange"
                  checked={form.limitingFactors.includes(o.value)}
                  onChange={(e) =>
                    toggleArr("limitingFactors", o.value, e.target.checked)
                  }
                />
                <span className="text-xs">{o.label}</span>
              </label>
            ))}
          </div>
          <div className="space-y-1.5 pt-2">
            <Label className="text-xs">تفاصيل أخرى (اختياري)</Label>
            <Textarea rows={2} className="resize-none text-xs" placeholder="تفاصيل العوامل الأخرى..."
              value={form.limitingFactorsOtherNotes}
              onChange={(e) => setForm((f) => ({ ...f, limitingFactorsOtherNotes: e.target.value }))} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Exercise Program */}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-foreground">
          برنامج تمارين التوازن
        </p>
        <div className="rounded-lg overflow-hidden border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#2563eb] text-white">
                <th className="py-2.5 px-3 font-medium text-center w-10">✓</th>
                <th className="text-right py-2.5 px-3 font-medium min-w-[140px]">
                  التمرين
                </th>
                <th className="text-right py-2.5 px-3 font-medium min-w-[60px]">
                  الوضعية
                </th>
                <th className="text-right py-2.5 px-3 font-medium min-w-[90px]">
                  الجرعة
                </th>
                <th className="text-right py-2.5 px-3 font-medium min-w-[100px]">
                  الدعم
                </th>
                <th className="text-right py-2.5 px-3 font-medium min-w-[110px]">
                  ملاحظات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {form.exerciseProgram.map((ex, i) => (
                <tr
                  key={i}
                  className={
                    ex.selected
                      ? "bg-orange-50"
                      : i % 2 === 0
                        ? "bg-background"
                        : "bg-muted/30"
                  }
                >
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!ex.selected}
                      onChange={() => {
                        const ep = [...form.exerciseProgram];
                        ep[i] = { ...ep[i], selected: !ep[i].selected };
                        setForm((f) => ({ ...f, exerciseProgram: ep }));
                      }}
                      className="w-[18px] h-[18px] rounded-sm cursor-pointer checkbox-orange"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-sm font-medium">
                    {ex.exercise}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-muted-foreground">
                    {ex.position}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-muted-foreground">
                    {ex.dosage}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex flex-col gap-1">
                      {SUPPORT_OPTS.map((o) => (
                        <label key={o.value} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={ex.support === o.value}
                            onChange={() => {
                              const ep = [...form.exerciseProgram];
                              ep[i] = { ...ep[i], support: ex.support === o.value ? "" : o.value };
                              setForm((f) => ({ ...f, exerciseProgram: ep }));
                            }}
                            className="w-[13px] h-[13px] checkbox-orange rounded-sm" />
                          <span className="text-xs">{o.label}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="py-1.5 px-2">
                    <Input
                      value={ex.notes ?? ""}
                      onChange={(e) => {
                        const ep = [...form.exerciseProgram];
                        ep[i] = { ...ep[i], notes: e.target.value };
                        setForm((f) => ({ ...f, exerciseProgram: ep }));
                      }}
                      className="h-7 text-xs px-2"
                      placeholder="ملاحظات..."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Separator />

      {/* Program Development Plan */}
      <div className="space-y-3">
        <p className="text-[12px] font-semibold text-foreground">
          خطة تطوير البرنامج
        </p>
        <div className="rounded-lg border divide-y">
          {PROGRAM_PROGRESSION_OPTS.map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <input
                type="checkbox"
                checked={form.programProgression.includes(o.value)}
                onChange={(e) =>
                  toggleArr("programProgression", o.value, e.target.checked)
                }
                className="w-[18px] h-[18px] rounded-sm cursor-pointer checkbox-orange shrink-0"
              />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Follow-up + Outcomes + Signatures */}
      <div className="space-y-4">
        <p className="text-[12px] font-semibold text-foreground">
          المراجعة والمتابعة
        </p>

        {/* Review weeks */}
        <div className="flex items-center gap-2">
          <Label className="text-sm shrink-0">المراجعة بعد</Label>
          <Input
            type="number"
            min={1}
            placeholder="4"
            value={form.followUpWeeks}
            onChange={(e) =>
              setForm((f) => ({ ...f, followUpWeeks: e.target.value }))
            }
            className="w-24 text-center"
          />
          <Label className="text-sm shrink-0">أسابيع</Label>
        </div>

        {/* Expected Goals */}
        <div className="space-y-2">
          <Label className="text-xs">الهدف المتوقع</Label>
          <div className="rounded-lg border divide-y">
            {EXPECTED_OUTCOME_OPTS.map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={form.expectedOutcomes.includes(o.value)}
                  onChange={(e) =>
                    toggleArr("expectedOutcomes", o.value, e.target.checked)
                  }
                  className="w-[18px] h-[18px] rounded-sm cursor-pointer checkbox-orange shrink-0"
                />
                <span className="text-sm">{o.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-4">
          {(
            [
              [
                "committee",
                "رئيس لجنة التقييم",
                "committeeHeadId",
                "committeeHeadSignatureUrl",
                "committeeHeadSignatureDate",
              ],
              [
                "physio",
                "المعالج الفيزيائي",
                "physiotherapistId",
                "physiotherapistSignatureUrl",
                "physiotherapistSignatureDate",
              ],
            ] as const
          ).map(([role, lbl, idField, sigField, dateField]) => (
            <div key={role} className="space-y-2 rounded-lg border p-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{lbl}</Label>
                <Select
                  value={(form as any)[idField] || "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      [idField]: v === "none" ? "" : v,
                      [sigField]: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— غير محدد —</SelectItem>
                    {(role === "physio"
                      ? staffList.filter((e: any) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("الفيزيائي") || e.department?.nameAr?.includes("العلاج الطبيعي")))
                      : staffList
                    ).map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstNameAr} {e.lastNameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">التوقيع</Label>
                <div className="rounded border min-h-[64px] flex items-center justify-center bg-white/50 p-2">
                  {(form as any)[sigField] ? (
                    <div className="relative inline-block">
                      <img
                        src={(form as any)[sigField]}
                        alt="توقيع"
                        className="h-14 object-contain"
                      />
                      <button
                        onClick={() =>
                          setForm((f) => ({ ...f, [sigField]: "" }))
                        }
                        className="absolute -top-1 -left-1 bg-destructive text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs w-full"
                      onClick={() => handleSigClick(role)}
                      disabled={!(form as any)[idField]}
                    >
                      {(form as any)[idField]
                        ? "جلب / رفع التوقيع"
                        : "اختر أولاً"}
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">التاريخ</Label>
                <Input
                  type="date"
                  value={(form as any)[dateField]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [dateField]: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
            </div>
          ))}
        </div>
        <input
          ref={physioSigRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleSigFile(e, "physio")}
        />
        <input
          ref={committeeSigRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleSigFile(e, "committee")}
        />
      </div>

      <Separator />

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs">ملاحظات</Label>
        <Textarea
          rows={3}
          placeholder="ملاحظات إضافية..."
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="resize-none"
        />
      </div>

      </fieldset>

      {!isSaved && (
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 gap-1"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isNew ? "إضافة التقييم" : "حفظ نهائي"}
          </Button>
          <Button
            variant="outline"
            onClick={() => (isNew ? onCancel?.() : setEditing(false))}
          >
            إلغاء
          </Button>
        </div>
      )}
    </div>
  );
}

function BalanceAssessmentSection({ caseId, staffList }: { caseId: string; staffList: any[] }) {
  const { data: sessions = [], isLoading } = useBalanceAssessments(caseId);
  const [showAdd, setShowAdd] = useState(false);
  return (
    <Section
      title={`تقييمات التوازن — Pro-015${sessions.length > 0 ? ` (${sessions.length})` : ""}`}
      action={
        <Button size="sm" variant={showAdd ? "secondary" : "outline"} className="gap-1 text-xs" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="h-3.5 w-3.5" />
          {showAdd ? "إغلاق" : "إضافة تقييم"}
        </Button>
      }
    >
      {showAdd && (
        <div className="mb-4 border rounded-lg p-1">
          <BalanceAssessmentCard caseId={caseId} staffList={staffList} onCancel={() => setShowAdd(false)} />
        </div>
      )}
      {isLoading ? (
        <div className="py-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : sessions.length === 0 && !showAdd ? (
        <p className="text-sm text-muted-foreground text-center py-4">لا توجد تقييمات توازن مسجّلة</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s: any, i: number) => (
            <BalanceAssessmentCard key={s.id} caseId={caseId} staffList={staffList} session={s} idx={i} />
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// Badge for sections the backend has frozen — mirrors the balance-assessment card.
function SavedBadge() {
  const t = useTranslations("clinic.prosthetics.case");
  return (
    <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 text-xs gap-1">
      <CheckCircle2 className="h-3 w-3" />
      {t("savedReadOnly")}
    </Badge>
  );
}

// Merge a saved assessment record onto an empty form shape. Form keys and DTO
// keys are 1:1 (see buildUpperDto/buildLowerDto), so a key-wise copy is enough;
// keys the record omits keep their empty-form default.
function hydrateAssessForm<T extends Record<string, any>>(empty: T, rec?: Record<string, any>): T {
  if (!rec) return empty;
  const out: any = { ...empty };
  for (const key of Object.keys(empty)) {
    const val = rec[key];
    if (val !== undefined && val !== null) out[key] = val;
  }
  return out;
}

// Newest saved record per side. The backend upserts one row per (case, side) —
// AssessmentResult carries no timestamp, unlike the MeasurementAssessment
// history — so last-wins is a no-op there, and stays right if it ever appends.
function recordForSide(recs: AssessmentResult[], side: "RIGHT" | "LEFT") {
  return recs.reduce<AssessmentResult | undefined>((acc, r) => (r.side === side ? r : acc), undefined);
}

// ─── Paper-form helpers ───────────────────────────────────────────────────────

function PfSq({ checked, label, onClick }: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1 text-sm leading-none ${checked ? "text-primary" : "text-foreground"}`}>
      <span className={`inline-flex h-3.5 w-3.5 border rounded-none shrink-0 items-center justify-center transition-colors ${checked ? "border-primary bg-primary" : "border-foreground/50"}`}>
        {checked && <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="1.5,5 4,7.5 8.5,2.5" /></svg>}
      </span>
      <span>{label}</span>
    </button>
  );
}

function PfNumPicker({ value, onChange, max = 10 }: { value: number | null; onChange: (n: number) => void; max?: number }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`h-6 w-6 border rounded-none text-xs flex items-center justify-center font-medium transition-colors ${value === n ? "border-primary bg-primary text-white" : "border-border text-foreground hover:border-primary/50"}`}>
          {n}
        </button>
      ))}
    </div>
  );
}

function PfGrader({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[0,1,2,3,4,5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`h-6 w-6 border rounded-none text-xs flex items-center justify-center font-medium transition-colors ${value === n ? "border-primary bg-primary text-white" : "border-border text-foreground hover:border-primary/50"}`}>
          {n}
        </button>
      ))}
    </div>
  );
}

function PfRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
      <span className="text-sm font-medium shrink-0 w-52 pt-0.5 leading-tight">{label}</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 flex-1">{children}</div>
    </div>
  );
}

function PfDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="flex-1 border-t border-border/50" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{label}</span>
    </div>
  );
}

// amputationLevel comes back from the backend as either a "/"-joined string
// or (for some records) an already-split array — normalize to string[].
function toAmputationLevels(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") return raw.split("/").filter(Boolean);
  return [];
}

// Which case status each workflow tab corresponds to. The tab name no longer
// matches the status name, so the mapping is explicit in both directions:
//   الاستقبال…التركيب → معاينة, ورق القياس → أخذ قياس, التسليم التجريبي → تسليم
//   تجريبي, تحليل المشي/التوازن → تأهيل, التقييم النهائي → تم التسليم,
//   التسليم النهائي → تم التركيب.
const STATUS_BY_TAB: Record<string, ProstheticsStatus> = {
  intake: "INTAKE",
  patient_info: "ASSESSMENT",
  assessment: "ASSESSMENT",
  committee_review: "ASSESSMENT",
  fitting: "ASSESSMENT",
  measurement_sheet: "FITTING",
  treatment_program: "FITTING",
  delivered: "SOCKET_TRIAL",
  gait_analysis: "GAIT_TRAINING",
  balance_assessment: "GAIT_TRAINING",
  final_evaluation: "DELIVERED",
  final_delivery: "FINAL_REVIEW",
};

// The tab a case opens on, given its stored status. First tab that maps to it.
const TAB_BY_STATUS: Record<string, string> = {
  INTAKE: "intake",
  ASSESSMENT: "assessment",
  FITTING: "measurement_sheet",
  SOCKET_TRIAL: "delivered",
  GAIT_TRAINING: "gait_analysis",
  FOLLOW_UP: "treatment_program",
  DELIVERED: "final_evaluation",
  FINAL_REVIEW: "final_delivery",
  // Legacy statuses still stored on older cases.
  COMMITTEE_REVIEW: "committee_review",
  GAIT_ANALYSIS: "gait_analysis",
  FINAL_EVALUATION: "final_evaluation",
};

// Age in completed years, derived from the stored date of birth.
function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
}

// History of past measurement-sheet submissions for one amputation type.
// The backend appends a new record on every POST and returns them newest-first.
function MeasurementHistoryList({ records }: { records: MeasurementAssessment[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (records.length === 0) return null;

  return (
    <div className="space-y-2">
      {records.map((r) => {
        const expanded = expandedId === r.id;
        const affectedEntries = Object.entries(r.affectedLimb ?? {});
        const soundEntries = Object.entries(r.soundLimb ?? {});
        const hasDetails = affectedEntries.length > 0 || soundEntries.length > 0 || !!r.notes;
        return (
          <div key={r.id} className="rounded-lg border overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 p-3 text-sm hover:bg-muted/40 text-right"
              onClick={() => hasDetails && setExpandedId(expanded ? null : r.id)}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{SIDE_LABEL[r.side] ?? r.side}</Badge>
                <span className="text-muted-foreground">
                  {new Date(r.examinedAt).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                {r.footMeasurement && <span className="text-xs text-muted-foreground">قياس القدم: {r.footMeasurement}</span>}
              </div>
              {hasDetails && (expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />)}
            </button>
            {expanded && (
              <div className="border-t p-3 space-y-3 bg-muted/20">
                {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                {(affectedEntries.length > 0 || soundEntries.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {affectedEntries.length > 0 && (
                      <div>
                        <p className="font-semibold mb-1">الطرف المصاب</p>
                        <div className="grid grid-cols-2 gap-1">
                          {affectedEntries.map(([k, v]) => (
                            <div key={k} className="flex justify-between border-b py-0.5">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="font-mono">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {soundEntries.length > 0 && (
                      <div>
                        <p className="font-semibold mb-1">الطرف السليم</p>
                        <div className="grid grid-cols-2 gap-1">
                          {soundEntries.map(([k, v]) => (
                            <div key={k} className="flex justify-between border-b py-0.5">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="font-mono">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Opinion field that stays collapsed to just its label until clicked — keeps the
// committee section short when most opinions are left empty.
function CollapsibleOpinionField({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      {/* A div, not a button: this field also lives inside the read-only
          <fieldset> of a saved evaluation, where a button would be disabled and
          the saved opinion could no longer be expanded for reading. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-1.5 text-start rounded-md -mx-1 px-1 py-1 hover:bg-muted/50 transition-colors"
      >
        {open ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <span className="text-xs font-medium shrink-0">{label}</span>
        {!open && value && <span className="truncate text-xs text-muted-foreground">— {value}</span>}
      </div>
      {open && (
        <Textarea autoFocus rows={2} className="resize-none text-xs" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProstheticsCasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("clinic.prosthetics.case");
  const tMonth = useTranslations("payroll.months");

  const { data: caseData, isLoading } = useProstheticsCase(id);
  const { data: patientFull } = useClinicPatient(caseData?.patientId ?? "");
  const { data: patientDocs = [] } = usePatientDocuments(caseData?.patientId ?? "");
  const { data: components = [] } = useCaseComponents(id);
  const { data: followUps = [] } = useProstheticsFollowUps(id);
  const { data: timeline = [] } = useProstheticsTimeline(id);
  const { data: attachments = [] } = useProstheticsAttachments(id);

  const qc = useQueryClient();
  const updateCase = useUpdateProstheticsCase();
  const updateStatus = useUpdateProstheticsStatus();
  const updatePatient = useUpdateClinicPatient();
  const submitAssessmentUpper = useSubmitAssessmentUpper();
  const submitAssessmentLower = useSubmitAssessmentLower();
  const submitOpinion = useSubmitCommitteeOpinion();
  const submitDecision = useSubmitCommitteeDecision();
  const signDecision = useSignCommitteeDecision();
  const addComponent = useAddCaseComponent();
  const deleteComponent = useDeleteCaseComponent();
  const [confirmDelComp, setConfirmDelComp] = useState<string | null>(null);
  const [casePdfExporting, setCasePdfExporting] = useState(false);
  const submitGait = useSubmitGaitAnalysis();
  const addConsumable = useAddConsumable();
  const { data: finalEvalData } = useFinalEvaluation(id);
  const submitFinalEval = useSubmitFinalEvaluation();
  const signFinalEval = useSignFinalEvaluation();
  const submitDelivery = useSubmitDelivery();
  const signDelivery = useSignDelivery();
  const addFollowUp = useAddProstheticsFollowUp();
  const downloadPdf = useDownloadProstheticsPdf();
  const uploadAttachment = useUploadProstheticsAttachment();
  const deleteAttachment = useDeleteProstheticsAttachment();
  const attachFileRef = useRef<HTMLInputElement>(null);
  const attachCameraRef = useRef<HTMLInputElement>(null);
  const submitAnkleMeasurement = useSubmitAnkleDisarticulation();
  const submitKneeMeasurement = useSubmitKneeDisarticulation();
  const submitTransfemoralMeasurement = useSubmitTransfemoral();
  const submitTranstibialMeasurement = useSubmitTranstibial();
  const submitHemipelvectomyMeasurement = useSubmitHemipelvectomy();
  const submitElbowMeasurement = useSubmitElbowDisarticulation();
  const submitTranshumeralMeasurement = useSubmitTranshumeral();
  const submitTransradialMeasurement = useSubmitTransradial();
  const { data: deliveryData19 } = useProstheticDelivery(id);
  const { data: finalDelivery } = useFinalDelivery(id);
  const createFinalDelivery = useCreateFinalDelivery();
  const updateFinalDelivery = useUpdateFinalDelivery();
  const saveProsDelivery = useSaveProstheticDelivery();
  const currentUser = useAuthStore((s) => s.user);

  // ── Local form state ──
  const [intakeForm, setIntakeForm] = useState({
    amputationType: "", amputationSide: "", amputationLevels: [] as string[],
    amputationYear: "", amputationMonth: "0", amputationCause: "", amputationCauseOtherDetail: "", amputationCount: "1",
    appointmentDate: "", appointmentTime: "",
    hasChronicDiseases: null as boolean | null,
    chronicDiseases: "",
    hasPhysicalTherapy: null as boolean | null,
    physicalTherapyDetails: "",
    hasPreviousProsthesis: null as boolean | null,
    previousProsthesisDetails: "",
    previousProsthesisWhen: "",
    previousProsthesisWhere: "",
    previousProsthesisType: "",
    hasRevisionSurgery: null as boolean | null,
    revisionDetails: "",
  });
  // ── General assessment (PUT) ──
  const [genAssessForm, setGenAssessForm] = useState({
    amputationYear: "",
    amputationMonth: "0",
    amputationCause: "",
    amputationCauseOtherDetail: "",
    clinicalHistory: "",
    moreAffectedSide: "",
    currentlyUsingProsthesis: null as boolean | null,
    previouslyUsedProsthesis: null as boolean | null,
    previousProsthesisSystemDetail: "",
  });

  // ── Upper assessment form ──
  const emptyUpperForm = () => ({
    amputationSide: "" as "RIGHT" | "LEFT" | "BILATERAL" | "",
    side: "LEFT" as "LEFT" | "RIGHT",
    residualLimbLength: "" as string,
    residualLimbShape: "" as string,
    amputationLevelNote: "",
    painPresent: null as boolean | null,
    painIntensity: 0,
    painTypes: [] as string[],
    painTypeOtherDetail: "",
    phantomPainPresent: null as boolean | null,
    phantomPainIntensity: 0,
    neuromaPalpable: null as boolean | null,
    skinNotes: "",
    skinAppearance: [] as string[],
    skinColor: [] as string[],
    skinTemperature: "" as string,
    scarCondition: [] as string[],
    hasSkinGrafts: false,
    graftArea: "",
    closureNotes: "",
    generalHealthNotes: "",
    otherLimbCondition: "",
    canBalanceOneSide: false,
    usesCompressionBandage: false,
    jointsRangeOfMotion: "" as string,
    activityLevel: "" as string,
    prostheticLimbType: "",
    neuromaPresent: null as boolean | null,
    romData: {} as Record<string, RomEntry>,
  });
  const [upperAssessForm, setUpperAssessForm] = useState(emptyUpperForm());
  const [upperAssessFormLeft, setUpperAssessFormLeft] = useState(emptyUpperForm());

  // ── Lower assessment form ──
  const emptyLowerForm = () => ({
    amputationSide: "" as "RIGHT" | "LEFT" | "BILATERAL" | "",
    side: "LEFT" as "LEFT" | "RIGHT",
    residualLimbLength: "" as string,
    residualLimbShape: "" as string,
    amputationLevelNote: "",
    painPresent: null as boolean | null,
    painIntensity: 0,
    painArea: "",
    painTypes: [] as string[],
    painTypeOtherDetail: "",
    phantomPainPresent: null as boolean | null,
    phantomPainIntensity: 0,
    neuromaPalpable: null as boolean | null,
    loadTolerance: "" as string,
    weightBearingLevel: "" as string,
    notes: "",
    skinAppearance: [] as string[],
    skinColor: [] as string[],
    skinTemperature: "" as string,
    scarCondition: [] as string[],
    hasSkinGrafts: false,
    graftArea: "",
    generalHealthNotes: "",
    otherLimbCondition: "",
    usesAssistiveDevices: null as boolean | null,
    assistiveDeviceTypes: "",
    canClimbStairs: null as boolean | null,
    canBalanceOneSide: null as boolean | null,
    jointsRangeOfMotion: "" as string,
    activityLevel: "" as string,
    prostheticLimbType: "",
    romData: {} as Record<string, RomEntry>,
    muscleMotionNotes: "",
  });
  const [lowerAssessForm, setLowerAssessForm] = useState(emptyLowerForm());
  const [lowerAssessFormLeft, setLowerAssessFormLeft] = useState(emptyLowerForm());
  const [prosthetistOpinion, setProsthetistOpinion] = useState("");
  const [physioOpinion, setPhysioOpinion] = useState("");
  const [doctorOpinion, setDoctorOpinion] = useState("");
  const [decisionForm, setDecisionForm] = useState({ finalSummary: "" });
  const [committeeSuitForm, setCommitteeSuitForm] = useState({
    prosthesisSuitable: null as boolean | null,
    proposedProsthesisType: "",
  });
  const [signOpen, setSignOpen] = useState(false);
  const [signRole, setSignRole] = useState<"DOCTOR" | "PROSTHETIST" | "PHYSIOTHERAPIST">("DOCTOR");
  const [compShared, setCompShared] = useState({
    sourceLocation: "WAREHOUSE" as "WAREHOUSE" | "EXTERNAL" | "PATIENT_OWNED" | "OTHER",
    supplier: "OTTOBOCK" as "OTTOBOCK" | "OTHER",
    supplierOther: "",
  });
  const [compRows, setCompRows] = useState<Array<{ inventoryItemId: string }>>(
    Array.from({ length: 10 }, () => ({ inventoryItemId: "" }))
  );
  // Scenario 2 — a free-text part not in the inventory catalog, entered via the
  // "add new item" dialog inside the combobox. Submitted without an
  // inventoryItemId; the backend saves it unlinked and notifies the admin.
  const [customPartDialog, setCustomPartDialog] = useState<{ open: boolean; name: string; code: string }>(
    { open: false, name: "", code: "" }
  );
  const [gaitForm, setGaitForm] = useState({ clinicalConclusion: "", recommendations: "", treatmentPlan: "" });
  const [balanceForm, setBalanceForm] = useState({ overallLevel: "", fallRisk: "LOW" as "LOW" | "MODERATE" | "HIGH", notes: "" });
  const [consumableForm, setConsumableForm] = useState({ name: "", quantity: "1", unit: "", notes: "" });
  const [consumables, setConsumables] = useState<Array<{ name: string; quantity: string; unit: string; notes: string }>>([]);
  const INITIAL_FINAL_EVAL: FinalEvaluationDto & { managerNotes: string; patientFileComplete: boolean; managerId: string; managerSignatureUrl: string } = {
    supervisorId: "", residualLimbCondition: "", suspensionSystemUsed: "",
    socksDelivered: undefined, linersDelivered: undefined, fittingDate: "",
    generalNotes: "",
    physioOpinion: "", departmentHeadOpinion: "", prosthetistOpinion: "",
    prosthetistSupervisorOpinion: "", committeeHeadOpinion: "", expertOpinion: "",
    readyForDelivery: false, needsFollowUp: false, followUpPlan: "",
    medicalDirectorNotes: "",
    managerNotes: "", patientFileComplete: false,
    managerId: "", managerSignatureUrl: "",
  };
  const [finalEvalForm, setFinalEvalForm] = useState({ ...INITIAL_FINAL_EVAL });
  useEffect(() => {
    if (finalEvalData) {
      setFinalEvalForm((prev) => ({ ...INITIAL_FINAL_EVAL, ...finalEvalData }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalEvalData]);
  // Once the final evaluation has been saved it is locked: the whole tab turns
  // read-only so a recorded committee decision can't be altered afterwards.
  const finalEvalLocked = !!(finalEvalData as any)?.id || submitFinalEval.isSuccess;
  const [finalSignOpen, setFinalSignOpen] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({ deliveryDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [deliverySignOpen, setDeliverySignOpen] = useState(false);

  // ── Pro-019 state ─────────────────────────────────────────────────────────
  const [proDeliveryHeader, setProDeliveryHeader] = useState({ inspectionDate: "", prosthetistId: "", physiotherapistId: "", medicalDirectorId: "", medicalDirectorSignatureUrl: "", medicalDirectorSignedAt: "", signatureDate: "" });
  // Final delivery is an independent record; its header is edited via PATCH.
  // It is signed by the CEO (the trial delivery is signed by the medical director).
  const [finalDeliveryHeader, setFinalDeliveryHeader] = useState({ inspectionDate: "", prosthetistId: "", physiotherapistId: "", ceoId: "", ceoSignatureUrl: "", signatureDate: "" });
  const finalCeoSigRef = useRef<HTMLInputElement>(null);
  // Patient signature on the delivery pledge. Pulled from the signature already on
  // file for the patient; the final-delivery record has no field to store it yet.
  const [pledgeSignature, setPledgeSignature] = useState("");
  const [pledgePdfLoading, setPledgePdfLoading] = useState(false);
  // Controlled value for the workflow-stage tabs. null → follow the status-based
  // default; set it to jump to a tab programmatically (e.g. the delivery tab's
  // "إضافة قطعة" button sends the user to the fitting tab to add components).
  const [stageTab, setStageTab] = useState<string | null>(() => searchParams.get("tab"));
  // Honor ?tab= (e.g. from a CASE_ALERT notification) even if already mounted.
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setStageTab(tab);
  }, [searchParams]);
  const medicalDirectorSigRef = useRef<HTMLInputElement>(null);
  const finalEvalManagerSigRef = useRef<HTMLInputElement>(null);
  const [patientEditMode, setPatientEditMode] = useState(false);
  const [patientEditForm, setPatientEditForm] = useState({ firstName: "", lastName: "", dateOfBirth: "", phone: "", heightCm: "", weightKg: "" });
  const [followUpForm, setFollowUpForm] = useState({ date: new Date().toISOString().slice(0, 10), notes: "", kLevel: null as KLevel | null, painLevel: "" });
  const [staffForm, setStaffForm] = useState({
    prosthetistIds: [] as string[],
    physiotherapistIds: [] as string[],
    supervisingDoctorIds: [] as string[],
  });
  const [openStaffKey, setOpenStaffKey] = useState<string | null>(null);

  // ── Measurement sheet state ──
  type MeasureSheetType = "ankle_disarticulation" | "knee_disarticulation" | "above_knee" | "below_knee" | "hemipelvectomy" | "elbow_disarticulation" | "transhumeral" | "transradial";
  const [measureSheetType, setMeasureSheetType] = useState<MeasureSheetType[]>([]);
  // Explicitly-opened "add new measurement" forms — a type's form is shown
  // by default only when it has no history yet; otherwise the user opens it
  // via the "+ إضافة قياس جديد" button once they want to add another record.
  const [measureAddOpen, setMeasureAddOpen] = useState<Partial<Record<MeasureSheetType, boolean>>>({});
  const [ankleForm, setAnkleForm] = useState<{
    side: "RIGHT" | "LEFT"; notes: string; footMeasurement: string;
    soundLimb: Record<string, string>; affectedLimb: Record<string, string>;
  }>({ side: "RIGHT", notes: "", footMeasurement: "", soundLimb: {}, affectedLimb: {} });

  const [kneeForm, setKneeForm] = useState<{
    side: "RIGHT" | "LEFT"; notes: string; footMeasurement: string;
    soundLimb: Record<string, string>; affectedLimb: Record<string, string>;
  }>({ side: "RIGHT", notes: "", footMeasurement: "", soundLimb: {}, affectedLimb: {} });

  const [transradialForm, setTransradialForm] = useState<{
    side: "RIGHT" | "LEFT"; notes: string;
    soundLimb: Record<string, string>; affectedLimb: Record<string, string>;
  }>({ side: "RIGHT", notes: "", soundLimb: {}, affectedLimb: {} });

  const [transhumeralForm, setTranshumeralForm] = useState<{
    side: "RIGHT" | "LEFT"; notes: string;
    soundLimb: Record<string, string>; affectedLimb: Record<string, string>;
  }>({ side: "RIGHT", notes: "", soundLimb: {}, affectedLimb: {} });

  const [elbowForm, setElbowForm] = useState<{
    side: "RIGHT" | "LEFT"; notes: string;
    soundLimb: Record<string, string>; affectedLimb: Record<string, string>;
  }>({ side: "RIGHT", notes: "", soundLimb: {}, affectedLimb: {} });

  const [hemipelvectomyForm, setHemipelvectomyForm] = useState<{
    side: "RIGHT" | "LEFT"; notes: string; footMeasurement: string;
    soundLimb: Record<string, string>; affectedLimb: Record<string, string>;
  }>({ side: "RIGHT", notes: "", footMeasurement: "", soundLimb: {}, affectedLimb: {} });

  const [transtibialForm, setTranstibialForm] = useState<{
    side: "RIGHT" | "LEFT"; notes: string; footMeasurement: string;
    soundLimb: Record<string, string>; affectedLimb: Record<string, string>;
  }>({ side: "RIGHT", notes: "", footMeasurement: "", soundLimb: {}, affectedLimb: {} });

  const [transfemoralForm, setTransfemoralForm] = useState<{
    side: "RIGHT" | "LEFT"; notes: string; footMeasurement: string;
    soundLimb: Record<string, string>; affectedLimb: Record<string, string>;
  }>({ side: "RIGHT", notes: "", footMeasurement: "", soundLimb: {}, affectedLimb: {} });

  const { data: inventoryData } = useInventoryItems();
  const inventoryItems = Array.isArray(inventoryData) ? inventoryData : (inventoryData as any)?.items ?? [];
  // GET /inventory/items returns both real catalog items (status: null) and
  // part-request records (status set — one per requested component, sharing
  // the catalog item's code). The picker must offer only real catalog items,
  // otherwise the same code appears once per request. The full list is kept
  // for resolving a component's linked request status elsewhere.
  const catalogInventoryItems = inventoryItems.filter((it: any) => it.status == null);

  const { data: staffData } = useEmployeesBasicList();
  const staffList: any[] = Array.isArray(staffData)
    ? staffData
    : (staffData as any)?.data?.items ?? (staffData as any)?.items ?? [];

  // sync Pro-019 header from server
  useEffect(() => {
    if (!deliveryData19) return;
    setProDeliveryHeader({
      inspectionDate: (deliveryData19 as any)?.inspectionDate?.slice(0, 10) ?? "",
      prosthetistId: (deliveryData19 as any)?.prosthetistId ?? "",
      physiotherapistId: (deliveryData19 as any)?.physiotherapistId ?? "",
      medicalDirectorId: (deliveryData19 as any)?.medicalDirectorId ?? "",
      medicalDirectorSignatureUrl: (deliveryData19 as any)?.medicalDirectorSignatureUrl ?? "",
      medicalDirectorSignedAt: (deliveryData19 as any)?.medicalDirectorSignedAt ?? "",
      signatureDate: (deliveryData19 as any)?.signatureDate?.slice(0, 10) ?? "",
    });
  }, [deliveryData19]);

  useEffect(() => {
    if (!finalDelivery) return;
    const fd = finalDelivery as any;
    setFinalDeliveryHeader({
      inspectionDate: fd?.inspectionDate?.slice(0, 10) ?? "",
      prosthetistId: fd?.prosthetistId ?? "",
      physiotherapistId: fd?.physiotherapistId ?? "",
      ceoId: fd?.ceoId ?? "",
      ceoSignatureUrl: fd?.ceoSignatureUrl ?? "",
      signatureDate: fd?.signatureDate?.slice(0, 10) ?? "",
    });
  }, [finalDelivery]);

  // يمنع إعادة تهيئة الفورم مباشرة بعد الحفظ
  const justSavedRef = useRef(false);

  // A submitted committee opinion is read-only, so mirror the server text into the
  // textarea whenever the review data arrives — independent of the justSaved guard
  // below (which would otherwise skip it on a post-save refetch). Only submitted
  // roles are written, so in-progress edits to un-submitted opinions are preserved.
  useEffect(() => {
    const cr = caseData?.committeeReview;
    if (!cr) return;
    if (cr.prosthetistReviewedAt) setProsthetistOpinion(cr.prosthetistOpinion ?? "");
    if (cr.physiotherapistReviewedAt) setPhysioOpinion(cr.physiotherapistOpinion ?? "");
    if (cr.doctorReviewedAt) setDoctorOpinion(cr.doctorOpinion ?? "");
    if (cr.decidedAt && cr.finalSummary) setDecisionForm({ finalSummary: cr.finalSummary });
  }, [caseData?.committeeReview]);

  // ملء الفورم من السيرفر عند أول تحميل أو عند العودة للصفحة
  useEffect(() => {
    if (!caseData) return;
    if (justSavedRef.current) {
      justSavedRef.current = false;
      return;
    }
    setIntakeForm({
      amputationType: (() => {
        const raw = caseData.amputationType;
        if (!raw) return "";
        if (Array.isArray(raw)) {
          const up = raw.some((t: string) => String(t).toUpperCase() === "UPPER");
          const lo = raw.some((t: string) => String(t).toUpperCase() === "LOWER");
          return up && lo ? "BOTH" : up ? "UPPER" : lo ? "LOWER" : "";
        }
        return String(raw).toUpperCase() === "BOTH" ? "BOTH" : raw;
      })(),
      amputationSide: caseData.amputationSide ?? "",
      amputationLevels: toAmputationLevels(caseData.amputationLevel),
      amputationYear: caseData.dateOfAmputation ? caseData.dateOfAmputation.slice(0, 4) : "",
      amputationMonth: caseData.dateOfAmputation && caseData.dateOfAmputation.length >= 7
        ? String(parseInt(caseData.dateOfAmputation.slice(5, 7)))
        : "0",
      amputationCause: caseData.causeOfAmputation ?? "",
      amputationCauseOtherDetail: caseData.amputationCauseOtherDetail ?? "",
      amputationCount: caseData.numberOfAmputations?.toString() ?? "1",
      appointmentDate: (caseData as any).appointmentDate ?? "",
      appointmentTime: (caseData as any).appointmentTime ?? "",
      hasChronicDiseases: caseData.hasChronicDiseases ?? null,
      chronicDiseases: caseData.chronicDiseases ?? "",
      hasPhysicalTherapy: caseData.hasPhysicalTherapy ?? null,
      physicalTherapyDetails: caseData.physicalTherapyDetails ?? "",
      hasPreviousProsthesis: caseData.hasPreviousProsthesis ?? null,
      previousProsthesisDetails: caseData.previousProsthesisDetails ?? "",
      previousProsthesisWhen: caseData.previousProsthesisWhen ?? "",
      previousProsthesisWhere: caseData.previousProsthesisWhere ?? "",
      previousProsthesisType: caseData.previousProsthesisType ?? "",
      hasRevisionSurgery: caseData.hasRevisionSurgery ?? null,
      revisionDetails: caseData.revisionDetails ?? "",
    });
    // Saved via updateCase as arrays (prosthetistIds …). On reload the backend may
    // echo the staff back in any of several shapes — plural id arrays, a single id,
    // or a nested staff object carrying the id — so read whichever is present.
    const cd = caseData as any;
    const asIds = (arr: any): string[] | null =>
      Array.isArray(arr) ? arr.map((x) => (typeof x === "string" ? x : x?.id)).filter(Boolean) : null;
    const firstId = (...vals: any[]): string[] => {
      const v = vals.find((x) => typeof x === "string" && x);
      return v ? [v] : [];
    };
    setStaffForm({
      prosthetistIds: asIds(cd.prosthetistIds) ?? firstId(caseData.prosthetistId, caseData.assignedProsthetistId, cd.prosthetist?.id, cd.prosthetist?.employeeId),
      physiotherapistIds: asIds(cd.physiotherapistIds) ?? firstId(caseData.physiotherapistId, cd.physiotherapist?.id, cd.physiotherapist?.employeeId),
      supervisingDoctorIds: asIds(cd.supervisingDoctorIds) ?? firstId(caseData.supervisingDoctorId, cd.supervisingDoctor?.id, cd.supervisingDoctor?.employeeId),
    });
    setCommitteeSuitForm({
      prosthesisSuitable: caseData.prosthesisSuitable ?? null,
      proposedProsthesisType: caseData.proposedProsthesisType ?? "",
    });

    // Assessment forms — without this a saved case reopens blank, and the
    // read-only lock below would freeze empty fields. `amputationSide` is not
    // stored on the record; it is implied by which sides came back.
    const upperRecs = caseData.upperAssessment ?? [];
    if (upperRecs.length) {
      const sides = new Set(upperRecs.map((r) => r.side));
      const ampSide = sides.has("RIGHT") && sides.has("LEFT") ? "BILATERAL" : upperRecs[0].side;
      const right = recordForSide(upperRecs, "RIGHT");
      const left = recordForSide(upperRecs, "LEFT");
      setUpperAssessForm({
        ...hydrateAssessForm(emptyUpperForm(), ampSide === "LEFT" ? left : right ?? upperRecs[0]),
        amputationSide: ampSide,
      });
      if (ampSide === "BILATERAL") {
        setUpperAssessFormLeft({ ...hydrateAssessForm(emptyUpperForm(), left), amputationSide: ampSide });
      }
    }

    const lowerRecs = caseData.lowerAssessment ?? [];
    if (lowerRecs.length) {
      const sides = new Set(lowerRecs.map((r) => r.side));
      const ampSide = sides.has("RIGHT") && sides.has("LEFT") ? "BILATERAL" : lowerRecs[0].side;
      const right = recordForSide(lowerRecs, "RIGHT");
      const left = recordForSide(lowerRecs, "LEFT");
      setLowerAssessForm({
        ...hydrateAssessForm(emptyLowerForm(), ampSide === "LEFT" ? left : right ?? lowerRecs[0]),
        amputationSide: ampSide,
      });
      if (ampSide === "BILATERAL") {
        setLowerAssessFormLeft({ ...hydrateAssessForm(emptyLowerForm(), left), amputationSide: ampSide });
      }
    }
  }, [caseData?.updatedAt]);

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  if (!caseData) {
    return <div className="text-center py-20 text-muted-foreground">الحالة غير موجودة</div>;
  }

  const c = caseData;

  // Once an assessment is saved it renders read-only — the form above is
  // hydrated from these same records.
  const upperSaved = (c.upperAssessment ?? []).length > 0;
  const lowerSaved = (c.lowerAssessment ?? []).length > 0;

  // A committee opinion can be submitted only once; once its *ReviewedAt is set it
  // renders read-only (the backend rejects re-submission with 409).
  const cr = c.committeeReview;
  const prosthetistOpinionSaved = !!cr?.prosthetistReviewedAt;
  const physioOpinionSaved = !!cr?.physiotherapistReviewedAt;
  const doctorOpinionSaved = !!cr?.doctorReviewedAt;
  const allOpinionsSaved = prosthetistOpinionSaved && physioOpinionSaved && doctorOpinionSaved;
  // A delivered case is closed for editing — sessions and visits become history.
  const caseLocked = c.status === "DELIVERED";
  const committeeDecided = !!cr?.decidedAt;
  // The decision carries only the user id; employees are linked to users, so the
  // name comes from the staff list. Falls back to nothing when unlinked.
  const decidedByName = (() => {
    if (!cr?.decidedByUserId) return null;
    const emp = staffList.find((e: any) => e.userId === cr.decidedByUserId);
    return emp ? `${emp.firstNameAr ?? ""} ${emp.lastNameAr ?? ""}`.trim() || null : null;
  })();

  // Measurement sheet history per amputation type — newest-first, per backend
  const transtibialRecords: MeasurementAssessment[] = c.transtibialAssessment ?? [];
  const transfemoralRecords: MeasurementAssessment[] = c.transfemoralAssessment ?? [];
  const ankleDisarticulationRecords: MeasurementAssessment[] = c.ankleDisarticulationAssessment ?? [];
  const kneeDisarticulationRecords: MeasurementAssessment[] = c.kneeDisarticulationAssessment ?? [];
  const hemipelvectomyRecords: MeasurementAssessment[] = c.hemipelvectomyAssessment ?? [];
  const elbowDisarticulationRecords: MeasurementAssessment[] = c.elbowDisarticulationAssessment ?? [];
  const transhumeralRecords: MeasurementAssessment[] = c.transhumeralAssessment ?? [];
  const transradialRecords: MeasurementAssessment[] = c.transradialAssessment ?? [];

  // Normalise amputationType (backend may return array OR legacy string)
  const getAmpTypes = (): string[] => {
    const raw = intakeForm.amputationType || c.amputationType;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map((s: any) => String(s).toUpperCase());
    const s = String(raw).toUpperCase();
    if (s === "BOTH") return ["UPPER", "LOWER"];
    return s ? [s] : [];
  };
  const ampTypes = getAmpTypes();

  // ── Full case report PDF (VitaSyr style — replaces the backend report) ────────
  const resolveStaffName = (obj?: any, ...ids: (string | null | undefined)[]): string => {
    if (obj && (obj.firstNameAr || obj.lastNameAr)) return `${obj.firstNameAr ?? ""} ${obj.lastNameAr ?? ""}`.trim();
    for (const sid of ids) {
      const e = staffList.find((x: any) => x.id === sid);
      if (e) return `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim();
    }
    return "";
  };

  const handleExportCasePdf = async () => {
    if (casePdfExporting) return;
    setCasePdfExporting(true);
    try {
      const { downloadProstheticsCasePdf } = await import("@/components/clinic/prosthetics-case-pdf");
      let gaitForms: any[] = [];
      try { gaitForms = await clinicProstheticsApi.getGaitAnalysisForms(id); } catch { /* optional */ }

      const mapAssess = (arr: any[] | undefined, region: string) =>
        (arr ?? []).map((a: any) => ({
          region, side: a.side,
          residualLimbLength: a.residualLimbLength, residualLimbShape: a.residualLimbShape,
          activityLevel: a.activityLevel, painPresent: a.painPresent, painIntensity: a.painIntensity,
          examinedAt: a.examinedAt ?? a.createdAt ?? a.updatedAt ?? null,
          notes: a.notes ?? a.generalHealthNotes ?? null,
        }));

      await downloadProstheticsCasePdf({
        patient: {
          firstName: patientFull?.firstName ?? c.patient?.firstName,
          lastName: patientFull?.lastName ?? c.patient?.lastName,
          patientNumber: patientFull?.patientNumber ?? c.patient?.patientNumber,
          dateOfBirth: patientFull?.dateOfBirth,
          gender: (patientFull as any)?.gender,
          phone: patientFull?.phone,
          heightCm: patientFull?.heightCm,
          weightKg: patientFull?.weightKg,
          bmi: patientFull?.bmi,
        },
        caseId: id,
        status: c.status,
        createdAt: c.createdAt,
        amputation: {
          types: ampTypes,
          side: c.amputationSide,
          level: Array.isArray(c.amputationLevel) ? c.amputationLevel.join("، ") : c.amputationLevel,
          date: c.dateOfAmputation,
          cause: c.causeOfAmputation ?? (c as any).amputationCause,
          causeOther: c.amputationCauseOtherDetail,
          count: c.numberOfAmputations,
        },
        currentlyUsingProsthesis: c.currentlyUsingProsthesis,
        previouslyUsedProsthesis: c.previouslyUsedProsthesis,
        previousProsthesisSystemDetail: c.previousProsthesisSystemDetail,
        clinical: {
          hasChronicDiseases: c.hasChronicDiseases, chronicDiseases: c.chronicDiseases,
          hasPhysicalTherapy: c.hasPhysicalTherapy, physicalTherapyDetails: c.physicalTherapyDetails,
          hasPreviousProsthesis: c.hasPreviousProsthesis, previousProsthesisDetails: c.previousProsthesisDetails,
          previousProsthesisWhen: c.previousProsthesisWhen, previousProsthesisWhere: c.previousProsthesisWhere,
          previousProsthesisType: c.previousProsthesisType,
          hasRevisionSurgery: c.hasRevisionSurgery, revisionDetails: c.revisionDetails,
        },
        team: {
          prosthetist: resolveStaffName(c.prosthetist, c.prosthetistId, c.assignedProsthetistId),
          physiotherapist: resolveStaffName(c.physiotherapist, c.physiotherapistId),
          supervisingDoctor: resolveStaffName(c.supervisingDoctor, c.supervisingDoctorId),
          workshopSupervisor: resolveStaffName(c.workshopSupervisor, c.workshopSupervisorId),
        },
        assessments: [...mapAssess(c.upperAssessment, "طرف علوي"), ...mapAssess(c.lowerAssessment, "طرف سفلي")],
        committee: cr ? {
          prosthetistOpinion: cr.prosthetistOpinion, physiotherapistOpinion: cr.physiotherapistOpinion,
          doctorOpinion: cr.doctorOpinion, committeeHeadOpinion: cr.committeeHeadOpinion,
          expertOpinion: cr.expertOpinion, finalDecision: cr.finalDecision, finalSummary: cr.finalSummary,
        } : null,
        proposed: {
          proposedProstheticType: c.proposedProstheticType, prosthesisType: c.prosthesisType,
          prosthesisCompleted: c.prosthesisCompleted, prosthesisSuitable: c.prosthesisSuitable,
          proposedProsthesisType: c.proposedProsthesisType,
        },
        components: (components ?? []).map((cp: any) => ({
          partName: cp.partName ?? cp.name, partCode: cp.partCode ?? cp.code,
          sourceLocation: cp.sourceLocation ?? cp.source, supplier: cp.supplier,
          reason: cp.reason, requestStatus: cp.inventoryRequest?.status,
        })),
        gait: (gaitForms ?? []).map((g: any) => ({ sessionDate: g.sessionDate, mainProblem: g.mainProblem, symmetry: g.symmetry })),
        finalEval: (finalEvalData as any) ?? null,
        followUps: (followUps ?? []).map((f: any) => ({ date: f.date, notes: f.notes, kLevel: f.kLevel, painLevel: f.painLevel })),
      });
      toast.success("تم تصدير PDF");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`فشل تصدير PDF: ${msg.slice(0, 120)}`);
      console.error("[Case PDF Export]", e);
    } finally {
      setCasePdfExporting(false);
    }
  };

  const patientName = patientFull
    ? `${patientFull.firstName} ${patientFull.lastName}`
    : c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—";

  const buildIntakeDto = () => {
    const hcd = intakeForm.hasChronicDiseases ?? c.hasChronicDiseases ?? false;
    const hpt = intakeForm.hasPhysicalTherapy ?? c.hasPhysicalTherapy ?? false;
    const hpp = intakeForm.hasPreviousProsthesis ?? c.hasPreviousProsthesis ?? false;
    const hrs = intakeForm.hasRevisionSurgery ?? c.hasRevisionSurgery ?? false;
    return {
      amputationType: (() => {
        const raw = intakeForm.amputationType || c.amputationType;
        if (!raw) return undefined;
        if (Array.isArray(raw)) return raw.map((x) => String(x).toUpperCase()) as any;
        const s = String(raw).toUpperCase();
        if (s === "BOTH") return ["UPPER", "LOWER"] as any;
        if (s === "UPPER" || s === "LOWER") return [s] as any;
        return undefined;
      })(),
      amputationSide: (intakeForm.amputationSide || c.amputationSide || undefined) as AmputationSide | undefined,
      // Backend expects an array of level codes (TT, KD, …), not a "/"-joined string.
      amputationLevel: (() => {
        const levels = intakeForm.amputationLevels.length
          ? intakeForm.amputationLevels
          : toAmputationLevels(c.amputationLevel);
        return levels.length ? levels : undefined;
      })(),
      amputationDate: (() => {
        const y = intakeForm.amputationYear;
        if (!y) return c.dateOfAmputation ? c.dateOfAmputation.slice(0, 10) : undefined;
        const m = intakeForm.amputationMonth && intakeForm.amputationMonth !== "0" ? intakeForm.amputationMonth.padStart(2, "0") : "01";
        return `${y}-${m}-01`;
      })(),
      amputationCause: (intakeForm.amputationCause || c.causeOfAmputation || undefined) as AmputationCause | undefined,
      amputationCauseOtherDetail: intakeForm.amputationCause === "OTHER" ? intakeForm.amputationCauseOtherDetail || undefined : undefined,
      amputationCount: intakeForm.amputationCount ? parseInt(intakeForm.amputationCount) : (c.numberOfAmputations ?? undefined),
      appointmentDate: intakeForm.appointmentDate || (c as any).appointmentDate || undefined,
      appointmentTime: intakeForm.appointmentTime || (c as any).appointmentTime || undefined,
      hasChronicDiseases: hcd,
      chronicDiseases: hcd ? (intakeForm.chronicDiseases || c.chronicDiseases || undefined) : undefined,
      hasPhysicalTherapy: hpt,
      physicalTherapyDetails: hpt ? (intakeForm.physicalTherapyDetails || c.physicalTherapyDetails || undefined) : undefined,
      hasPreviousProsthesis: hpp,
      previousProsthesisDetails: hpp ? (intakeForm.previousProsthesisDetails || c.previousProsthesisDetails || undefined) : undefined,
      previousProsthesisWhen: hpp ? (intakeForm.previousProsthesisWhen || c.previousProsthesisWhen || undefined) : undefined,
      previousProsthesisWhere: hpp ? (intakeForm.previousProsthesisWhere || c.previousProsthesisWhere || undefined) : undefined,
      previousProsthesisType: hpp ? (intakeForm.previousProsthesisType || c.previousProsthesisType || undefined) : undefined,
      hasRevisionSurgery: hrs,
      revisionDetails: hrs ? (intakeForm.revisionDetails || c.revisionDetails || undefined) : undefined,
    };
  };

  const handleSavePatient = async () => {
    await updatePatient.mutateAsync({
      id: c.patientId,
      dto: {
        firstName: patientEditForm.firstName || undefined,
        lastName: patientEditForm.lastName || undefined,
        dateOfBirth: patientEditForm.dateOfBirth || undefined,
        phone: patientEditForm.phone || undefined,
        heightCm: patientEditForm.heightCm ? Number(patientEditForm.heightCm) : undefined,
        weightKg: patientEditForm.weightKg ? Number(patientEditForm.weightKg) : undefined,
      },
    });
    // إلغاء cache الحالة أيضاً حتى يتحدث اسم المريض في الهيدر
    qc.invalidateQueries({ queryKey: ["clinic-prosthetics-case", id] });
    setPatientEditMode(false);
  };

  const handleSaveIntake = async () => {
    justSavedRef.current = true;
    await updateCase.mutateAsync({ id, dto: buildIntakeDto() });
  };

  const handleSaveStaff = async () => {
    justSavedRef.current = true;
    // The case stores one staff member per role in singular id fields
    // (prosthetistId …) — send those, not the plural arrays the backend ignores.
    await updateCase.mutateAsync({
      id,
      dto: {
        prosthetistId: staffForm.prosthetistIds[0] || null,
        physiotherapistId: staffForm.physiotherapistIds[0] || null,
        supervisingDoctorId: staffForm.supervisingDoctorIds[0] || null,
      } as any,
    });
  };
  const toggleStaffMember = (key: keyof typeof staffForm, empId: string) =>
    setStaffForm((f) => ({ ...f, [key]: (f[key] as string[]).includes(empId) ? (f[key] as string[]).filter((x) => x !== empId) : [...(f[key] as string[]), empId] }));

  // Names of the staff chosen in the assessment tab — reused on the committee tab.
  const staffNamesOf = (key: keyof typeof staffForm) =>
    (staffForm[key] as string[])
      .map((empId) => { const e = staffList.find((x) => x.id === empId); return e ? `${e.firstNameAr} ${e.lastNameAr}` : null; })
      .filter(Boolean)
      .join("، ");

  // Who actually filled a committee opinion — the backend returns the author with
  // each opinion, which is more accurate than the staff assigned to the case.
  const committeeAuthorName = (user?: { firstNameAr?: string | null; lastNameAr?: string | null } | null) => {
    const name = `${user?.firstNameAr ?? ""} ${user?.lastNameAr ?? ""}`.trim();
    return name || null;
  };

  const handleSaveIntakeAndAdvance = async () => {
    justSavedRef.current = true;
    await updateCase.mutateAsync({ id, dto: buildIntakeDto() });
    await updateStatus.mutateAsync({ id, status: "ASSESSMENT" });
  };

  const buildUpperDto = (form = upperAssessForm, overrideSide?: "RIGHT" | "LEFT") => {
    const f = form;
    const side = overrideSide ?? (f.amputationSide === "BILATERAL" ? f.side : (f.amputationSide as "LEFT" | "RIGHT") || f.side);
    return {
      side,
      residualLimbLength: (f.residualLimbLength as any) || undefined,
      residualLimbShape: (f.residualLimbShape as any) || undefined,
      amputationLevelNote: f.amputationLevelNote || undefined,
      painPresent: f.painPresent ?? undefined,
      painIntensity: f.painPresent ? f.painIntensity : undefined,
      painTypes: f.painPresent && f.painTypes.length ? f.painTypes as any : undefined,
      painTypeOtherDetail: f.painTypes.includes("OTHER") ? f.painTypeOtherDetail || undefined : undefined,
      phantomPainPresent: f.phantomPainPresent ?? undefined,
      phantomPainIntensity: f.phantomPainPresent ? f.phantomPainIntensity : undefined,
      neuromaPalpable: f.neuromaPalpable ?? undefined,
      skinNotes: f.skinNotes || undefined,
      skinAppearance: f.skinAppearance.length ? f.skinAppearance as any : undefined,
      skinColor: f.skinColor.length ? f.skinColor as any : undefined,
      skinTemperature: (f.skinTemperature as any) || undefined,
      scarCondition: f.scarCondition.length ? f.scarCondition as any : undefined,
      hasSkinGrafts: f.hasSkinGrafts,
      graftArea: f.hasSkinGrafts ? f.graftArea || undefined : undefined,
      closureNotes: f.closureNotes || undefined,
      generalHealthNotes: f.generalHealthNotes || undefined,
      otherLimbCondition: f.otherLimbCondition || undefined,
      canBalanceOneSide: f.canBalanceOneSide,
      usesCompressionBandage: f.usesCompressionBandage,
      jointsRangeOfMotion: (f.jointsRangeOfMotion as any) || undefined,
      activityLevel: (f.activityLevel as any) || undefined,
      neuromaPresent: f.neuromaPresent ?? undefined,
      usesProstheticLimb: genAssessForm.currentlyUsingProsthesis ?? undefined,
      prostheticLimbType: genAssessForm.currentlyUsingProsthesis === true ? f.prostheticLimbType || undefined : undefined,
      romData: (() => {
        const noGrade = new Set(UPPER_ROM_MOVES.filter((m) => !m.hasGrade).map((m) => m.key));
        const result: Record<string, any> = {};
        for (const [key, val] of Object.entries(f.romData)) {
          const entry: any = { selected: val.selected };
          if (!noGrade.has(key) && val.grade) entry.grade = val.grade;
          result[key] = entry;
        }
        return Object.keys(result).length > 0 ? result : undefined;
      })(),
      examinerProsthetistIds: [],
      examinerPhysioIds: [],
      examinerSupervisorIds: [],
    };
  };

  const buildLowerDto = (form = lowerAssessForm, overrideSide?: "RIGHT" | "LEFT") => {
    const f = form;
    const side = overrideSide ?? (f.amputationSide === "BILATERAL" ? f.side : (f.amputationSide as "LEFT" | "RIGHT") || f.side);
    return {
      side,
      residualLimbLength: (f.residualLimbLength as any) || undefined,
      residualLimbShape: (f.residualLimbShape as any) || undefined,
      amputationLevelNote: f.amputationLevelNote || undefined,
      painPresent: f.painPresent ?? undefined,
      painIntensity: f.painPresent ? f.painIntensity : undefined,
      painArea: f.painPresent ? f.painArea || undefined : undefined,
      painTypes: f.painPresent && f.painTypes.length ? f.painTypes as any : undefined,
      painTypeOtherDetail: f.painTypes.includes("OTHER") ? f.painTypeOtherDetail || undefined : undefined,
      phantomPainPresent: f.phantomPainPresent ?? undefined,
      phantomPainIntensity: f.phantomPainPresent ? f.phantomPainIntensity : undefined,
      neuromaPalpable: f.neuromaPalpable ?? undefined,
      loadTolerance: (f.loadTolerance as any) || undefined,
      weightBearingLevel: f.loadTolerance === "WEIGHT_BEARING" ? (f.weightBearingLevel as any) || undefined : undefined,
      notes: f.notes || undefined,
      skinAppearance: f.skinAppearance.length ? f.skinAppearance as any : undefined,
      skinColor: f.skinColor.length ? f.skinColor as any : undefined,
      skinTemperature: (f.skinTemperature as any) || undefined,
      scarCondition: f.scarCondition.length ? f.scarCondition as any : undefined,
      hasSkinGrafts: f.hasSkinGrafts,
      graftArea: f.hasSkinGrafts ? f.graftArea || undefined : undefined,
      generalHealthNotes: f.generalHealthNotes || undefined,
      otherLimbCondition: f.otherLimbCondition || undefined,
      usesAssistiveDevices: f.usesAssistiveDevices ?? undefined,
      assistiveDeviceTypes: f.usesAssistiveDevices ? f.assistiveDeviceTypes || undefined : undefined,
      canClimbStairs: f.canClimbStairs ?? undefined,
      canBalanceOneSide: f.canBalanceOneSide ?? undefined,
      jointsRangeOfMotion: (ampTypes.includes("UPPER") ? (upperAssessForm.jointsRangeOfMotion as any) : (f.jointsRangeOfMotion as any)) || undefined,
      activityLevel: (ampTypes.includes("UPPER") ? (upperAssessForm.activityLevel as any) : (f.activityLevel as any)) || undefined,
      usesProstheticLimb: genAssessForm.currentlyUsingProsthesis ?? undefined,
      prostheticLimbType: genAssessForm.currentlyUsingProsthesis === true ? f.prostheticLimbType || undefined : undefined,
      romData: (() => {
        const noGrade = new Set(LOWER_ROM_MOVES.filter((m) => !m.hasGrade).map((m) => m.key));
        const result: Record<string, any> = {};
        for (const [key, val] of Object.entries(f.romData)) {
          const entry: any = { selected: val.selected };
          if (!noGrade.has(key) && val.grade) entry.grade = val.grade;
          result[key] = entry;
        }
        return Object.keys(result).length > 0 ? result : undefined;
      })(),
      muscleMotionNotes: f.muscleMotionNotes || undefined,
      examinerProsthetistIds: [],
      examinerPhysioIds: [],
      examinerSupervisorIds: [],
    };
  };

  const handleSaveGeneralAssessment = async () => {
    justSavedRef.current = true;
    await updateCase.mutateAsync({
      id,
      dto: {
        amputationDate: (() => {
          const y = genAssessForm.amputationYear;
          if (!y) return undefined;
          const m = genAssessForm.amputationMonth && genAssessForm.amputationMonth !== "0" ? genAssessForm.amputationMonth.padStart(2, "0") : "01";
          return `${y}-${m}-01`;
        })(),
        amputationCause: (genAssessForm.amputationCause as any) || undefined,
        amputationCauseOtherDetail: genAssessForm.amputationCause === "OTHER" ? genAssessForm.amputationCauseOtherDetail || undefined : undefined,
        clinicalHistory: (genAssessForm.clinicalHistory as any) || undefined,
        moreAffectedSide: (genAssessForm.moreAffectedSide as any) || undefined,
        currentlyUsingProsthesis: genAssessForm.currentlyUsingProsthesis ?? undefined,
        previouslyUsedProsthesis: genAssessForm.currentlyUsingProsthesis === false ? (genAssessForm.previouslyUsedProsthesis ?? undefined) : undefined,
        previousProsthesisSystemDetail: genAssessForm.previouslyUsedProsthesis === true ? genAssessForm.previousProsthesisSystemDetail || undefined : undefined,
      },
    });
  };

  const handleSubmitUpperAssessment = async () => {
    await handleSaveGeneralAssessment();
    if (upperAssessForm.amputationSide === "BILATERAL") {
      await submitAssessmentUpper.mutateAsync({ id, dto: buildUpperDto(upperAssessForm, "RIGHT") });
      await submitAssessmentUpper.mutateAsync({ id, dto: buildUpperDto(upperAssessFormLeft, "LEFT") });
    } else {
      await submitAssessmentUpper.mutateAsync({ id, dto: buildUpperDto() });
    }
  };

  const handleSubmitLowerAssessment = async () => {
    await handleSaveGeneralAssessment();
    if (lowerAssessForm.amputationSide === "BILATERAL") {
      await submitAssessmentLower.mutateAsync({ id, dto: buildLowerDto(lowerAssessForm, "RIGHT") });
      await submitAssessmentLower.mutateAsync({ id, dto: buildLowerDto(lowerAssessFormLeft, "LEFT") });
    } else {
      await submitAssessmentLower.mutateAsync({ id, dto: buildLowerDto() });
    }
  };

  // One button for the whole assessment tab: treating team, general assessment and
  // the limb sheets are saved together, then the case moves to committee review.
  const handleSubmitAssessmentAndAdvance = async () => {
    justSavedRef.current = true;
    await handleSaveStaff();
    await handleSaveGeneralAssessment();
    // Only save an assessment that hasn't been saved yet; re-POSTing an existing
    // case+side hits a unique constraint (500). Tolerate a duplicate either way so
    // the case still advances to committee review.
    const submitIfNew = async (saved: boolean, fn: () => Promise<unknown>) => {
      if (saved) return;
      try {
        await fn();
      } catch (e: any) {
        const msg = e?.response?.data?.message || "";
        if (e?.response?.status !== 409 && !/unique constraint/i.test(msg)) throw e;
      }
    };
    if (ampTypes.includes("UPPER")) {
      await submitIfNew(upperSaved, handleSubmitUpperAssessment);
    }
    if (ampTypes.includes("LOWER")) {
      await submitIfNew(lowerSaved, handleSubmitLowerAssessment);
    }
    // The committee stage has no status of its own — the case stays "معاينة".
    await updateStatus.mutateAsync({ id, status: STATUS_BY_TAB.committee_review });
  };

  const handleSubmitOpinion = async (role: "PROSTHETIST" | "PHYSIOTHERAPIST" | "DOCTOR", opinion: string) => {
    await submitOpinion.mutateAsync({ id, dto: { role, opinion } });
  };

  const handleSaveCommitteeAll = async () => {
    // An opinion can be submitted only once; re-submitting returns 409. Skip any
    // already-submitted role so the others (and the decision) still go through.
    const submitIfNew = async (role: "PROSTHETIST" | "PHYSIOTHERAPIST" | "DOCTOR", opinion: string) => {
      if (!opinion.trim()) return;
      try {
        await submitOpinion.mutateAsync({ id, dto: { role, opinion } });
      } catch (e: any) {
        if (e?.response?.status !== 409) throw e;
      }
    };
    await submitIfNew("PROSTHETIST", prosthetistOpinion);
    await submitIfNew("PHYSIOTHERAPIST", physioOpinion);
    await submitIfNew("DOCTOR", doctorOpinion);
    if (decisionForm.finalSummary.trim()) await handleSubmitDecision();
  };

  const handleSubmitDecision = async () => {
    // finalSummary is required by PUT /committee/decide — fail here with a clear
    // message instead of letting the request come back 400.
    if (!decisionForm.finalSummary.trim()) {
      toast.error(t("committee.summaryRequired"));
      return;
    }
    const suitDto: Record<string, any> = {};
    if (committeeSuitForm.prosthesisSuitable !== null) {
      suitDto.prosthesisSuitable = committeeSuitForm.prosthesisSuitable;
      suitDto.proposedProsthesisType = committeeSuitForm.prosthesisSuitable
        ? (committeeSuitForm.proposedProsthesisType || null)
        : null;
    }
    if (Object.keys(suitDto).length) {
      await updateCase.mutateAsync({ id, dto: suitDto });
    }
    await submitDecision.mutateAsync({
      id,
      dto: { decision: "APPROVED" as CommitteeDecision, finalSummary: decisionForm.finalSummary },
    });
  };

  const handleExportPledgePdf = async () => {
    if (pledgePdfLoading) return;
    setPledgePdfLoading(true);
    try {
      const { downloadPledgeFormPdf } = await import("@/components/clinic/pledge-form-pdf");
      await downloadPledgeFormPdf({
        patientName: patientFull ? `${patientFull.firstName} ${patientFull.lastName}` : patientName,
        signatureUrl: pledgeSignature || undefined,
      });
    } catch {
      toast.error(t("finalDelivery.pledge.exportFailed"));
    } finally {
      setPledgePdfLoading(false);
    }
  };

  const handleSign = async (base64: string) => {
    await signDecision.mutateAsync({ id, role: signRole, signatureUrl: base64 });
  };

  const supplierValue = () =>
    compShared.supplier === "OTTOBOCK" ? "OTTOBOCK" : compShared.supplierOther.trim() || undefined;

  const handleAddComponents = async () => {
    const filled = compRows.filter((r) => r.inventoryItemId);
    if (!filled.length) return;
    // Scenario 1 — parts picked from the inventory catalog.
    for (const row of filled) {
      const item = inventoryItems.find((it: any) => it.id === row.inventoryItemId);
      if (!item) continue;
      await addComponent.mutateAsync({
        id,
        dto: {
          inventoryItemId: item.id,
          partCode: item.code ?? item.partCode ?? "",
          partName: item.name ?? "",
          supplier: supplierValue(),
          sourceLocation: compShared.sourceLocation,
        },
      });
    }
    setCompRows(Array.from({ length: 10 }, () => ({ inventoryItemId: "" })));
    // Saving the parts closes the fitting stage — move the case to "أخذ قياس"
    // and open the measurement-sheet tab.
    await updateStatus.mutateAsync({ id, status: STATUS_BY_TAB.measurement_sheet });
    setStageTab("measurement_sheet");
  };

  // Scenario 2 — save a free-text part entered in the "add new item" dialog.
  const handleAddCustomPart = async () => {
    const name = customPartDialog.name.trim();
    const code = customPartDialog.code.trim();
    if (!name || !code) return;
    await addComponent.mutateAsync({
      id,
      dto: {
        partCode: code,
        partName: name,
        supplier: supplierValue(),
        sourceLocation: compShared.sourceLocation,
      },
    });
    setCustomPartDialog({ open: false, name: "", code: "" });
  };

  const handleAdvanceToGait = async () => {
    await updateStatus.mutateAsync({ id, status: STATUS_BY_TAB.gait_analysis });
  };

  const handleSubmitGait = async () => {
    await submitGait.mutateAsync({
      id,
      dto: {
        clinicalConclusion: gaitForm.clinicalConclusion || undefined,
        recommendations: gaitForm.recommendations || undefined,
        treatmentPlan: gaitForm.treatmentPlan || undefined,
      },
    });
    await updateStatus.mutateAsync({ id, status: STATUS_BY_TAB.final_evaluation });
  };

  const handleMarkDelivered = async () => {
    await updateStatus.mutateAsync({ id, status: "DELIVERED" });
  };


  const handleAddConsumable = () => {
    if (!consumableForm.name.trim()) return;
    setConsumables((prev) => [...prev, { ...consumableForm }]);
    setConsumableForm({ name: "", quantity: "1", unit: "", notes: "" });
  };

  const handleSaveConsumables = async () => {
    for (const c of consumables) {
      await addConsumable.mutateAsync({ id, dto: { name: c.name, quantity: parseInt(c.quantity) || 1, unit: c.unit || undefined, notes: c.notes || undefined } });
    }
    setConsumables([]);
  };

  const handleSubmitFinalEval = async () => {
    const { managerNotes, patientFileComplete, ...dto } = finalEvalForm;
    await submitFinalEval.mutateAsync({ id, dto: {
      ...dto,
      supervisorId: dto.supervisorId || undefined,
      fittingDate: dto.fittingDate || undefined,
      socksDelivered: dto.socksDelivered ?? undefined,
      linersDelivered: dto.linersDelivered ?? undefined,
    }});
  };

  const handleSignFinalEval = async (sig: string) => {
    await signFinalEval.mutateAsync({ id, dto: {
      signatureBase64: sig,
      medicalDirectorNotes: finalEvalForm.medicalDirectorNotes || undefined,
      managerNotes: finalEvalForm.managerNotes || undefined,
      patientFileComplete: finalEvalForm.patientFileComplete || undefined,
    }});
    await updateStatus.mutateAsync({ id, status: "DELIVERED" });
  };

  const handleMedicalDirectorSignatureClick = async () => {
    const empId = proDeliveryHeader.medicalDirectorId;
    if (!empId) { toast.error("اختر المدير الطبي أولاً"); return; }
    try {
      const sig = await clinicProstheticsApi.getEmployeeSignature(empId);
      if (sig.hasSignature && sig.signatureUrl) {
        const url = sig.signatureUrl.startsWith("http") ? sig.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${sig.signatureUrl}`;
        setProDeliveryHeader((f) => ({ ...f, medicalDirectorSignatureUrl: url, medicalDirectorSignedAt: new Date().toISOString() }));
      } else {
        setTimeout(() => medicalDirectorSigRef.current?.click(), 50);
      }
    } catch { toast.error("فشل جلب بيانات التوقيع"); }
  };

  const handleMedicalDirectorSigFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const empId = proDeliveryHeader.medicalDirectorId;
    if (!empId) return;
    try {
      const res = await clinicProstheticsApi.uploadEmployeeSignature(empId, file);
      const url = res.signatureUrl.startsWith("http") ? res.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${res.signatureUrl}`;
      setProDeliveryHeader((f) => ({ ...f, medicalDirectorSignatureUrl: url, medicalDirectorSignedAt: new Date().toISOString() }));
      toast.success("تم رفع التوقيع");
    } catch { toast.error("فشل رفع التوقيع"); }
    e.target.value = "";
  };

  // ── Final delivery: CEO signature ──
  const handleFinalCeoSignatureClick = async () => {
    const empId = finalDeliveryHeader.ceoId;
    if (!empId) { toast.error("اختر المدير التنفيذي أولاً"); return; }
    try {
      const sig = await clinicProstheticsApi.getEmployeeSignature(empId);
      if (sig.hasSignature && sig.signatureUrl) {
        const url = sig.signatureUrl.startsWith("http") ? sig.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${sig.signatureUrl}`;
        setFinalDeliveryHeader((f) => ({ ...f, ceoSignatureUrl: url }));
      } else {
        setTimeout(() => finalCeoSigRef.current?.click(), 50);
      }
    } catch { toast.error("فشل جلب بيانات التوقيع"); }
  };

  const handleFinalCeoSigFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const empId = finalDeliveryHeader.ceoId;
    if (!empId) return;
    try {
      const res = await clinicProstheticsApi.uploadEmployeeSignature(empId, file);
      const url = res.signatureUrl.startsWith("http") ? res.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${res.signatureUrl}`;
      setFinalDeliveryHeader((f) => ({ ...f, ceoSignatureUrl: url }));
      toast.success("تم رفع التوقيع");
    } catch { toast.error("فشل رفع التوقيع"); }
    e.target.value = "";
  };

  const handleFinalEvalManagerSigClick = async () => {
    const empId = finalEvalForm.managerId;
    if (!empId) { toast.error("اختر المدير أولاً"); return; }
    try {
      const sig = await clinicProstheticsApi.getEmployeeSignature(empId);
      if (sig.hasSignature && sig.signatureUrl) {
        const url = sig.signatureUrl.startsWith("http") ? sig.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${sig.signatureUrl}`;
        setFinalEvalForm((f) => ({ ...f, managerSignatureUrl: url }));
      } else {
        setTimeout(() => finalEvalManagerSigRef.current?.click(), 50);
      }
    } catch { toast.error("فشل جلب التوقيع"); }
  };

  const handleFinalEvalManagerSigFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const empId = finalEvalForm.managerId;
    if (!empId) return;
    try {
      const res = await clinicProstheticsApi.uploadEmployeeSignature(empId, file);
      const url = res.signatureUrl.startsWith("http") ? res.signatureUrl : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${res.signatureUrl}`;
      setFinalEvalForm((f) => ({ ...f, managerSignatureUrl: url }));
      toast.success("تم رفع التوقيع");
    } catch { toast.error("فشل رفع التوقيع"); }
    e.target.value = "";
  };

  const handleSubmitDelivery = async () => {
    await submitDelivery.mutateAsync({ id, dto: { deliveryDate: deliveryForm.deliveryDate, notes: deliveryForm.notes || undefined } });
  };

  const handleSignDelivery = async (sig: string) => {
    await signDelivery.mutateAsync({ id, signature: sig });
    await updateStatus.mutateAsync({ id, status: "FOLLOW_UP" });
  };

  const handleAddFollowUp = async () => {
    if (!followUpForm.notes.trim()) return;
    await addFollowUp.mutateAsync({
      id,
      dto: {
        date: followUpForm.date,
        notes: followUpForm.notes,
        kLevel: followUpForm.kLevel || undefined,
        painLevel: followUpForm.painLevel ? parseInt(followUpForm.painLevel) : undefined,
      },
    });
    setFollowUpForm({ date: new Date().toISOString().slice(0, 10), notes: "", kLevel: null, painLevel: "" });
  };

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => c.patientId ? router.push(`/${locale}/clinic/patients/${c.patientId}`) : router.back()}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {patientName}
            {c.patient?.patientNumber && <span className="font-mono">— {c.patient.patientNumber}</span>}
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">حالة أطراف صناعية</h1>
            <CaseStatusBadge status={c.status} />
            {caseLocked && <SavedBadge />}
            {ampTypes.map((t) => <Badge key={t} variant="outline">{TYPE_LABEL[t] ?? t}</Badge>)}
            {c.amputationSide && <Badge variant="outline">{SIDE_LABEL[c.amputationSide]}</Badge>}
          </div>
          <StepIndicator status={c.status} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCasePdf} disabled={casePdfExporting}>
            {casePdfExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {casePdfExporting ? "جاري التصدير..." : "تصدير PDF"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                تغيير الحالة <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["CLOSED", "CANCELLED"] as ProstheticsStatus[]).map((s) => (
                <DropdownMenuItem key={s} onClick={() => updateStatus.mutate({ id, status: s })}>
                  {s === "CLOSED" ? "إغلاق الحالة" : "إلغاء الحالة"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs by workflow stage */}
      <Tabs
        value={stageTab ?? (c.status === "CANCELLED" || c.status === "CLOSED"
          ? "timeline"
          : TAB_BY_STATUS[c.status] ?? "intake")}
        onValueChange={setStageTab}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <TabsList className="flex-wrap h-auto gap-1 w-full justify-start" dir={isRtl ? "rtl" : "ltr"}>
          <TabsTrigger value="intake" className="text-sm py-1.5">الاستقبال</TabsTrigger>
          <TabsTrigger value="patient_info" className="text-sm py-1.5">معلومات المريض</TabsTrigger>
          <TabsTrigger value="assessment" className="text-sm py-1.5">معلومات التقييم</TabsTrigger>
          <TabsTrigger value="committee_review" className="text-sm py-1.5">اللجنة</TabsTrigger>
          <TabsTrigger value="fitting" className="text-sm py-1.5">التركيب</TabsTrigger>
          <TabsTrigger value="measurement_sheet" className="text-sm py-1.5">ورق القياس</TabsTrigger>
          <TabsTrigger value="treatment_program" className="text-sm py-1.5">المتابعة</TabsTrigger>
          <TabsTrigger value="delivered" className="text-sm py-1.5">التسليم التجريبي</TabsTrigger>
          <TabsTrigger value="gait_analysis" className="text-sm py-1.5">تحليل المشي</TabsTrigger>
          {ampTypes.includes("LOWER") && <TabsTrigger value="balance_assessment" className="text-sm py-1.5">التوازن</TabsTrigger>}
          <TabsTrigger value="final_evaluation" className="text-sm py-1.5">التقييم النهائي</TabsTrigger>
          <TabsTrigger value="final_delivery" className="text-sm py-1.5">التسليم النهائي</TabsTrigger>
          <TabsTrigger value="timeline" className="text-sm py-1.5">السجل الزمني</TabsTrigger>
        </TabsList>

        {/* ── INTAKE ──────────────────────────────────────────────────────── */}
        <TabsContent value="intake" className="mt-4" dir={isRtl ? "rtl" : "ltr"}>
          <fieldset disabled={caseLocked} className="min-w-0">

          <div>
          <Section title={t("intake.title")}>
            <div className="space-y-5">

              {/* 1. هل يوجد أمراض مزمنة */}
              {(() => {
                const val = intakeForm.hasChronicDiseases ?? c.hasChronicDiseases ?? false;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">{t("intake.hasChronic")}</Label>
                      <Switch checked={!!val} onCheckedChange={(v) => setIntakeForm((f) => ({ ...f, hasChronicDiseases: v, chronicDiseases: v ? f.chronicDiseases : "" }))} />
                    </div>
                    {val && (
                      <div className="space-y-1.5">
                        <Label className="text-sm text-muted-foreground">{t("intake.diseaseName")}</Label>
                        <Input value={intakeForm.chronicDiseases || c.chronicDiseases || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, chronicDiseases: e.target.value }))} placeholder={t("intake.diseaseNamePlaceholder")} />
                      </div>
                    )}
                  </div>
                );
              })()}

              <Separator />

              {/* 2. سبب الإصابة + تاريخ البتر */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("intake.injuryCause")}</Label>
                  <Select
                    value={intakeForm.amputationCause || c.causeOfAmputation || ""}
                    onValueChange={(v) => setIntakeForm((f) => ({ ...f, amputationCause: v, amputationCauseOtherDetail: "" }))}
                  >
                    <SelectTrigger><SelectValue placeholder={t("intake.chooseCause")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WAR_INJURY">{t("intake.cause.WAR_INJURY")}</SelectItem>
                      <SelectItem value="TRAFFIC_ACCIDENT">{t("intake.cause.TRAFFIC_ACCIDENT")}</SelectItem>
                      <SelectItem value="DIABETES">{t("intake.cause.DIABETES")}</SelectItem>
                      <SelectItem value="VASCULAR_DISEASE">{t("intake.cause.VASCULAR_DISEASE")}</SelectItem>
                      <SelectItem value="CONGENITAL">{t("intake.cause.CONGENITAL")}</SelectItem>
                      <SelectItem value="INFECTION">{t("intake.cause.INFECTION")}</SelectItem>
                      <SelectItem value="TUMOR">{t("intake.cause.TUMOR")}</SelectItem>
                      <SelectItem value="WORK_INJURY">{t("intake.cause.WORK_INJURY")}</SelectItem>
                      <SelectItem value="OTHER">{t("intake.cause.OTHER")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {(intakeForm.amputationCause || c.causeOfAmputation) === "OTHER" && (
                    <Input
                      className="mt-1"
                      placeholder={t("intake.pleaseSpecify")}
                      value={intakeForm.amputationCauseOtherDetail}
                      onChange={(e) => setIntakeForm((f) => ({ ...f, amputationCauseOtherDetail: e.target.value }))}
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("assess.amputationDate")}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={t("assess.year")}
                      min={1900} max={2100}
                      className="w-24"
                      value={intakeForm.amputationYear}
                      onChange={(e) => setIntakeForm((f) => ({ ...f, amputationYear: e.target.value }))}
                    />
                    <Select
                      value={intakeForm.amputationMonth}
                      onValueChange={(v) => setIntakeForm((f) => ({ ...f, amputationMonth: v }))}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder={t("intake.monthOptional")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">{t("assess.noMonth")}</SelectItem>
                        {MONTH_NUMBERS.map((i) => (
                          <SelectItem key={i} value={String(i)}>{tMonth(String(i))}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 3. عدد البتور */}
              <div className="space-y-1.5">
                <Label>{t("intake.amputationCount")}</Label>
                <div className="flex gap-5">
                  {["1", "2", "3", "4"].map((n) => {
                    const cur = intakeForm.amputationCount || "1";
                    const selected = cur === n;
                    return (
                      <button key={n} type="button"
                        onClick={() => setIntakeForm((f) => ({ ...f, amputationCount: n }))}
                        className="flex items-center gap-1.5 group">
                        <div className={`h-3.5 w-3.5 shrink-0 rounded-none border flex items-center justify-center transition-colors ${selected ? "border-primary bg-primary" : "border-muted-foreground group-hover:border-primary/60"}`}>
                          {selected && (
                            <svg viewBox="0 0 10 10" className="h-2 w-2 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="1.5,5 4,7.5 8.5,2.5" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium">{n}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. جانب الاصابة */}
              <div className="space-y-1.5">
                <Label>{t("intake.injurySide")}</Label>
                <div className="flex gap-5">
                  {([["RIGHT", t("intake.sideRight")], ["LEFT", t("intake.sideLeft")], ["BILATERAL", t("intake.sideBilateral")]] as const).map(([val, label]) => {
                    const cur = intakeForm.amputationSide || c.amputationSide || "";
                    const selected = cur === val;
                    return (
                      <button key={val} type="button"
                        onClick={() => setIntakeForm((f) => ({ ...f, amputationSide: val }))}
                        className="flex items-center gap-1.5 group">
                        <div className={`h-3.5 w-3.5 shrink-0 rounded-none border flex items-center justify-center transition-colors ${selected ? "border-primary bg-primary" : "border-muted-foreground group-hover:border-primary/60"}`}>
                          {selected && (
                            <svg viewBox="0 0 10 10" className="h-2 w-2 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="1.5,5 4,7.5 8.5,2.5" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. نوع البتر */}
              <div className="space-y-1.5">
                <Label>{t("intake.amputationTypeLabel")}</Label>
                <div className="flex gap-5">
                  {([["UPPER", t("intake.typeUpper")], ["LOWER", t("intake.typeLower")]] as const).map(([val, label]) => {
                    const selected = ampTypes.includes(val);
                    return (
                      <button key={val} type="button"
                        onClick={() => {
                          const isUpper = ampTypes.includes("UPPER");
                          const isLower = ampTypes.includes("LOWER");
                          const newUpper = val === "UPPER" ? !isUpper : isUpper;
                          const newLower = val === "LOWER" ? !isLower : isLower;
                          const next = newUpper && newLower ? "BOTH" : newUpper ? "UPPER" : newLower ? "LOWER" : "";
                          setIntakeForm((f) => ({ ...f, amputationType: next as any, amputationLevels: [] }));
                        }}
                        className="flex items-center gap-1.5 group">
                        <div className={`h-3.5 w-3.5 shrink-0 rounded-none border flex items-center justify-center transition-colors ${selected ? "border-primary bg-primary" : "border-muted-foreground group-hover:border-primary/60"}`}>
                          {selected && (
                            <svg viewBox="0 0 10 10" className="h-2 w-2 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="1.5,5 4,7.5 8.5,2.5" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. مستوى البتر */}
              <div className="space-y-1.5">
                <Label>{t("intake.amputationLevel")}</Label>
                <AmputationLevelSelector
                  type={intakeForm.amputationType || (ampTypes.length === 2 ? "BOTH" : ampTypes[0] ?? "")}
                  values={intakeForm.amputationLevels.length ? intakeForm.amputationLevels : toAmputationLevels(c.amputationLevel)}
                  onChange={(v) => setIntakeForm((f) => ({ ...f, amputationLevels: v }))}
                />
              </div>

              <Separator />

              {/* 7. هل خضع لجلسات علاج فيزيائي سابقاً */}
              {(() => {
                const val = intakeForm.hasPhysicalTherapy ?? c.hasPhysicalTherapy ?? false;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">{t("intake.hadPhysio")}</Label>
                      <Switch checked={!!val} onCheckedChange={(v) => setIntakeForm((f) => ({ ...f, hasPhysicalTherapy: v, physicalTherapyDetails: v ? f.physicalTherapyDetails : "" }))} />
                    </div>
                    {val && (
                      <div className="space-y-1.5">
                        <Label className="text-sm text-muted-foreground">{t("intake.clarification")}</Label>
                        <Input value={intakeForm.physicalTherapyDetails || c.physicalTherapyDetails || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, physicalTherapyDetails: e.target.value }))} placeholder={t("intake.physioDetailsPlaceholder")} />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 8. هل سبق أن ركّب طرفاً صناعياً */}
              {(() => {
                const val = intakeForm.hasPreviousProsthesis ?? c.hasPreviousProsthesis ?? false;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">{t("intake.hadProsthesis")}</Label>
                      <Switch checked={!!val} onCheckedChange={(v) => setIntakeForm((f) => ({ ...f, hasPreviousProsthesis: v, previousProsthesisDetails: v ? f.previousProsthesisDetails : "", previousProsthesisWhen: v ? f.previousProsthesisWhen : "", previousProsthesisWhere: v ? f.previousProsthesisWhere : "", previousProsthesisType: v ? f.previousProsthesisType : "" }))} />
                    </div>
                    {val && (
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm text-muted-foreground">{t("intake.clarification")}</Label>
                          <Input value={intakeForm.previousProsthesisDetails || c.previousProsthesisDetails || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, previousProsthesisDetails: e.target.value }))} placeholder={t("intake.prevProsthesisPlaceholder")} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-sm text-muted-foreground">{t("intake.when")}</Label>
                            <Input value={intakeForm.previousProsthesisWhen || c.previousProsthesisWhen || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, previousProsthesisWhen: e.target.value }))} placeholder={t("intake.yearOrDate")} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm text-muted-foreground">{t("intake.where")}</Label>
                            <Input value={intakeForm.previousProsthesisWhere || c.previousProsthesisWhere || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, previousProsthesisWhere: e.target.value }))} placeholder={t("intake.placeOrCenter")} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm text-muted-foreground">{t("intake.prosthesisTypeField")}</Label>
                            <Input value={intakeForm.previousProsthesisType || c.previousProsthesisType || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, previousProsthesisType: e.target.value }))} placeholder={t("intake.prosthesisTypePlaceholder")} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 9. هل خضع لعملية تصحيح بتر */}
              {(() => {
                const val = intakeForm.hasRevisionSurgery ?? c.hasRevisionSurgery ?? false;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">{t("intake.hadRevision")}</Label>
                      <Switch checked={!!val} onCheckedChange={(v) => setIntakeForm((f) => ({ ...f, hasRevisionSurgery: v, revisionDetails: v ? f.revisionDetails : "" }))} />
                    </div>
                    {val && (
                      <div className="space-y-1.5">
                        <Label className="text-sm text-muted-foreground">{t("intake.clarification")}</Label>
                        <Input value={intakeForm.revisionDetails || c.revisionDetails || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, revisionDetails: e.target.value }))} placeholder={t("intake.revisionPlaceholder")} />
                      </div>
                    )}
                  </div>
                );
              })()}

              <Separator />

              {/* تاريخ ووقت الموعد */}
              <div className="space-y-1.5">
                <Label className="text-base">{t("intake.appointmentDateTime")}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">{t("intake.date")}</Label>
                    <Input type="date" value={intakeForm.appointmentDate || (c as any).appointmentDate || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, appointmentDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">{t("intake.time")}</Label>
                    <Input type="time" value={intakeForm.appointmentTime || (c as any).appointmentTime || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, appointmentTime: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveIntake} disabled={updateCase.isPending} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                  {updateCase.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                  {t("intake.save")}
                </Button>
                {c.status === "INTAKE" && (
                  <Button onClick={handleSaveIntakeAndAdvance} disabled={updateCase.isPending || updateStatus.isPending} className="flex-1">
                    {(updateCase.isPending || updateStatus.isPending) ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                    {t("intake.saveAndAdvance")}
                  </Button>
                )}
              </div>
            </div>
          </Section>
          </div>
          </fieldset>
        </TabsContent>

        {/* ── PATIENT INFO ─────────────────────────────────────────────────── */}
        <TabsContent value="patient_info" className="mt-4" dir="rtl">
          <fieldset disabled={caseLocked} className="min-w-0">
          <Section
            title={t("patientInfo.title")}
            action={
              <Button
                size="sm"
                variant={patientEditMode ? "outline" : "default"}
                className={patientEditMode ? "" : "bg-orange-500 hover:bg-orange-600 text-white"}
                onClick={() => {
                  if (!patientEditMode) {
                    setPatientEditForm({
                      firstName: patientFull?.firstName ?? "",
                      lastName: patientFull?.lastName ?? "",
                      dateOfBirth: patientFull?.dateOfBirth ? patientFull.dateOfBirth.slice(0, 10) : "",
                      phone: patientFull?.phone ?? "",
                      heightCm: patientFull?.heightCm?.toString() ?? "",
                      weightKg: patientFull?.weightKg?.toString() ?? "",
                    });
                  }
                  setPatientEditMode((v) => !v);
                }}
              >
                {patientEditMode ? t("patientInfo.cancel") : t("patientInfo.edit")}
              </Button>
            }
          >
            <div className="flex gap-6 items-start">
              {/* بيانات المريض — يمين */}
              <div className="flex-1">
                {patientEditMode ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("patientInfo.firstName")}</Label>
                      <Input className="h-8 text-sm" value={patientEditForm.firstName} onChange={(e) => setPatientEditForm((f) => ({ ...f, firstName: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("patientInfo.lastName")}</Label>
                      <Input className="h-8 text-sm" value={patientEditForm.lastName} onChange={(e) => setPatientEditForm((f) => ({ ...f, lastName: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("patientInfo.dob")}</Label>
                      <Input type="date" className="h-8 text-sm" value={patientEditForm.dateOfBirth} onChange={(e) => setPatientEditForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
                      {/* Age is never stored — it is derived from the date of birth so it can't go stale. */}
                      {ageFromDob(patientEditForm.dateOfBirth) !== null && (
                        <p className="text-xs text-muted-foreground">
                          {t("patientInfo.age")}: {t("patientInfo.ageYears", { age: ageFromDob(patientEditForm.dateOfBirth)! })}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("patientInfo.heightCm")}</Label>
                      <Input type="number" className="h-8 text-sm" value={patientEditForm.heightCm} onChange={(e) => setPatientEditForm((f) => ({ ...f, heightCm: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("patientInfo.weightKg")}</Label>
                      <Input type="number" className="h-8 text-sm" value={patientEditForm.weightKg} onChange={(e) => setPatientEditForm((f) => ({ ...f, weightKg: e.target.value }))} />
                    </div>
                    <Button onClick={handleSavePatient} disabled={updatePatient.isPending} className="col-span-2 h-8">
                      {updatePatient.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin ml-2" />}
                      {t("patientInfo.saveChanges")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">{t("patientInfo.patientNumber")}</p>
                      <p className="text-muted-foreground">{patientFull?.patientNumber ?? c.patient?.patientNumber ?? "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">{t("patientInfo.patientName")}</p>
                      <p className="text-muted-foreground">{patientFull ? `${patientFull.firstName} ${patientFull.lastName}` : patientName}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">{t("patientInfo.age")}</p>
                      <p className="text-muted-foreground">
                        {ageFromDob(patientFull?.dateOfBirth) !== null
                          ? t("patientInfo.ageYears", { age: ageFromDob(patientFull?.dateOfBirth)! })
                          : "—"}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">{t("patientInfo.amputationLevel")}</p>
                      <p className="text-muted-foreground">{toAmputationLevels(c.amputationLevel).join(" / ") || "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">{t("patientInfo.height")}</p>
                      <p className="text-muted-foreground">{patientFull?.heightCm ? `${patientFull.heightCm} cm` : "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">{t("patientInfo.weight")}</p>
                      <p className="text-muted-foreground">{patientFull?.weightKg ? `${patientFull.weightKg} kg` : "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">{t("patientInfo.bmi")}</p>
                      <p className="text-muted-foreground">{patientFull?.bmi ? patientFull.bmi.toFixed(1) : "—"}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* الصورة الشخصية — يسار */}
              {(() => {
                const photoDoc = patientDocs.find((d) => d.type === "PERSONAL_PHOTO");
                return (
                  <div className="shrink-0">
                    <div className="w-40 h-48 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-xs text-center bg-muted/20 overflow-hidden">
                      {photoDoc && caseData?.patientId
                        ? <PatientPhotoViewer patientId={caseData.patientId} docId={photoDoc.id} />
                        : <span className="opacity-50">{t("patientInfo.noPhoto")}</span>}
                    </div>
                  </div>
                );
              })()}
            </div>
          </Section>
          </fieldset>
        </TabsContent>

        {/* ── ASSESSMENT ──────────────────────────────────────────────────── */}
        <TabsContent value="assessment" className="mt-4 space-y-4" dir="rtl">
          <fieldset disabled={caseLocked} className="space-y-4 min-w-0">

          {/* ── فريق العمل المعالج ── */}
          {openStaffKey && <div className="fixed inset-0 z-40" onClick={() => setOpenStaffKey(null)} />}
          <Section title={t("assess.staff.title")}>
            {/* Staff is a case-level field (updateCase) with its own save button,
                editable independently of the frozen assessment records. */}
            <div className="grid grid-cols-3 gap-4">
              {([
                { key: "prosthetistIds" as const,     label: t("assess.staff.prosthetist") },
                { key: "physiotherapistIds" as const, label: t("assess.staff.physio") },
                { key: "supervisingDoctorIds" as const, label: t("assess.staff.supervisor") },
              ]).map(({ key, label }) => {
                const selected = staffForm[key];
                const isOpen = openStaffKey === key;
                const selectedNames = selected
                  .map((empId) => { const e = staffList.find((x) => x.id === empId); return e ? `${e.firstNameAr} ${e.lastNameAr}` : null; })
                  .filter(Boolean)
                  .join("، ");
                return (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <div className="relative">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-muted/40 transition-colors"
                        onClick={(e) => { e.stopPropagation(); setOpenStaffKey(isOpen ? null : key); }}
                      >
                        <span className={selected.length === 0 ? "text-muted-foreground" : "text-foreground font-medium"}>
                          {selected.length === 0 ? t("assess.staff.choose") : selectedNames}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                      {isOpen && (
                        <div className="absolute z-50 top-full mt-1 w-full min-w-48 rounded-md border bg-background shadow-lg overflow-hidden">
                          <div className="max-h-52 overflow-y-auto p-1">
                            {(key === "physiotherapistIds"
                              ? staffList.filter((e) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("الفيزيائي") || e.department?.nameAr?.includes("العلاج الطبيعي")))
                              : key === "prosthetistIds"
                              ? staffList.filter((e) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("الأطراف الصناعية") || e.department?.nameAr?.includes("الاطراف الصناعية") || e.department?.nameAr?.includes("طب الأقدام") || e.department?.nameAr?.includes("طب الاقدام")))
                              : staffList
                            ).map((emp) => (
                              <div
                                key={emp.id}
                                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-muted"
                                onClick={(e) => { e.stopPropagation(); toggleStaffMember(key, emp.id); }}
                              >
                                <div className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center ${selected.includes(emp.id) ? "bg-orange-500 border-orange-500" : "border-input"}`}>
                                  {selected.includes(emp.id) && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span>{emp.firstNameAr} {emp.lastNameAr}</span>
                                {emp.jobTitle?.nameAr && <span className="text-muted-foreground text-xs">— {emp.jobTitle.nameAr}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ─── Upper Assessment ───────────────────────────────────────────── */}
          {(() => {
            if (!ampTypes.includes("UPPER")) return null;
            const f = upperAssessForm;
            const set = (patch: Partial<typeof upperAssessForm>) => setUpperAssessForm((prev) => ({ ...prev, ...patch }));
            const g = genAssessForm;
            const setG = (patch: Partial<typeof genAssessForm>) => setGenAssessForm((prev) => ({ ...prev, ...patch }));
            const isBilateral = f.amputationSide === "BILATERAL";

            const renderSideBlock = (
              sf: ReturnType<typeof emptyUpperForm>,
              setSf: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyUpperForm>>>,
              showShared = false
            ) => {
              const setS = (patch: Partial<ReturnType<typeof emptyUpperForm>>) => setSf((prev) => ({ ...prev, ...patch }));
              const togS = (arr: string[], val: string) => arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
              return (
                <>
                  <PfRow label={t("assess.limbLengthUpper")}>
                    {[["LONG","long"],["MEDIUM","medium"],["SHORT","short"],["VERY_SHORT","veryShort"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={sf.residualLimbLength === val} label={t(`assess.${lbl}`)} onClick={() => setS({ residualLimbLength: val })} />
                    ))}
                  </PfRow>
                  <PfRow label={t("assess.limbShape")}>
                    {[["BONY","shapeCylindrical"],["SOFT","shapeSoft"],["NORMAL","skin.NORMAL"],["CONICAL_BONY","shapeBonyConical"],["CONICAL_SOFT","shapeSoftConical"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={sf.residualLimbShape === val} label={t(`assess.${lbl}`)} onClick={() => setS({ residualLimbShape: val })} />
                    ))}
                  </PfRow>
                  {showShared && <>
                    <PfRow label={t("assess.levelNote")}>
                      <Textarea rows={2} className="text-sm w-full" value={sf.amputationLevelNote} onChange={(e) => setS({ amputationLevelNote: e.target.value })} />
                    </PfRow>
                    <PfRow label={t("assess.amputationDate")}>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          placeholder={t("assess.year")}
                          min={1900} max={2100}
                          className="h-7 text-sm w-24"
                          value={g.amputationYear}
                          onChange={(e) => setG({ amputationYear: e.target.value })}
                        />
                        <Select value={g.amputationMonth} onValueChange={(v) => setG({ amputationMonth: v })}>
                          <SelectTrigger className="h-7 text-sm w-32">
                            <SelectValue placeholder={t("assess.month")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">{t("assess.noMonth")}</SelectItem>
                            {MONTH_NUMBERS.map((i) => (
                              <SelectItem key={i} value={String(i)}>{tMonth(String(i))}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </PfRow>
                    <PfRow label={t("assess.amputationCause")}>
                      {[["WAR_INJURY","cause.WAR"],["TRAFFIC_ACCIDENT","cause.TRAFFIC"],["DIABETES","cause.DIABETES_COMPLICATIONS"],["VASCULAR_DISEASE","cause.VASCULAR"],["CONGENITAL","cause.CONGENITAL"],["INFECTION","cause.INFECTION"],["TUMOR","cause.TUMOR"],["WORK_INJURY","cause.WORK"],["OTHER","pain.OTHER"]].map(([val, lbl]) => (
                        <PfSq key={val} checked={g.amputationCause === val} label={t(`assess.${lbl}`)} onClick={() => setG({ amputationCause: val })} />
                      ))}
                      {g.amputationCause === "OTHER" && (
                        <Input className="h-7 text-sm w-52 mt-1" placeholder={t("assess.causeOther")} value={g.amputationCauseOtherDetail} onChange={(e) => setG({ amputationCauseOtherDetail: e.target.value })} />
                      )}
                    </PfRow>
                    <PfRow label={t("assess.clinicalHistory")}>
                      <Textarea rows={2} className="text-sm w-full" value={g.clinicalHistory} onChange={(e) => setG({ clinicalHistory: e.target.value })} />
                    </PfRow>
                  </>}
                  <PfDivider label={t("assess.painSection")} />
                  <PfRow label={t("assess.painSection")}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{t("assess.absent")}</span>
                      <Switch checked={sf.painPresent === true} onCheckedChange={(v) => setS({ painPresent: v })} />
                      <span className="text-sm text-muted-foreground">{t("assess.present")}</span>
                    </div>
                    {sf.painPresent && <PfNumPicker value={sf.painIntensity} onChange={(n) => setS({ painIntensity: n })} max={9} />}
                  </PfRow>
                  <PfRow label={t("assess.phantomPain")}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{t("assess.absent")}</span>
                      <Switch checked={sf.phantomPainPresent === true} onCheckedChange={(v) => setS({ phantomPainPresent: v })} />
                      <span className="text-sm text-muted-foreground">{t("assess.present")}</span>
                    </div>
                    {sf.phantomPainPresent && <PfNumPicker value={sf.phantomPainIntensity} onChange={(n) => setS({ phantomPainIntensity: n })} max={9} />}
                  </PfRow>
                  <PfRow label={t("assess.painType")}>
                    {[["NUMBNESS","pain.NUMBNESS"],["DULL_ACHE","pain.DULL_ACHE"],["HOT_BURNING","pain.HOT_BURNING"],["SHARP_STABBING","pain.SHARP_STABBING"],["PINS","pain.PINS"],["OTHER","pain.OTHER"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={sf.painTypes.includes(val)} label={t(`assess.${lbl}`)} onClick={() => setS({ painTypes: togS(sf.painTypes, val) })} />
                    ))}
                    {sf.painTypes.includes("OTHER") && (
                      <Input className="h-7 text-sm w-52 mt-1" placeholder={t("assess.painTypeOther")} value={sf.painTypeOtherDetail} onChange={(e) => setS({ painTypeOtherDetail: e.target.value })} />
                    )}
                  </PfRow>
                  <PfRow label={t("assess.neuroma")}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{t("assess.absent")}</span>
                      <Switch checked={sf.neuromaPresent === true} onCheckedChange={(v) => setS({ neuromaPresent: v })} />
                      <span className="text-sm text-muted-foreground">{t("assess.present")}</span>
                    </div>
                  </PfRow>
                  <PfRow label={t("assess.stumpPosition")}>
                    <PfSq checked={sf.neuromaPalpable === true} label={t("assess.touchable")} onClick={() => setS({ neuromaPalpable: true })} />
                    <PfSq checked={sf.neuromaPalpable === false} label={t("assess.notTouchable")} onClick={() => setS({ neuromaPalpable: false })} />
                  </PfRow>
                  <PfRow label={t("assess.notes")}>
                    <Textarea rows={2} className="text-sm w-full" value={sf.skinNotes} onChange={(e) => setS({ skinNotes: e.target.value })} />
                  </PfRow>
                  <PfDivider label={t("assess.skinSection")} />
                  <PfRow label={t("assess.skinAppearance")}>
                    {[["NORMAL","skin.NORMAL"],["PALE","skin.PALE"],["DRY","skin.DRY"],["INFLAMED","skin.INFLAMED"],["PEELING","skin.PEELING"],["OOZING","skin.OOZING"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={sf.skinAppearance.includes(val)} label={t(`assess.${lbl}`)} onClick={() => setS({ skinAppearance: togS(sf.skinAppearance, val) })} />
                    ))}
                  </PfRow>
                  <PfRow label={t("assess.skinColor")}>
                    {[["NORMAL","skin.NORMAL"],["PALE","skin.PALE"],["YELLOWISH","color.YELLOWISH"],["ERYTHEMATOUS","color.ERYTHEMATOUS"],["CYANOTIC","color.CYANOTIC"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={sf.skinColor.includes(val)} label={t(`assess.${lbl}`)} onClick={() => setS({ skinColor: togS(sf.skinColor, val) })} />
                    ))}
                  </PfRow>
                  <PfRow label={t("assess.skinTemp")}>
                    {[["NORMAL","skin.NORMAL"],["COLD","temp.COLD"],["HOT","temp.HOT"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={sf.skinTemperature === val} label={t(`assess.${lbl}`)} onClick={() => setS({ skinTemperature: val })} />
                    ))}
                  </PfRow>
                  <PfRow label={t("assess.grafts")}>
                    <PfSq checked={sf.hasSkinGrafts} label={t("assess.hasGraft")} onClick={() => setS({ hasSkinGrafts: !sf.hasSkinGrafts })} />
                    {sf.hasSkinGrafts && (
                      <Input className="h-7 text-sm w-52" placeholder={t("assess.graftArea")} value={sf.graftArea} onChange={(e) => setS({ graftArea: e.target.value })} />
                    )}
                  </PfRow>
                  <PfRow label={t("assess.scarCondition")}>
                    {[["HEALED","scar.HEALED"],["FLEXIBLE","scar.FLEXIBLE"],["HEALED_WITH_PINS","scar.HEALED_WITH_PINS"],["OPEN","scar.OPEN"],["DRY","scar.DRY"],["INFLAMED","scar.INFLAMED"],["OOZING","scar.OOZING"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={sf.scarCondition.includes(val)} label={t(`assess.${lbl}`)} onClick={() => setS({ scarCondition: togS(sf.scarCondition, val) })} />
                    ))}
                  </PfRow>
                  <PfRow label={t("assess.comments")}>
                    <Textarea rows={2} className="text-sm w-full" value={sf.closureNotes} onChange={(e) => setS({ closureNotes: e.target.value })} />
                  </PfRow>
                  <PfDivider label={t("assess.generalSection")} />
                  <PfRow label={t("assess.generalHealth")}>
                    <Textarea rows={2} className="text-sm w-full" value={sf.generalHealthNotes} onChange={(e) => setS({ generalHealthNotes: e.target.value })} />
                  </PfRow>
                  <PfRow label={t("assess.otherLimb")}>
                    <Textarea rows={2} className="text-sm w-full" value={sf.otherLimbCondition} onChange={(e) => setS({ otherLimbCondition: e.target.value })} />
                  </PfRow>
                  {showShared && <>
                    <PfRow label={t("assess.usesProsthesisNow")}>
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">{t("assess.no")}</span>
                          <Switch checked={g.currentlyUsingProsthesis === true} onCheckedChange={(v) => setG({ currentlyUsingProsthesis: v })} />
                          <span className="text-sm text-muted-foreground">{t("assess.yes")}</span>
                        </div>
                        {g.currentlyUsingProsthesis === true && (
                          <Input className="h-7 text-sm w-64" placeholder={t("assess.prosthesisType")} value={sf.prostheticLimbType} onChange={(e) => setS({ prostheticLimbType: e.target.value })} />
                        )}
                      </div>
                    </PfRow>
                    {g.currentlyUsingProsthesis === false && (
                      <PfRow label={t("assess.usedProsthesisBefore")}>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">{t("assess.no")}</span>
                          <Switch checked={g.previouslyUsedProsthesis === true} onCheckedChange={(v) => setG({ previouslyUsedProsthesis: v })} />
                          <span className="text-sm text-muted-foreground">{t("assess.yes")}</span>
                        </div>
                        {g.previouslyUsedProsthesis === true && (
                          <Input className="h-7 text-sm w-64 mt-1" placeholder={t("assess.prosthesisSystem")} value={g.previousProsthesisSystemDetail} onChange={(e) => setG({ previousProsthesisSystemDetail: e.target.value })} />
                        )}
                      </PfRow>
                    )}
                  </>}
                  <PfRow label={t("assess.balanceOneSide")}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{t("assess.no")}</span>
                      <Switch checked={sf.canBalanceOneSide} onCheckedChange={(v) => setS({ canBalanceOneSide: v })} />
                      <span className="text-sm text-muted-foreground">{t("assess.yes")}</span>
                    </div>
                  </PfRow>
                  <PfRow label={t("assess.compressionBandage")}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{t("assess.no")}</span>
                      <Switch checked={sf.usesCompressionBandage} onCheckedChange={(v) => setS({ usesCompressionBandage: v })} />
                      <span className="text-sm text-muted-foreground">{t("assess.yes")}</span>
                    </div>
                  </PfRow>
                  {showShared && <>
                    <PfRow label={t("assess.normalState")}>
                      <PfSq checked={sf.jointsRangeOfMotion === "ACTIVE"} label={t("assess.active")} onClick={() => setS({ jointsRangeOfMotion: "ACTIVE" })} />
                      <PfSq checked={sf.jointsRangeOfMotion === "SEDENTARY"} label={t("assess.inactive")} onClick={() => setS({ jointsRangeOfMotion: "SEDENTARY" })} />
                    </PfRow>
                    <PfRow label={t("assess.activityLevel")}>
                      {["K0","K1","K2","K3","K4"].map((k) => (
                        <PfSq key={k} checked={sf.activityLevel === k} label={k} onClick={() => setS({ activityLevel: k })} />
                      ))}
                    </PfRow>
                  </>}
                </>
              );
            };

            return (
              <Section title={t("assess.upperTitle")} action={upperSaved ? <SavedBadge /> : undefined}>
                <fieldset disabled={upperSaved} className="contents">
                <div className="divide-y divide-border/30">

                  {/* جانب البتر */}
                  <PfRow label={t("assess.side")}>
                    <PfSq checked={f.amputationSide === "RIGHT"} label={t("assess.right")} onClick={() => set({ amputationSide: "RIGHT" })} />
                    <PfSq checked={f.amputationSide === "LEFT"} label={t("assess.left")} onClick={() => set({ amputationSide: "LEFT" })} />
                    <PfSq checked={f.amputationSide === "BILATERAL"} label={t("assess.bilateral")} onClick={() => set({ amputationSide: "BILATERAL" })} />
                  </PfRow>

                  {/* أسئلة خاصة بالجانب — تُعرض مرتين عند الثنائي */}
                  {isBilateral ? (
                    <div className="grid grid-cols-2 gap-x-6 border-t border-border/30 pt-1">
                      <div className="divide-y divide-border/30 border-l border-border/30 pl-4">
                        <PfDivider label={t("assess.right")} />
                        {renderSideBlock(upperAssessForm, setUpperAssessForm, true)}
                      </div>
                      <div className="divide-y divide-border/30">
                        <PfDivider label={t("assess.left")} />
                        {renderSideBlock(upperAssessFormLeft, setUpperAssessFormLeft)}
                      </div>
                    </div>
                  ) : (
                    renderSideBlock(upperAssessForm, setUpperAssessForm, true)
                  )}


                </div>
                </fieldset>
              </Section>
            );
          })()}

          {/* ─── Muscle Strength Assessment (Upper only) ───────────────────── */}
          {(() => {
            if (!ampTypes.includes("UPPER")) return null;
            const f = upperAssessForm;
            const set = (patch: Partial<typeof upperAssessForm>) => setUpperAssessForm((prev) => ({ ...prev, ...patch }));
            const setRom = (key: string, val: RomEntry) => set({ romData: { ...f.romData, [key]: val } });
            const groups = [...new Set(UPPER_ROM_MOVES.map((m) => m.groupKey))];
            return (
              <Section title={t("assess.muscleTitle")} action={upperSaved ? <SavedBadge /> : undefined}>
                <fieldset disabled={upperSaved} className="contents">
                <div className="divide-y divide-border/30">
                  {groups.map((group) => (
                    <PfRow key={group} label={t(`assess.rom.${group}`)}>
                      <div className="flex flex-col gap-2 w-full">
                        {UPPER_ROM_MOVES.filter((m) => m.groupKey === group).map((m) => {
                          const entry = f.romData[m.key] ?? { selected: false };
                          return (
                            <div key={m.key} className="flex items-center gap-3 flex-wrap">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-[15px] h-[15px] checkbox-orange"
                                  checked={entry.selected}
                                  onChange={() => setRom(m.key, { ...entry, selected: !entry.selected })}
                                />
                                <span className="text-sm">{t(`assess.rom.${m.labelKey}`)}</span>
                              </label>
                              {m.hasGrade && entry.selected && (
                                <div className="flex gap-1 flex-wrap">
                                  {ROM_GRADES.map((g) => (
                                    <button key={g} type="button"
                                      className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${entry.grade === g ? "bg-orange-500 text-white border-orange-500" : "border-border text-muted-foreground hover:bg-muted"}`}
                                      onClick={() => setRom(m.key, { ...entry, grade: entry.grade === g ? undefined : g })}
                                    >{g}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </PfRow>
                  ))}
                </div>
                </fieldset>
              </Section>
            );
          })()}

          {/* ─── 3. Lower Assessment ────────────────────────────────────────── */}
          {(() => {
            if (!ampTypes.includes("LOWER")) return null;
            const f = lowerAssessForm;
            const set = (patch: Partial<typeof lowerAssessForm>) => setLowerAssessForm((prev) => ({ ...prev, ...patch }));
            const g = genAssessForm;
            const setG = (patch: Partial<typeof genAssessForm>) => setGenAssessForm((prev) => ({ ...prev, ...patch }));
            const isBilateral = f.amputationSide === "BILATERAL";

            const renderSideBlock = (
              sf: ReturnType<typeof emptyLowerForm>,
              setSf: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyLowerForm>>>,
              showTopFields = false
            ) => {
              const setS = (patch: Partial<ReturnType<typeof emptyLowerForm>>) => setSf((prev) => ({ ...prev, ...patch }));
              const togS = (arr: string[], val: string) => arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
              return (
                <>
                  {showTopFields && (
                    <>
                      <PfRow label={t("assess.limbLengthLower")}>
                        {[
                          ["LONG", "long"],
                          ["MEDIUM", "medium"],
                          ["SHORT", "short"],
                          ["VERY_SHORT", "veryShort"],
                        ].map(([val, lbl]) => (
                          <PfSq
                            key={val}
                            checked={sf.residualLimbLength === val}
                            label={t(`assess.${lbl}`)}
                            onClick={() => setS({ residualLimbLength: val })}
                          />
                        ))}
                      </PfRow>
                      <PfRow label={t("assess.limbShape")}>
                        {[
                          ["BONY", "shapeCylindrical"],
                          ["SOFT", "shapeSoft"],
                          ["NORMAL", "skin.NORMAL"],
                          ["CONICAL_BONY", "shapeBonyConical"],
                          ["CONICAL_SOFT", "shapeSoftConical"],
                        ].map(([val, lbl]) => (
                          <PfSq
                            key={val}
                            checked={sf.residualLimbShape === val}
                            label={t(`assess.${lbl}`)}
                            onClick={() => setS({ residualLimbShape: val })}
                          />
                        ))}
                      </PfRow>
                      <PfRow label={t("assess.levelNote")}>
                        <Textarea
                          rows={3}
                          className="text-sm w-full resize-none"
                          value={sf.amputationLevelNote}
                          onChange={(e) =>
                            setS({ amputationLevelNote: e.target.value })
                          }
                        />
                      </PfRow>
                    </>
                  )}
                  <PfRow label={t("assess.painSection")}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {t("assess.absent")}
                      </span>
                      <Switch
                        checked={sf.painPresent === true}
                        onCheckedChange={(v) => setS({ painPresent: v })}
                      />
                      <span className="text-sm text-muted-foreground">
                        {t("assess.present")}
                      </span>
                    </div>
                    {sf.painPresent && (
                      <>
                        <Input
                          className="h-7 text-sm w-64 mt-1"
                          placeholder={t("assess.painArea")}
                          value={sf.painArea}
                          onChange={(e) => setS({ painArea: e.target.value })}
                        />
                        <div className="mt-1">
                          <PfNumPicker
                            value={sf.painIntensity}
                            onChange={(n) => setS({ painIntensity: n })}
                            max={10}
                          />
                        </div>
                      </>
                    )}
                  </PfRow>
                  <PfRow label={t("assess.phantomPain")}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {t("assess.absent")}
                      </span>
                      <Switch
                        checked={sf.phantomPainPresent === true}
                        onCheckedChange={(v) => setS({ phantomPainPresent: v })}
                      />
                      <span className="text-sm text-muted-foreground">
                        {t("assess.present")}
                      </span>
                    </div>
                    {sf.phantomPainPresent && (
                      <div className="mt-1">
                        <PfNumPicker
                          value={sf.phantomPainIntensity}
                          onChange={(n) => setS({ phantomPainIntensity: n })}
                          max={9}
                        />
                      </div>
                    )}
                  </PfRow>
                  <PfRow label={t("assess.painType")}>
                    {[
                      ["NUMBNESS", "pain.NUMBNESS"],
                      ["DULL_ACHE", "pain.DULL_ACHE"],
                      ["HOT_BURNING", "pain.HOT_BURNING"],
                      ["SHARP_STABBING", "pain.SHARP_STABBING"],
                      ["PINS", "pain.PINS"],
                      ["OTHER", "pain.OTHER"],
                    ].map(([val, lbl]) => (
                      <PfSq
                        key={val}
                        checked={sf.painTypes.includes(val)}
                        label={t(`assess.${lbl}`)}
                        onClick={() =>
                          setS({ painTypes: togS(sf.painTypes, val) })
                        }
                      />
                    ))}
                    {sf.painTypes.includes("OTHER") && (
                      <Input
                        className="h-7 text-sm w-52 mt-1"
                        placeholder={t("assess.describe")}
                        value={sf.painTypeOtherDetail}
                        onChange={(e) =>
                          setS({ painTypeOtherDetail: e.target.value })
                        }
                      />
                    )}
                  </PfRow>
                  <PfRow label={t("assess.neuroma")}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {t("assess.absent")}
                      </span>
                      <Switch
                        checked={sf.neuromaPalpable === true}
                        onCheckedChange={(v) => setS({ neuromaPalpable: v })}
                      />
                      <span className="text-sm text-muted-foreground">
                        {t("assess.present")}
                      </span>
                    </div>
                  </PfRow>
                  <PfRow label={t("assess.loadTolerance")}>
                    {[
                      ["PALPABLE", "touchable"],
                      ["WEIGHT_BEARING", "weightBearing"],
                      ["NON_WEIGHT_BEARING", "notWeightBearing"],
                      ["NOT_PALPABLE", "notTouchable"],
                    ].map(([val, lbl]) => (
                      <PfSq
                        key={val}
                        checked={sf.loadTolerance === val}
                        label={t(`assess.${lbl}`)}
                        onClick={() => setS({ loadTolerance: val })}
                      />
                    ))}
                  </PfRow>
                  {sf.loadTolerance === "WEIGHT_BEARING" && (
                    <PfRow label={t("assess.ifWeightBearing")}>
                      {[
                        ["FULL", "full"],
                        ["HIGH", "high"],
                        ["MEDIUM", "mediumLevel"],
                        ["LOW", "low"],
                      ].map(([val, lbl]) => (
                        <PfSq
                          key={val}
                          checked={sf.weightBearingLevel === val}
                          label={t(`assess.${lbl}`)}
                          onClick={() => setS({ weightBearingLevel: val })}
                        />
                      ))}
                    </PfRow>
                  )}
                  <PfRow label={t("assess.notes")}>
                    <Textarea
                      rows={2}
                      className="text-sm w-full"
                      value={sf.notes}
                      onChange={(e) => setS({ notes: e.target.value })}
                    />
                  </PfRow>
                  <PfRow label={t("assess.skinAppearanceFull")}>
                    {[
                      ["NORMAL", "skin.NORMAL"],
                      ["PALE", "skin.PALE"],
                      ["DRY", "skin.DRY"],
                      ["INFLAMED", "skin.INFLAMED"],
                      ["PEELING", "skin.PEELING"],
                      ["OOZING", "skin.OOZING"],
                    ].map(([val, lbl]) => (
                      <PfSq
                        key={val}
                        checked={sf.skinAppearance.includes(val)}
                        label={t(`assess.${lbl}`)}
                        onClick={() =>
                          setS({ skinAppearance: togS(sf.skinAppearance, val) })
                        }
                      />
                    ))}
                  </PfRow>
                  <PfRow label={t("assess.skinColor")}>
                    {[
                      ["NORMAL", "skin.NORMAL"],
                      ["PALE", "skin.PALE"],
                      ["YELLOWISH", "color.YELLOWISH"],
                      ["ERYTHEMATOUS", "color.ERYTHEMATOUS"],
                      ["CYANOTIC", "color.CYANOTIC"],
                    ].map(([val, lbl]) => (
                      <PfSq
                        key={val}
                        checked={sf.skinColor.includes(val)}
                        label={t(`assess.${lbl}`)}
                        onClick={() =>
                          setS({ skinColor: togS(sf.skinColor, val) })
                        }
                      />
                    ))}
                  </PfRow>
                  <PfRow label={t("assess.bodyTemp")}>
                    {[
                      ["NORMAL", "skin.NORMAL"],
                      ["COLD", "temp.COLD"],
                      ["HOT", "temp.HOT"],
                    ].map(([val, lbl]) => (
                      <PfSq
                        key={val}
                        checked={sf.skinTemperature === val}
                        label={t(`assess.${lbl}`)}
                        onClick={() => setS({ skinTemperature: val })}
                      />
                    ))}
                  </PfRow>
                  <PfRow label={t("assess.grafts")}>
                    <PfSq
                      checked={sf.hasSkinGrafts}
                      label={t("assess.hasGraft")}
                      onClick={() => setS({ hasSkinGrafts: !sf.hasSkinGrafts })}
                    />
                    {sf.hasSkinGrafts && (
                      <Input
                        className="h-7 text-sm w-64 mt-1"
                        placeholder={t("assess.graftArea")}
                        value={sf.graftArea}
                        onChange={(e) => setS({ graftArea: e.target.value })}
                      />
                    )}
                  </PfRow>
                  <PfRow label={t("assess.scarCondition")}>
                    {[
                      ["HEALED", "scar.HEALED"],
                      ["INFLAMED", "scar.INFLAMED"],
                      ["FLEXIBLE", "scar.FLEXIBLE"],
                      ["HEALED_WITH_PINS", "scar.HEALED_WITH_PINS"],
                      ["DRY", "scar.DRY"],
                      ["OPEN", "scar.OPEN"],
                      ["OOZING", "scar.OOZING"],
                    ].map(([val, lbl]) => (
                      <PfSq
                        key={val}
                        checked={sf.scarCondition.includes(val)}
                        label={t(`assess.${lbl}`)}
                        onClick={() =>
                          setS({ scarCondition: togS(sf.scarCondition, val) })
                        }
                      />
                    ))}
                  </PfRow>
                  <PfRow label={t("assess.generalHealth")}>
                    <Textarea
                      rows={3}
                      className="text-sm w-full resize-none"
                      value={sf.generalHealthNotes}
                      onChange={(e) =>
                        setS({ generalHealthNotes: e.target.value })
                      }
                    />
                  </PfRow>
                  <PfRow label={t("assess.otherLimb")}>
                    <Textarea
                      rows={3}
                      className="text-sm w-full resize-none"
                      value={sf.otherLimbCondition}
                      onChange={(e) =>
                        setS({ otherLimbCondition: e.target.value })
                      }
                    />
                  </PfRow>
                  <PfRow label={t("assess.usesProsthesisNow")}>
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{t("assess.no")}</span>
                        <Switch checked={g.currentlyUsingProsthesis === true} onCheckedChange={(v) => setG({ currentlyUsingProsthesis: v })} />
                        <span className="text-sm text-muted-foreground">{t("assess.yes")}</span>
                      </div>
                      {g.currentlyUsingProsthesis === true && (
                        <Input className="h-7 text-sm w-64" placeholder={t("assess.prosthesisType")} value={sf.prostheticLimbType} onChange={(e) => setS({ prostheticLimbType: e.target.value })} />
                      )}
                    </div>
                  </PfRow>
                  {g.currentlyUsingProsthesis === false && (
                    <PfRow label={t("assess.usedBeforeIfNo")}>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {t("assess.no")}
                        </span>
                        <Switch
                          checked={g.previouslyUsedProsthesis === true}
                          onCheckedChange={(v) =>
                            setG({ previouslyUsedProsthesis: v })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {t("assess.yes")}
                        </span>
                      </div>
                      {g.previouslyUsedProsthesis === true && (
                        <Input
                          className="h-7 text-sm w-64 mt-1"
                          placeholder={t("assess.prosthesisSystemPlease")}
                          value={g.previousProsthesisSystemDetail}
                          onChange={(e) =>
                            setG({
                              previousProsthesisSystemDetail: e.target.value,
                            })
                          }
                        />
                      )}
                    </PfRow>
                  )}
                  <PfRow label={t("assess.assistiveDevices")}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{t("assess.no")}</span>
                      <Switch
                        checked={sf.usesAssistiveDevices === true}
                        onCheckedChange={(v) =>
                          setS({ usesAssistiveDevices: v })
                        }
                      />
                      <span className="text-sm text-muted-foreground">{t("assess.yes")}</span>
                    </div>
                    {sf.usesAssistiveDevices && (
                      <Input
                        className="h-7 text-sm w-64 mt-1"
                        placeholder={t("assess.assistiveType")}
                        value={sf.assistiveDeviceTypes}
                        onChange={(e) =>
                          setS({ assistiveDeviceTypes: e.target.value })
                        }
                      />
                    )}
                  </PfRow>
                  <PfRow label={t("assess.stairs")}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{t("assess.no")}</span>
                      <Switch
                        checked={sf.canClimbStairs === true}
                        onCheckedChange={(v) => setS({ canClimbStairs: v })}
                      />
                      <span className="text-sm text-muted-foreground">{t("assess.yes")}</span>
                    </div>
                  </PfRow>
                  <PfRow label={t("assess.balanceOneSide")}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{t("assess.no")}</span>
                      <Switch
                        checked={sf.canBalanceOneSide === true}
                        onCheckedChange={(v) => setS({ canBalanceOneSide: v })}
                      />
                      <span className="text-sm text-muted-foreground">{t("assess.yes")}</span>
                    </div>
                  </PfRow>
                  {!ampTypes.includes("UPPER") && <>
                    <PfRow label={t("assess.normalState")}>
                      {[["ACTIVE", "active"], ["SEDENTARY", "inactive"]].map(([val, lbl]) => (
                        <PfSq key={val} checked={sf.jointsRangeOfMotion === val} label={t(`assess.${lbl}`)} onClick={() => setS({ jointsRangeOfMotion: val })} />
                      ))}
                    </PfRow>
                    <PfRow label={t("assess.activityLevel")}>
                      {["K0", "K1", "K2", "K3", "K4"].map((k) => (
                        <PfSq key={k} checked={sf.activityLevel === k} label={k} onClick={() => setS({ activityLevel: k })} />
                      ))}
                    </PfRow>
                  </>}
                </>
              );
            };

            return (
              <Section title={t("assess.lowerTitle")} action={lowerSaved ? <SavedBadge /> : undefined}>
                <fieldset disabled={lowerSaved} className="contents">
                <div className="divide-y divide-border/30">

                  <PfRow label={t("assess.side")}>
                    <PfSq checked={f.amputationSide === "RIGHT"} label={t("assess.right")} onClick={() => set({ amputationSide: "RIGHT" })} />
                    <PfSq checked={f.amputationSide === "LEFT"} label={t("assess.left")} onClick={() => set({ amputationSide: "LEFT" })} />
                    <PfSq checked={f.amputationSide === "BILATERAL"} label={t("assess.bilateral")} onClick={() => set({ amputationSide: "BILATERAL" })} />
                  </PfRow>

                  {!isBilateral && (
                    <>
                      <PfRow label={t("assess.limbLengthLower")}>
                        {[["LONG","long"],["MEDIUM","medium"],["SHORT","short"],["VERY_SHORT","veryShort"]].map(([val, lbl]) => (
                          <PfSq key={val} checked={f.residualLimbLength === val} label={t(`assess.${lbl}`)} onClick={() => set({ residualLimbLength: val })} />
                        ))}
                      </PfRow>
                      <PfRow label={t("assess.limbShape")}>
                        {[["BONY","shapeCylindrical"],["SOFT","shapeSoft"],["NORMAL","skin.NORMAL"],["CONICAL_BONY","shapeBonyConical"],["CONICAL_SOFT","shapeSoftConical"]].map(([val, lbl]) => (
                          <PfSq key={val} checked={f.residualLimbShape === val} label={t(`assess.${lbl}`)} onClick={() => set({ residualLimbShape: val })} />
                        ))}
                      </PfRow>
                      <PfRow label={t("assess.levelNote")}>
                        <Textarea rows={3} className="text-sm w-full resize-none" value={f.amputationLevelNote} onChange={(e) => set({ amputationLevelNote: e.target.value })} />
                      </PfRow>
                    </>
                  )}

                  <PfRow label={t("assess.amputationDate")}>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        placeholder={t("assess.year")}
                        min={1900} max={2100}
                        className="h-7 text-sm w-24"
                        value={g.amputationYear}
                        onChange={(e) => setG({ amputationYear: e.target.value })}
                      />
                      <Select value={g.amputationMonth} onValueChange={(v) => setG({ amputationMonth: v })}>
                        <SelectTrigger className="h-7 text-sm w-32">
                          <SelectValue placeholder={t("assess.month")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">{t("assess.noMonth")}</SelectItem>
                          {MONTH_NUMBERS.map((i) => (
                            <SelectItem key={i} value={String(i)}>{tMonth(String(i))}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </PfRow>
                  <PfRow label={t("assess.amputationCause")}>
                    {[["WAR_INJURY","cause.WAR"],["TRAFFIC_ACCIDENT","cause.TRAFFIC"],["DIABETES","cause.DIABETES"],["VASCULAR_DISEASE","cause.VASCULAR"],["CONGENITAL","cause.CONGENITAL"],["INFECTION","cause.INFECTION"],["TUMOR","cause.TUMOR"],["WORK_INJURY","cause.WORK"],["OTHER","pain.OTHER"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={g.amputationCause === val} label={t(`assess.${lbl}`)} onClick={() => setG({ amputationCause: val })} />
                    ))}
                    {g.amputationCause === "OTHER" && (
                      <Input className="h-7 text-sm w-52 mt-1" placeholder={t("assess.causeSpecify")} value={g.amputationCauseOtherDetail} onChange={(e) => setG({ amputationCauseOtherDetail: e.target.value })} />
                    )}
                  </PfRow>
                  <PfRow label={t("assess.clinicalHistory")}>
                    <Textarea rows={2} className="text-sm w-full" value={g.clinicalHistory} onChange={(e) => setG({ clinicalHistory: e.target.value })} />
                  </PfRow>

                  {isBilateral ? (
                    <div className="grid grid-cols-2 gap-x-6 border-t border-border/30 pt-1">
                      <div className="divide-y divide-border/30 border-l border-border/30 pl-4">
                        <PfDivider label={t("assess.right")} />
                        {renderSideBlock(lowerAssessForm, setLowerAssessForm, true)}
                      </div>
                      <div className="divide-y divide-border/30">
                        <PfDivider label={t("assess.left")} />
                        {renderSideBlock(lowerAssessFormLeft, setLowerAssessFormLeft, true)}
                      </div>
                    </div>
                  ) : (
                    renderSideBlock(lowerAssessForm, setLowerAssessForm, false)
                  )}

                </div>
                </fieldset>
              </Section>
            );
          })()}

          {/* ─── 4. Lower Muscle Strength ───────────────────────────────────── */}
          {(() => {
            if (!ampTypes.includes("LOWER")) return null;
            const f = lowerAssessForm;
            const set = (patch: Partial<typeof lowerAssessForm>) => setLowerAssessForm((prev) => ({ ...prev, ...patch }));
            const setRom = (key: string, val: RomEntry) => set({ romData: { ...f.romData, [key]: val } });
            const groups = [...new Set(LOWER_ROM_MOVES.map((m) => m.groupKey))];
            return (
              <Section title={t("assess.muscleTitle")} action={lowerSaved ? <SavedBadge /> : undefined}>
                <fieldset disabled={lowerSaved} className="contents">
                <div className="divide-y divide-border/30">
                  {groups.map((group) => (
                    <PfRow key={group} label={t(`assess.rom.${group}`)}>
                      <div className="flex flex-col gap-2 w-full">
                        {LOWER_ROM_MOVES.filter((m) => m.groupKey === group).map((m) => {
                          const entry = f.romData[m.key] ?? { selected: false };
                          return (
                            <div key={m.key} className="flex items-center gap-3 flex-wrap">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-[15px] h-[15px] checkbox-orange"
                                  checked={entry.selected}
                                  onChange={() => setRom(m.key, { ...entry, selected: !entry.selected })}
                                />
                                <span className="text-sm">{t(`assess.rom.${m.labelKey}`)}</span>
                              </label>
                              {m.hasGrade && entry.selected && (
                                <div className="flex gap-1 flex-wrap">
                                  {ROM_GRADES.map((g) => (
                                    <button key={g} type="button"
                                      className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${entry.grade === g ? "bg-orange-500 text-white border-orange-500" : "border-border text-muted-foreground hover:bg-muted"}`}
                                      onClick={() => setRom(m.key, { ...entry, grade: entry.grade === g ? undefined : g })}
                                    >{g}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </PfRow>
                  ))}
                  <PfRow label={t("assess.notes")}>
                    <Textarea rows={2} className="text-sm w-full" value={f.muscleMotionNotes} onChange={(e) => set({ muscleMotionNotes: e.target.value })} />
                  </PfRow>
                </div>
                </fieldset>
              </Section>
            );
          })()}

          {/* ─── زر واحد: يحفظ الفريق والتقييم ثم يرسل للجنة ──────────────────── */}
          {/* Hidden once every limb sheet the case needs has been saved — a saved
              assessment is read-only, so there is nothing left to submit. */}
          {(() => {
            const pending = (ampTypes.includes("UPPER") && !upperSaved)
              || (ampTypes.includes("LOWER") && !lowerSaved);
            if (!pending) return null;
            const busy = updateCase.isPending || submitAssessmentUpper.isPending
              || submitAssessmentLower.isPending || updateStatus.isPending;
            return (
              <Button
                onClick={handleSubmitAssessmentAndAdvance}
                disabled={busy}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                {t("assess.saveAndSendToCommittee")}
              </Button>
            );
          })()}
          {/* ── صور البتر ── */}
          <Section
            title={attachments.length > 0 ? t("assess.attachmentsCount", { count: attachments.length }) : t("assess.attachments")}
            action={
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={uploadAttachment.isPending}>
                      {uploadAttachment.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Plus className="h-4 w-4 ml-1" />}
                      {t("assess.uploadPhoto")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => attachCameraRef.current?.click()}>
                      <Camera className="h-4 w-4 ml-2" />
                      {t("assess.fromCamera")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => attachFileRef.current?.click()}>
                      <Plus className="h-4 w-4 ml-2" />
                      {t("assess.fromFiles")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <input
                  ref={attachCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAttachment.mutate({ id, file });
                    e.target.value = "";
                  }}
                />
                <input
                  ref={attachFileRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAttachment.mutate({ id, file });
                    e.target.value = "";
                  }}
                />
              </>
            }
          >
            {attachments.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">{t("assess.noAttachments")}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {attachments.map((att) => (
                  <AttachmentCard
                    key={att.id}
                    caseId={id}
                    att={att}
                    onDelete={() => deleteAttachment.mutate({ id, attachmentId: att.id })}
                    deleteDisabled={deleteAttachment.isPending}
                  />
                ))}
              </div>
            )}
          </Section>
          </fieldset>
        </TabsContent>

        {/* ── COMMITTEE ───────────────────────────────────────────────────── */}
        <TabsContent value="committee_review" className="mt-4 space-y-4" dir={isRtl ? "rtl" : "ltr"}>
          <fieldset disabled={caseLocked} className="space-y-4 min-w-0">

          {/* أعضاء لجنة القبول وتقييماتهم */}
          <Section title={t("committee.membersTitle")}>
            <div className="space-y-5 divide-y divide-border/40">

              {/* فني الأطراف الصناعية */}
              <div className="space-y-2 pt-2 first:pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="font-semibold">{t("committee.prosthetistOpinion")}</Label>
                  {(committeeAuthorName(cr?.prosthetistUser) ?? staffNamesOf("prosthetistIds")) && (
                    <span className="text-xs text-orange-700 bg-orange-100 rounded-full px-2 py-0.5">
                      {committeeAuthorName(cr?.prosthetistUser) ?? staffNamesOf("prosthetistIds")}
                    </span>
                  )}
                  {prosthetistOpinionSaved && <SavedBadge />}
                </div>
                <Textarea rows={3} disabled={prosthetistOpinionSaved} value={prosthetistOpinion} onChange={(e) => setProsthetistOpinion(e.target.value)} placeholder={t("committee.prosthetistOpinionPlaceholder")} />
              </div>

              {/* المعالج الفيزيائي */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="font-semibold">{t("committee.physioOpinion")}</Label>
                  {(committeeAuthorName(cr?.physiotherapistUser) ?? staffNamesOf("physiotherapistIds")) && (
                    <span className="text-xs text-orange-700 bg-orange-100 rounded-full px-2 py-0.5">
                      {committeeAuthorName(cr?.physiotherapistUser) ?? staffNamesOf("physiotherapistIds")}
                    </span>
                  )}
                  {physioOpinionSaved && <SavedBadge />}
                </div>
                <Textarea rows={3} disabled={physioOpinionSaved} value={physioOpinion} onChange={(e) => setPhysioOpinion(e.target.value)} placeholder={t("committee.physioOpinionPlaceholder")} />
              </div>

              {/* الطبيب المختص */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="font-semibold">{t("committee.doctorOpinion")}</Label>
                  {(committeeAuthorName(cr?.doctorUser) ?? staffNamesOf("supervisingDoctorIds")) && (
                    <span className="text-xs text-orange-700 bg-orange-100 rounded-full px-2 py-0.5">
                      {committeeAuthorName(cr?.doctorUser) ?? staffNamesOf("supervisingDoctorIds")}
                    </span>
                  )}
                  {doctorOpinionSaved && <SavedBadge />}
                </div>
                <Textarea rows={3} disabled={doctorOpinionSaved} value={doctorOpinion} onChange={(e) => setDoctorOpinion(e.target.value)} placeholder={t("committee.doctorOpinionPlaceholder")} />
              </div>

              {/* الخلاصة */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="font-semibold">{t("committee.summary")} <span className="text-destructive">*</span></Label>
                  {decidedByName && (
                    <span className="text-xs text-orange-700 bg-orange-100 rounded-full px-2 py-0.5">{decidedByName}</span>
                  )}
                  {committeeDecided && <SavedBadge />}
                </div>
                {committeeDecided && cr?.decidedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t("committee.decidedAt", { date: new Date(cr.decidedAt).toLocaleString("en-GB") })}
                  </p>
                )}
                <Textarea rows={3} disabled={committeeDecided} value={decisionForm.finalSummary} onChange={(e) => setDecisionForm((f) => ({ ...f, finalSummary: e.target.value }))} placeholder={t("committee.summaryPlaceholder")} />
              </div>

              {/* The committee stage now reads as "معاينة"; COMMITTEE_REVIEW is
                  still accepted for cases saved before the statuses changed. */}
              {(c.status === STATUS_BY_TAB.committee_review || c.status === "COMMITTEE_REVIEW") && !allOpinionsSaved && (
                <div className="pt-4">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSaveCommitteeAll}
                    disabled={submitOpinion.isPending}
                  >
                    {submitOpinion.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                    {t("committee.saveOpinions")}
                  </Button>
                </div>
              )}
            </div>
          </Section>

          {/* القرار النهائي */}
          <Section title={t("committee.finalDecisionTitle")}>
            <div className="space-y-3">
              {/* هل المريض مناسب للطرف الصناعي؟ */}
              <div className="space-y-1.5">
                <Label>{t("committee.suitableQuestion")}</Label>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{t("committee.notSuitable")}</span>
                    <Switch
                      disabled={committeeDecided}
                      checked={committeeSuitForm.prosthesisSuitable === true}
                      onCheckedChange={(v) => setCommitteeSuitForm((f) => ({
                        ...f,
                        prosthesisSuitable: v,
                        proposedProsthesisType: v ? f.proposedProsthesisType : "",
                      }))}
                    />
                    <span className="text-sm text-muted-foreground">{t("committee.suitable")}</span>
                  </div>
                  {/* Only meaningful when the answer above is "مناسب" — labelled so
                      it reads as part of that question, not as a stray field. */}
                  {committeeSuitForm.prosthesisSuitable === true && (
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-xs">{t("committee.proposedType")}</Label>
                      <Input
                        className="h-8 text-sm"
                        disabled={committeeDecided}
                        placeholder={t("committee.proposedTypePlaceholder")}
                        value={committeeSuitForm.proposedProsthesisType}
                        onChange={(e) => setCommitteeSuitForm((f) => ({ ...f, proposedProsthesisType: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              </div>
              {/* التوقيعات أُزيلت من تبويب اللجنة */}
              {(c.status === STATUS_BY_TAB.committee_review || c.status === "COMMITTEE_REVIEW" || c.status === "COMMITTEE_APPROVED") && !committeeDecided && (
                <Button onClick={handleSubmitDecision} disabled={!decisionForm.finalSummary || submitDecision.isPending} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                  {submitDecision.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                  {t("committee.saveDecision")}
                </Button>
              )}
            </div>
          </Section>
          </fieldset>
        </TabsContent>

        {/* ── FITTING ─────────────────────────────────────────────────────── */}
        <TabsContent value="fitting" className="mt-4 space-y-4" dir={isRtl ? "rtl" : "ltr"}>
          <fieldset disabled={caseLocked} className="space-y-4 min-w-0">
          <Section title={t("fitting.title")}>
            <div className="space-y-5">

              {/* موقع أجزاء الطرف الصناعي */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">{t("fitting.partsLocation")}</p>
                <div className="flex gap-6">
                  {(["WAREHOUSE", "EXTERNAL"] as const).map((val) => (
                    <label key={val} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="sourceLocation"
                        checked={compShared.sourceLocation === val}
                        onChange={() => setCompShared((s) => ({ ...s, sourceLocation: val }))}
                        className="accent-primary"
                      />
                      {val === "WAREHOUSE" ? t("fitting.warehouse") : t("fitting.external")}
                    </label>
                  ))}
                </div>
              </div>

              {/* الشركة */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">{t("fitting.company")}</p>
                <div className="flex flex-wrap items-center gap-5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="supplier"
                      checked={compShared.supplier === "OTTOBOCK"}
                      onChange={() => setCompShared((s) => ({ ...s, supplier: "OTTOBOCK" }))}
                      className="accent-primary"
                    />
                    OTTOBOCK
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="supplier"
                      checked={compShared.supplier === "OTHER"}
                      onChange={() => setCompShared((s) => ({ ...s, supplier: "OTHER" }))}
                      className="accent-primary"
                    />
                    {t("fitting.other")}
                  </label>
                  {compShared.supplier === "OTHER" && (
                    <Input
                      className="h-7 w-44 text-sm"
                      placeholder={t("fitting.companyName")}
                      value={compShared.supplierOther}
                      onChange={(e) => setCompShared((s) => ({ ...s, supplierOther: e.target.value }))}
                    />
                  )}
                </div>
              </div>

              {/* جدول الأجزاء */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">{t("fitting.partsWithCode")}</p>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="border border-border px-2 py-1.5 text-center w-9 font-medium">#</th>
                      <th className="border border-border px-3 py-1.5 text-right font-medium">{t("fitting.name")}</th>
                      <th className="border border-border px-3 py-1.5 text-right font-medium">{t("fitting.code")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compRows.map((row, i) => {
                      const selectedItem = inventoryItems.find((it: any) => it.id === row.inventoryItemId);
                      return (
                        <tr key={i}>
                          <td className="border border-border px-2 py-0.5 text-center text-muted-foreground text-xs">{i + 1}</td>
                          <td className="border border-border p-0.5">
                            <InventoryItemCombobox
                              items={catalogInventoryItems}
                              value={row.inventoryItemId}
                              onChange={(v) => setCompRows((prev) => prev.map((r, j) => j === i ? { inventoryItemId: v } : r))}
                              onAddCustom={(search) => setCustomPartDialog({ open: true, name: "", code: search })}
                              className="h-7 border-0 shadow-none text-sm bg-transparent"
                            />
                          </td>
                          <td className="border border-border px-3 py-1.5 text-sm font-mono text-muted-foreground">
                            {selectedItem?.code ?? ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Button
                onClick={handleAddComponents}
                disabled={addComponent.isPending || updateStatus.isPending || !compRows.some((r) => r.inventoryItemId)}
                className="w-full gap-2"
              >
                {(addComponent.isPending || updateStatus.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {t("fitting.savePartsAndAdvance")}
              </Button>

              {/* الأجزاء المضافة */}
              {components.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">{t("fitting.addedParts")}</p>
                  <div className="rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-right p-2 font-medium">{t("fitting.code")}</th>
                          <th className="text-right p-2 font-medium">{t("fitting.part")}</th>
                          <th className="text-right p-2 font-medium">{t("fitting.company")}</th>
                          <th className="text-right p-2 font-medium">{t("fitting.source")}</th>
                          <th className="text-right p-2 font-medium">{t("fitting.addedDate")}</th>
                          <th className="text-right p-2 font-medium">{t("fitting.requestStatusCol")}</th>
                          <th className="text-right p-2 font-medium">{t("fitting.inventory")}</th>
                          <th className="p-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {components.map((comp) => {
                          // The backend returns the linked inventory part-request
                          // inline as comp.inventoryRequest (status + notes). Prefer
                          // it; only fall back to matching against the inventory
                          // list for old data saved before the field existed
                          // (inventoryRequest === undefined).
                          const compCode = comp.partCode ?? comp.code;
                          const legacyReq = comp.inventoryRequest === undefined
                            ? inventoryItems.find((it: any) =>
                                it.status != null && (
                                  (comp.inventoryItemId && it.linkedInventoryItemId === comp.inventoryItemId) ||
                                  (compCode && it.code === compCode)
                                ))
                            : null;
                          const reqStatus = comp.inventoryRequest?.status ?? legacyReq?.status ?? null;
                          const reqNotes = comp.inventoryRequest?.notes ?? legacyReq?.notes ?? null;
                          const matched = comp.matchedInInventory
                            ?? (comp.inventoryRequest === undefined
                                ? (legacyReq ? true : undefined)
                                : comp.inventoryRequest !== null);
                          return (
                          <tr key={comp.id} className="border-t">
                            <td className="p-2 font-mono text-xs">{comp.partCode ?? comp.code ?? "—"}</td>
                            <td className="p-2">{comp.partName ?? comp.name ?? "—"}</td>
                            <td className="p-2 text-muted-foreground">{comp.supplier ?? "—"}</td>
                            <td className="p-2 text-muted-foreground">{(() => { const k = (comp.sourceLocation ?? comp.source) as string; return k ? t(`fitting.srcLoc.${k}` as any, { defaultValue: k }) : "—"; })()}</td>
                            <td className="p-2 text-muted-foreground text-xs">
                              {comp.addedAt ? new Date(comp.addedAt).toLocaleDateString("en-GB") : "—"}
                            </td>
                            <td className="p-2">
                              {!reqStatus ? (
                                <span className="text-muted-foreground text-xs">—</span>
                              ) : reqNotes ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button type="button">
                                      <Badge variant="outline" className={`text-xs cursor-pointer ${REQUEST_STATUS_BADGE[reqStatus]}`}>
                                        {t(`fitting.reqStatus.${reqStatus}` as any, { defaultValue: reqStatus })}
                                      </Badge>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 text-sm">{reqNotes}</PopoverContent>
                                </Popover>
                              ) : (
                                <Badge variant="outline" className={`text-xs ${REQUEST_STATUS_BADGE[reqStatus]}`}>
                                  {t(`fitting.reqStatus.${reqStatus}` as any, { defaultValue: reqStatus })}
                                </Badge>
                              )}
                            </td>
                            <td className="p-2">
                              {reqStatus === "APPROVED" || reqStatus === "DONE"
                                ? <span className="text-xs text-green-600 font-medium">{t("fitting.deducted")}</span>
                                : reqStatus === "PENDING"
                                ? <span className="text-xs text-amber-600 font-medium">{t("fitting.pendingShort")}</span>
                                : reqStatus === "NOT_AVAILABLE"
                                ? <span className="text-xs text-red-600 font-medium">{t("fitting.notDeducted")}</span>
                                : matched === false
                                ? <span className="text-xs text-orange-600 font-medium">{t("fitting.notInInventory")}</span>
                                : "—"}
                            </td>
                            <td className="p-2">
                              <button onClick={() => setConfirmDelComp(comp.id)} className="text-destructive hover:opacity-70">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* إضافة قطعة غير مسجّلة بالمخزون (سيناريو 2) */}
              <Dialog open={customPartDialog.open} onOpenChange={(open) => setCustomPartDialog((s) => ({ ...s, open }))}>
                <DialogContent className="max-w-sm" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>{t("fitting.addCustomTitle")}</DialogTitle>
                    <DialogDescription>{t("fitting.addCustomDesc")}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-1">
                    <div className="space-y-1.5">
                      <Label>{t("fitting.partName")}</Label>
                      <Input
                        value={customPartDialog.name}
                        onChange={(e) => setCustomPartDialog((s) => ({ ...s, name: e.target.value }))}
                        placeholder={t("fitting.partNamePlaceholder")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("fitting.codeRequired")}</Label>
                      <Input
                        value={customPartDialog.code}
                        onChange={(e) => setCustomPartDialog((s) => ({ ...s, code: e.target.value }))}
                        placeholder={t("fitting.codePlaceholder")}
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <DialogFooter className="flex gap-2 justify-end sm:justify-end">
                    <Button variant="outline" onClick={() => setCustomPartDialog({ open: false, name: "", code: "" })}>{t("fitting.cancel")}</Button>
                    <Button
                      onClick={handleAddCustomPart}
                      disabled={addComponent.isPending || !customPartDialog.name.trim() || !customPartDialog.code.trim()}
                    >
                      {addComponent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("fitting.add")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={!!confirmDelComp} onOpenChange={(open) => { if (!open) setConfirmDelComp(null); }}>
                <DialogContent className="max-w-sm" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>{t("fitting.confirmDeleteTitle")}</DialogTitle>
                    <DialogDescription>{t("fitting.confirmDeleteDesc")}</DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="flex gap-2 justify-end sm:justify-end">
                    <Button variant="outline" onClick={() => setConfirmDelComp(null)}>{t("fitting.no")}</Button>
                    <Button variant="destructive" disabled={deleteComponent.isPending}
                      onClick={() => { if (confirmDelComp) { deleteComponent.mutate({ id, compId: confirmDelComp }); setConfirmDelComp(null); } }}>
                      {deleteComponent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("fitting.yesDelete")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* الطرف مكتمل */}
              <div className="border-t pt-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={c.prosthesisCompleted ?? false}
                    onChange={() => updateCase.mutateAsync({ id, dto: { prosthesisCompleted: !c.prosthesisCompleted } })}
                    className="h-4 w-4 rounded-sm shrink-0 checkbox-orange"
                    disabled={updateCase.isPending}
                  />
                  <span className="text-sm font-medium">{t("fitting.prosthesisComplete")}</span>
                </label>
                {(c.status === STATUS_BY_TAB.fitting || c.status === "FITTING") && (
                  <Button onClick={handleAdvanceToGait} disabled={updateStatus.isPending} className="w-full">
                    {t("fitting.goToGait")}
                  </Button>
                )}
              </div>

            </div>
          </Section>
          </fieldset>
        </TabsContent>

        {/* ── MEASUREMENT SHEET ───────────────────────────────────────────── */}
        <TabsContent value="measurement_sheet" className="mt-4 space-y-4" dir="rtl">
          <fieldset disabled={caseLocked} className="space-y-4 min-w-0">
          {/* Type selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(["ankle_disarticulation", "below_knee", "knee_disarticulation", "above_knee", "hemipelvectomy", "elbow_disarticulation", "transhumeral", "transradial"] as MeasureSheetType[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setMeasureSheetType((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])}
                className={`rounded-lg border-2 py-4 text-sm font-semibold transition-colors ${
                  measureSheetType.includes(key)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`measurement.selectType.${key}`)}
              </button>
            ))}
          </div>

          {/* Ankle disarticulation form */}
          {measureSheetType.includes("ankle_disarticulation") && (
            <Section title={t("measurement.sheetTitle", { type: t("measurement.selectType.ankle_disarticulation") })}>
              <div className="space-y-5">
                <MeasurementHistoryList records={ankleDisarticulationRecords} />

                {(ankleDisarticulationRecords.length === 0 || measureAddOpen.ankle_disarticulation) && (
                  <div className="space-y-5">
                    {/* Side + foot measurement + notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("measurement.side")}</Label>
                        <Select
                          value={ankleForm.side}
                          onValueChange={(v) => setAnkleForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">{t("measurement.right")}</SelectItem>
                            <SelectItem value="LEFT">{t("measurement.left")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("measurement.footMeasurement")}</Label>
                        <Input
                          placeholder={t("measurement.egCm", { n: 26 })}
                          value={ankleForm.footMeasurement}
                          onChange={(e) => setAnkleForm((f) => ({ ...f, footMeasurement: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("measurement.notes")}</Label>
                        <Input
                          placeholder={t("measurement.notesPlaceholder")}
                          value={ankleForm.notes}
                          onChange={(e) => setAnkleForm((f) => ({ ...f, notes: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Measurements grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Affected limb — 19 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.affectedLimbRange", { range: "1–19" })}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 19 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                                {k}
                              </span>
                              <Input
                                className="h-8 text-sm"
                                placeholder="cm"
                                value={ankleForm.affectedLimb[k] ?? ""}
                                onChange={(e) =>
                                  setAnkleForm((f) => ({
                                    ...f,
                                    affectedLimb: { ...f.affectedLimb, [k]: e.target.value },
                                  }))
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sound limb — 5 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.soundLimbRange", { range: "1–5" })}</p>
                        <div className="grid grid-cols-1 gap-2 max-w-xs">
                          {Array.from({ length: 5 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                                {k}
                              </span>
                              <Input
                                className="h-8 text-sm"
                                placeholder="cm"
                                value={ankleForm.soundLimb[k] ?? ""}
                                onChange={(e) =>
                                  setAnkleForm((f) => ({
                                    ...f,
                                    soundLimb: { ...f.soundLimb, [k]: e.target.value },
                                  }))
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Save */}
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={async () => {
                          const dto: AnkleDisarticulationDto = {
                            side: ankleForm.side,
                            notes: ankleForm.notes || undefined,
                            footMeasurement: ankleForm.footMeasurement || undefined,
                            soundLimb: Object.keys(ankleForm.soundLimb).length ? ankleForm.soundLimb : undefined,
                            affectedLimb: Object.keys(ankleForm.affectedLimb).length ? ankleForm.affectedLimb : undefined,
                          };
                          await submitAnkleMeasurement.mutateAsync({ id, dto });
                          setMeasureAddOpen((s) => ({ ...s, ankle_disarticulation: false }));
                        }}
                        disabled={submitAnkleMeasurement.isPending}
                      >
                        {submitAnkleMeasurement.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                        {t("measurement.saveSheet")}
                      </Button>
                    </div>
                  </div>
                )}

                {ankleDisarticulationRecords.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline" size="sm" className="gap-1.5"
                      onClick={() => setMeasureAddOpen((s) => ({ ...s, ankle_disarticulation: !s.ankle_disarticulation }))}
                    >
                      {measureAddOpen.ankle_disarticulation ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {measureAddOpen.ankle_disarticulation ? t("measurement.cancel") : t("measurement.addNew")}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Knee disarticulation form */}
          {measureSheetType.includes("knee_disarticulation") && (
            <Section title={t("measurement.sheetTitle", { type: t("measurement.selectType.knee_disarticulation") })}>
              <div className="space-y-5">
                <MeasurementHistoryList records={kneeDisarticulationRecords} />

                {(kneeDisarticulationRecords.length === 0 || measureAddOpen.knee_disarticulation) && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("measurement.side")}</Label>
                        <Select value={kneeForm.side} onValueChange={(v) => setKneeForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">{t("measurement.right")}</SelectItem>
                            <SelectItem value="LEFT">{t("measurement.left")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("measurement.footMeasurement")}</Label>
                        <Input placeholder={t("measurement.egCm", { n: 26 })} value={kneeForm.footMeasurement} onChange={(e) => setKneeForm((f) => ({ ...f, footMeasurement: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("measurement.notes")}</Label>
                        <Input placeholder={t("measurement.notesPlaceholder")} value={kneeForm.notes} onChange={(e) => setKneeForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Affected limb — 12 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.affectedLimbRange", { range: "1–12" })}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{k}</span>
                              <Input className="h-8 text-sm" placeholder="cm"
                                value={kneeForm.affectedLimb[k] ?? ""}
                                onChange={(e) => setKneeForm((f) => ({ ...f, affectedLimb: { ...f.affectedLimb, [k]: e.target.value } }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sound limb — 5 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.soundLimbRange", { range: "1–5" })}</p>
                        <div className="grid grid-cols-1 gap-2 max-w-xs">
                          {Array.from({ length: 5 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{k}</span>
                              <Input className="h-8 text-sm" placeholder="cm"
                                value={kneeForm.soundLimb[k] ?? ""}
                                onChange={(e) => setKneeForm((f) => ({ ...f, soundLimb: { ...f.soundLimb, [k]: e.target.value } }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={async () => {
                          const dto: KneeDisarticulationDto = {
                            side: kneeForm.side,
                            notes: kneeForm.notes || undefined,
                            footMeasurement: kneeForm.footMeasurement || undefined,
                            soundLimb: Object.keys(kneeForm.soundLimb).length ? kneeForm.soundLimb : undefined,
                            affectedLimb: Object.keys(kneeForm.affectedLimb).length ? kneeForm.affectedLimb : undefined,
                          };
                          await submitKneeMeasurement.mutateAsync({ id, dto });
                          setMeasureAddOpen((s) => ({ ...s, knee_disarticulation: false }));
                        }}
                        disabled={submitKneeMeasurement.isPending}
                      >
                        {submitKneeMeasurement.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                        {t("measurement.saveSheet")}
                      </Button>
                    </div>
                  </div>
                )}

                {kneeDisarticulationRecords.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline" size="sm" className="gap-1.5"
                      onClick={() => setMeasureAddOpen((s) => ({ ...s, knee_disarticulation: !s.knee_disarticulation }))}
                    >
                      {measureAddOpen.knee_disarticulation ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {measureAddOpen.knee_disarticulation ? t("measurement.cancel") : t("measurement.addNew")}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Transfemoral (above knee) form */}
          {measureSheetType.includes("above_knee") && (
            <Section title={t("measurement.sheetTitle", { type: t("measurement.selectType.above_knee") })}>
              <div className="space-y-5">
                <MeasurementHistoryList records={transfemoralRecords} />

                {(transfemoralRecords.length === 0 || measureAddOpen.above_knee) && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("measurement.side")}</Label>
                        <Select value={transfemoralForm.side} onValueChange={(v) => setTransfemoralForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">{t("measurement.right")}</SelectItem>
                            <SelectItem value="LEFT">{t("measurement.left")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("measurement.footMeasurement")}</Label>
                        <Input placeholder={t("measurement.egCm", { n: 27 })} value={transfemoralForm.footMeasurement} onChange={(e) => setTransfemoralForm((f) => ({ ...f, footMeasurement: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("measurement.notes")}</Label>
                        <Input placeholder={t("measurement.notesPlaceholder")} value={transfemoralForm.notes} onChange={(e) => setTransfemoralForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Affected limb — 12 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.affectedLimbRange", { range: "1–12" })}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{k}</span>
                              <Input className="h-8 text-sm" placeholder="cm"
                                value={transfemoralForm.affectedLimb[k] ?? ""}
                                onChange={(e) => setTransfemoralForm((f) => ({ ...f, affectedLimb: { ...f.affectedLimb, [k]: e.target.value } }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sound limb — 11 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.soundLimbRange", { range: "1–11" })}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 11 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{k}</span>
                              <Input className="h-8 text-sm" placeholder="cm"
                                value={transfemoralForm.soundLimb[k] ?? ""}
                                onChange={(e) => setTransfemoralForm((f) => ({ ...f, soundLimb: { ...f.soundLimb, [k]: e.target.value } }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={async () => {
                          const dto: TransfemoralDto = {
                            side: transfemoralForm.side,
                            notes: transfemoralForm.notes || undefined,
                            footMeasurement: transfemoralForm.footMeasurement || undefined,
                            soundLimb: Object.keys(transfemoralForm.soundLimb).length ? transfemoralForm.soundLimb : undefined,
                            affectedLimb: Object.keys(transfemoralForm.affectedLimb).length ? transfemoralForm.affectedLimb : undefined,
                          };
                          await submitTransfemoralMeasurement.mutateAsync({ id, dto });
                          setMeasureAddOpen((s) => ({ ...s, above_knee: false }));
                        }}
                        disabled={submitTransfemoralMeasurement.isPending}
                      >
                        {submitTransfemoralMeasurement.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                        {t("measurement.saveSheet")}
                      </Button>
                    </div>
                  </div>
                )}

                {transfemoralRecords.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline" size="sm" className="gap-1.5"
                      onClick={() => setMeasureAddOpen((s) => ({ ...s, above_knee: !s.above_knee }))}
                    >
                      {measureAddOpen.above_knee ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {measureAddOpen.above_knee ? t("measurement.cancel") : t("measurement.addNew")}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Transtibial (below knee) form */}
          {measureSheetType.includes("below_knee") && (
            <Section title={t("measurement.sheetTitle", { type: t("measurement.selectType.below_knee") })}>
              <div className="space-y-5">
                <MeasurementHistoryList records={transtibialRecords} />

                {(transtibialRecords.length === 0 || measureAddOpen.below_knee) && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("measurement.side")}</Label>
                        <Select value={transtibialForm.side} onValueChange={(v) => setTranstibialForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">{t("measurement.right")}</SelectItem>
                            <SelectItem value="LEFT">{t("measurement.left")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("measurement.footMeasurement")}</Label>
                        <Input placeholder={t("measurement.egCm", { n: 26 })} value={transtibialForm.footMeasurement} onChange={(e) => setTranstibialForm((f) => ({ ...f, footMeasurement: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("measurement.notes")}</Label>
                        <Input placeholder={t("measurement.notesPlaceholder")} value={transtibialForm.notes} onChange={(e) => setTranstibialForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Affected limb — 19 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.affectedLimbRange", { range: "1–19" })}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 19 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{k}</span>
                              <Input className="h-8 text-sm" placeholder="cm"
                                value={transtibialForm.affectedLimb[k] ?? ""}
                                onChange={(e) => setTranstibialForm((f) => ({ ...f, affectedLimb: { ...f.affectedLimb, [k]: e.target.value } }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sound limb — 5 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.soundLimbRange", { range: "1–5" })}</p>
                        <div className="grid grid-cols-1 gap-2 max-w-xs">
                          {Array.from({ length: 5 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{k}</span>
                              <Input className="h-8 text-sm" placeholder="cm"
                                value={transtibialForm.soundLimb[k] ?? ""}
                                onChange={(e) => setTranstibialForm((f) => ({ ...f, soundLimb: { ...f.soundLimb, [k]: e.target.value } }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={async () => {
                          const dto: TranstibialDto = {
                            side: transtibialForm.side,
                            notes: transtibialForm.notes || undefined,
                            footMeasurement: transtibialForm.footMeasurement || undefined,
                            soundLimb: Object.keys(transtibialForm.soundLimb).length ? transtibialForm.soundLimb : undefined,
                            affectedLimb: Object.keys(transtibialForm.affectedLimb).length ? transtibialForm.affectedLimb : undefined,
                          };
                          await submitTranstibialMeasurement.mutateAsync({ id, dto });
                          setMeasureAddOpen((s) => ({ ...s, below_knee: false }));
                        }}
                        disabled={submitTranstibialMeasurement.isPending}
                      >
                        {submitTranstibialMeasurement.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                        {t("measurement.saveSheet")}
                      </Button>
                    </div>
                  </div>
                )}

                {transtibialRecords.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline" size="sm" className="gap-1.5"
                      onClick={() => setMeasureAddOpen((s) => ({ ...s, below_knee: !s.below_knee }))}
                    >
                      {measureAddOpen.below_knee ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {measureAddOpen.below_knee ? t("measurement.cancel") : t("measurement.addNew")}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Transradial (below elbow) form */}
          {measureSheetType.includes("transradial") && (
            <Section title={t("measurement.sheetTitle", { type: t("measurement.selectType.transradial") })}>
              <div className="space-y-5">
                <MeasurementHistoryList records={transradialRecords} />

                {(transradialRecords.length === 0 || measureAddOpen.transradial) && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("measurement.side")}</Label>
                        <Select value={transradialForm.side} onValueChange={(v) => setTransradialForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">{t("measurement.right")}</SelectItem>
                            <SelectItem value="LEFT">{t("measurement.left")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("measurement.notes")}</Label>
                        <Input placeholder={t("measurement.notesPlaceholder")} value={transradialForm.notes} onChange={(e) => setTransradialForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sound limb — 7 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.soundLimbRange", { range: "1–7" })}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 7 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{k}</span>
                              <Input className="h-8 text-sm" placeholder="cm"
                                value={transradialForm.soundLimb[k] ?? ""}
                                onChange={(e) => setTransradialForm((f) => ({ ...f, soundLimb: { ...f.soundLimb, [k]: e.target.value } }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Affected limb — 10 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.affectedLimbRange", { range: "1–10" })}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{k}</span>
                              <Input className="h-8 text-sm" placeholder="cm"
                                value={transradialForm.affectedLimb[k] ?? ""}
                                onChange={(e) => setTransradialForm((f) => ({ ...f, affectedLimb: { ...f.affectedLimb, [k]: e.target.value } }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={async () => {
                          const dto: TransradialDto = {
                            side: transradialForm.side,
                            notes: transradialForm.notes || undefined,
                            soundLimb: Object.keys(transradialForm.soundLimb).length ? transradialForm.soundLimb : undefined,
                            affectedLimb: Object.keys(transradialForm.affectedLimb).length ? transradialForm.affectedLimb : undefined,
                          };
                          await submitTransradialMeasurement.mutateAsync({ id, dto });
                          setMeasureAddOpen((s) => ({ ...s, transradial: false }));
                        }}
                        disabled={submitTransradialMeasurement.isPending}
                      >
                        {submitTransradialMeasurement.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                        {t("measurement.saveSheet")}
                      </Button>
                    </div>
                  </div>
                )}

                {transradialRecords.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline" size="sm" className="gap-1.5"
                      onClick={() => setMeasureAddOpen((s) => ({ ...s, transradial: !s.transradial }))}
                    >
                      {measureAddOpen.transradial ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {measureAddOpen.transradial ? t("measurement.cancel") : t("measurement.addNew")}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Transhumeral (above elbow) form */}
          {measureSheetType.includes("transhumeral") && (
            <Section title={t("measurement.sheetTitle", { type: t("measurement.selectType.transhumeral") })}>
              <div className="space-y-5">
                <MeasurementHistoryList records={transhumeralRecords} />

                {(transhumeralRecords.length === 0 || measureAddOpen.transhumeral) && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("measurement.side")}</Label>
                        <Select value={transhumeralForm.side} onValueChange={(v) => setTranshumeralForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">{t("measurement.right")}</SelectItem>
                            <SelectItem value="LEFT">{t("measurement.left")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("measurement.notes")}</Label>
                        <Input placeholder={t("measurement.notesPlaceholder")} value={transhumeralForm.notes} onChange={(e) => setTranshumeralForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sound limb — 10 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.soundLimbRange", { range: "1–10" })}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{k}</span>
                              <Input className="h-8 text-sm" placeholder="cm"
                                value={transhumeralForm.soundLimb[k] ?? ""}
                                onChange={(e) => setTranshumeralForm((f) => ({ ...f, soundLimb: { ...f.soundLimb, [k]: e.target.value } }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Affected limb — 6 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.affectedLimbRange", { range: "1–6" })}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 6 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{k}</span>
                              <Input className="h-8 text-sm" placeholder="cm"
                                value={transhumeralForm.affectedLimb[k] ?? ""}
                                onChange={(e) => setTranshumeralForm((f) => ({ ...f, affectedLimb: { ...f.affectedLimb, [k]: e.target.value } }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={async () => {
                          const dto: TranshumeralDto = {
                            side: transhumeralForm.side,
                            notes: transhumeralForm.notes || undefined,
                            soundLimb: Object.keys(transhumeralForm.soundLimb).length ? transhumeralForm.soundLimb : undefined,
                            affectedLimb: Object.keys(transhumeralForm.affectedLimb).length ? transhumeralForm.affectedLimb : undefined,
                          };
                          await submitTranshumeralMeasurement.mutateAsync({ id, dto });
                          setMeasureAddOpen((s) => ({ ...s, transhumeral: false }));
                        }}
                        disabled={submitTranshumeralMeasurement.isPending}
                      >
                        {submitTranshumeralMeasurement.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                        {t("measurement.saveSheet")}
                      </Button>
                    </div>
                  </div>
                )}

                {transhumeralRecords.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline" size="sm" className="gap-1.5"
                      onClick={() => setMeasureAddOpen((s) => ({ ...s, transhumeral: !s.transhumeral }))}
                    >
                      {measureAddOpen.transhumeral ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {measureAddOpen.transhumeral ? t("measurement.cancel") : t("measurement.addNew")}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Elbow disarticulation form */}
          {measureSheetType.includes("elbow_disarticulation") && (
            <Section title={t("measurement.sheetTitle", { type: t("measurement.selectType.elbow_disarticulation") })}>
              <div className="space-y-5">
                <MeasurementHistoryList records={elbowDisarticulationRecords} />

                {(elbowDisarticulationRecords.length === 0 || measureAddOpen.elbow_disarticulation) && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("measurement.side")}</Label>
                        <Select value={elbowForm.side} onValueChange={(v) => setElbowForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">{t("measurement.right")}</SelectItem>
                            <SelectItem value="LEFT">{t("measurement.left")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("measurement.notes")}</Label>
                        <Input placeholder={t("measurement.notesPlaceholder")} value={elbowForm.notes} onChange={(e) => setElbowForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sound limb — 12 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.soundLimbRange", { range: "1–12" })}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{k}</span>
                              <Input className="h-8 text-sm" placeholder="cm"
                                value={elbowForm.soundLimb[k] ?? ""}
                                onChange={(e) => setElbowForm((f) => ({ ...f, soundLimb: { ...f.soundLimb, [k]: e.target.value } }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Affected limb — 9 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.affectedLimbRange", { range: "1–9" })}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 9 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{k}</span>
                              <Input className="h-8 text-sm" placeholder="cm"
                                value={elbowForm.affectedLimb[k] ?? ""}
                                onChange={(e) => setElbowForm((f) => ({ ...f, affectedLimb: { ...f.affectedLimb, [k]: e.target.value } }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={async () => {
                          const dto: ElbowDisarticulationDto = {
                            side: elbowForm.side,
                            notes: elbowForm.notes || undefined,
                            soundLimb: Object.keys(elbowForm.soundLimb).length ? elbowForm.soundLimb : undefined,
                            affectedLimb: Object.keys(elbowForm.affectedLimb).length ? elbowForm.affectedLimb : undefined,
                          };
                          await submitElbowMeasurement.mutateAsync({ id, dto });
                          setMeasureAddOpen((s) => ({ ...s, elbow_disarticulation: false }));
                        }}
                        disabled={submitElbowMeasurement.isPending}
                      >
                        {submitElbowMeasurement.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                        {t("measurement.saveSheet")}
                      </Button>
                    </div>
                  </div>
                )}

                {elbowDisarticulationRecords.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline" size="sm" className="gap-1.5"
                      onClick={() => setMeasureAddOpen((s) => ({ ...s, elbow_disarticulation: !s.elbow_disarticulation }))}
                    >
                      {measureAddOpen.elbow_disarticulation ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {measureAddOpen.elbow_disarticulation ? t("measurement.cancel") : t("measurement.addNew")}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Hemipelvectomy (through pelvis) form */}
          {measureSheetType.includes("hemipelvectomy") && (
            <Section title={t("measurement.sheetTitle", { type: t("measurement.selectType.hemipelvectomy") })}>
              <div className="space-y-5">
                <MeasurementHistoryList records={hemipelvectomyRecords} />

                {(hemipelvectomyRecords.length === 0 || measureAddOpen.hemipelvectomy) && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t("measurement.side")}</Label>
                        <Select value={hemipelvectomyForm.side} onValueChange={(v) => setHemipelvectomyForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">{t("measurement.right")}</SelectItem>
                            <SelectItem value="LEFT">{t("measurement.left")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("measurement.footMeasurement")}</Label>
                        <Input placeholder={t("measurement.egCm", { n: 27 })} value={hemipelvectomyForm.footMeasurement} onChange={(e) => setHemipelvectomyForm((f) => ({ ...f, footMeasurement: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("measurement.notes")}</Label>
                        <Input placeholder={t("measurement.notesPlaceholder")} value={hemipelvectomyForm.notes} onChange={(e) => setHemipelvectomyForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sound limb — 15 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.soundLimbRange", { range: "1–15" })}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 15 }, (_, i) => String(i + 1)).map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{k}</span>
                              <Input className="h-8 text-sm" placeholder="cm"
                                value={hemipelvectomyForm.soundLimb[k] ?? ""}
                                onChange={(e) => setHemipelvectomyForm((f) => ({ ...f, soundLimb: { ...f.soundLimb, [k]: e.target.value } }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Affected limb — 1 field only */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">{t("measurement.affectedLimb")}</p>
                        <div className="flex items-center gap-2 max-w-xs">
                          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">1</span>
                          <Input className="h-8 text-sm" placeholder="cm"
                            value={hemipelvectomyForm.affectedLimb["1"] ?? ""}
                            onChange={(e) => setHemipelvectomyForm((f) => ({ ...f, affectedLimb: { "1": e.target.value } }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={async () => {
                          const dto: HemipelvectomyDto = {
                            side: hemipelvectomyForm.side,
                            notes: hemipelvectomyForm.notes || undefined,
                            footMeasurement: hemipelvectomyForm.footMeasurement || undefined,
                            soundLimb: Object.keys(hemipelvectomyForm.soundLimb).length ? hemipelvectomyForm.soundLimb : undefined,
                            affectedLimb: hemipelvectomyForm.affectedLimb["1"] ? hemipelvectomyForm.affectedLimb : undefined,
                          };
                          await submitHemipelvectomyMeasurement.mutateAsync({ id, dto });
                          setMeasureAddOpen((s) => ({ ...s, hemipelvectomy: false }));
                        }}
                        disabled={submitHemipelvectomyMeasurement.isPending}
                      >
                        {submitHemipelvectomyMeasurement.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                        {t("measurement.saveSheet")}
                      </Button>
                    </div>
                  </div>
                )}

                {hemipelvectomyRecords.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline" size="sm" className="gap-1.5"
                      onClick={() => setMeasureAddOpen((s) => ({ ...s, hemipelvectomy: !s.hemipelvectomy }))}
                    >
                      {measureAddOpen.hemipelvectomy ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {measureAddOpen.hemipelvectomy ? t("measurement.cancel") : t("measurement.addNew")}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {measureSheetType.length === 0 && (
            <div className="rounded-lg border border-dashed flex items-center justify-center py-16">
              <p className="text-muted-foreground text-sm">{t("measurement.selectTypePrompt")}</p>
            </div>
          )}
          </fieldset>
        </TabsContent>

        {/* ── TREATMENT PROGRAM ───────────────────────────────────────────── */}
        <TabsContent value="treatment_program" className="mt-4 space-y-4" dir="rtl">
          <TreatmentProgramsSection
            caseId={id}
            staffList={staffList}
            currentUser={currentUser}
            locked={caseLocked}
          />
          <ReviewProgramsSection
            caseId={id}
            staffList={staffList}
            currentUser={currentUser}
            locked={caseLocked}
          />
        </TabsContent>

        {/* ── GAIT ANALYSIS ───────────────────────────────────────────────── */}
        <TabsContent value="gait_analysis" className="mt-4" dir={isRtl ? "rtl" : "ltr"}>
          <fieldset disabled={caseLocked} className="min-w-0">
          <GaitAnalysisSection caseId={id} staffList={staffList} patient={patientFull ?? caseData?.patient} />
          </fieldset>
        </TabsContent>

        {/* ── BALANCE ASSESSMENT ──────────────────────────────────────────── */}
        {ampTypes.includes("LOWER") && (
          <TabsContent value="balance_assessment" className="mt-4" dir={isRtl ? "rtl" : "ltr"}>
            <fieldset disabled={caseLocked} className="min-w-0">
              <BalanceAssessmentSection caseId={id} staffList={staffList} />
            </fieldset>
          </TabsContent>
        )}

        {/* ── FINAL EVALUATION (Pro-018) ───────────────────────────────── */}
        <TabsContent value="final_evaluation" className="mt-4" dir="rtl">
          <fieldset disabled={finalEvalLocked} className="space-y-4 min-w-0">

          {/* ── قسم 1: المعلومات الطبية ── */}
          <Section title={t("finalEval.medicalInfoTitle")} action={finalEvalLocked ? <SavedBadge /> : undefined}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finalEval.residualLimbCondition")}</Label>
                <Textarea rows={2} className="resize-none text-xs" value={finalEvalForm.residualLimbCondition ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, residualLimbCondition: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finalEval.suspensionSystem")}</Label>
                <Input value={finalEvalForm.suspensionSystemUsed ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, suspensionSystemUsed: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finalEval.socksLinersCount")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">{t("finalEval.socks")}</span>
                    <Input type="number" min={0} value={finalEvalForm.socksDelivered ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, socksDelivered: e.target.value === "" ? undefined : Number(e.target.value) }))} className="h-8 text-xs" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">{t("finalEval.liners")}</span>
                    <Input type="number" min={0} value={finalEvalForm.linersDelivered ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, linersDelivered: e.target.value === "" ? undefined : Number(e.target.value) }))} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finalEval.fittingDate")}</Label>
                <Input type="date" value={finalEvalForm.fittingDate ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, fittingDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finalEval.generalNotes")}</Label>
                <Textarea rows={2} className="resize-none text-xs" value={finalEvalForm.generalNotes ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, generalNotes: e.target.value }))} />
              </div>
            </div>
          </Section>

          {/* ── قسم 2: الرأي النهائي للجنة ── */}
          <Section title={t("finalEval.committeeFinalTitle")} action={finalEvalLocked ? <SavedBadge /> : undefined}>
            <div className="space-y-3">
              {([
                "physioOpinion",
                "departmentHeadOpinion",
                "prosthetistOpinion",
                "prosthetistSupervisorOpinion",
                "committeeHeadOpinion",
                "expertOpinion",
              ] as const).map((fld) => (
                <CollapsibleOpinionField
                  key={fld}
                  label={t(`finalEval.opinion.${fld}`)}
                  value={(finalEvalForm as any)[fld] ?? ""}
                  onChange={(v) => setFinalEvalForm((f) => ({ ...f, [fld]: v }))}
                />
              ))}
            </div>
          </Section>

          {/* ── قسم 3: اعتماد المدير الطبي ── */}
          <Section title={t("finalEval.directorApprovalTitle")} action={finalEvalLocked ? <SavedBadge /> : undefined}>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed border rounded-lg px-3 py-2.5 bg-muted/30">
                {t("finalEval.approvalStatement")}
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={!!finalEvalForm.readyForDelivery}
                    onChange={() => setFinalEvalForm((f) => ({ ...f, readyForDelivery: true, needsFollowUp: false, followUpPlan: "" }))}
                    className="w-[16px] h-[16px] checkbox-orange rounded-sm" />
                  <span className="text-sm">{t("finalEval.approvedForDelivery")}</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={!!finalEvalForm.needsFollowUp}
                    onChange={() => setFinalEvalForm((f) => ({ ...f, needsFollowUp: true, readyForDelivery: false }))}
                    className="w-[16px] h-[16px] checkbox-orange rounded-sm" />
                  <span className="text-sm">{t("finalEval.needsFollowUp")}</span>
                </label>
              </div>
              {/* The follow-up plan only makes sense for a case flagged as needing follow-up. */}
              {finalEvalForm.needsFollowUp && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("finalEval.followUpPlan")}</Label>
                  <Textarea rows={2} className="resize-none text-xs" value={finalEvalForm.followUpPlan ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, followUpPlan: e.target.value }))} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finalEval.generalNotes")}</Label>
                <Textarea rows={2} className="resize-none text-xs" value={finalEvalForm.medicalDirectorNotes ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, medicalDirectorNotes: e.target.value }))} />
              </div>
            </div>
          </Section>

          {/* ── قسم 4: تدقيق المدير ── */}
          <Section title={t("finalEval.managerAuditTitle")} action={finalEvalLocked ? <SavedBadge /> : undefined}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finalEval.generalNotes")}</Label>
                <Textarea rows={2} className="resize-none text-xs" value={finalEvalForm.managerNotes} onChange={(e) => setFinalEvalForm((f) => ({ ...f, managerNotes: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("finalEval.patientFile")}</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={finalEvalForm.patientFileComplete === true}
                      onChange={() => setFinalEvalForm((f) => ({ ...f, patientFileComplete: true }))}
                      className="w-[16px] h-[16px] checkbox-orange rounded-sm" />
                    <span className="text-sm">{t("finalEval.complete")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={finalEvalForm.patientFileComplete === false}
                      onChange={() => setFinalEvalForm((f) => ({ ...f, patientFileComplete: false }))}
                      className="w-[16px] h-[16px] checkbox-orange rounded-sm" />
                    <span className="text-sm">{t("finalEval.incomplete")}</span>
                  </label>
                </div>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold">{t("finalEval.managerSignature")}</p>
                <Select value={finalEvalForm.managerId || "none"}
                  onValueChange={(v) => setFinalEvalForm((f) => ({ ...f, managerId: v === "none" ? "" : v, managerSignatureUrl: "" }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("finalEval.chooseManager")} /></SelectTrigger>
                  <SelectContent>
                    {staffList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.fullName ?? s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {finalEvalForm.managerSignatureUrl ? (
                  <div className="relative">
                    <img src={finalEvalForm.managerSignatureUrl} alt={t("finalEval.managerSignature")} className="h-16 w-full object-contain border rounded bg-white" />
                    <button onClick={() => setFinalEvalForm((f) => ({ ...f, managerSignatureUrl: "" }))} className="absolute top-0 left-0 text-destructive text-xs p-0.5">✕</button>
                  </div>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={handleFinalEvalManagerSigClick} disabled={!finalEvalForm.managerId}>
                    {finalEvalForm.managerId ? t("finalEval.fetchUploadSignature") : t("finalEval.chooseManagerFirst")}
                  </Button>
                )}
                <input ref={finalEvalManagerSigRef} type="file" accept="image/*" className="hidden" onChange={handleFinalEvalManagerSigFileChange} />
              </div>
            </div>
          </Section>

          {/* ── الأزرار ── */}
          {!finalEvalLocked && (
            <div className="flex gap-2">
              <Button onClick={handleSubmitFinalEval} disabled={submitFinalEval.isPending} className="flex-1 gap-2">
                {submitFinalEval.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("finalEval.saveEval")}
              </Button>
            </div>
          )}
          </fieldset>
        </TabsContent>

        {/* ── DELIVERED (Pro-019) ──────────────────────────────────────────── */}
        <TabsContent value="delivered" className="mt-4 space-y-4" dir="rtl">
          <fieldset disabled={caseLocked} className="space-y-4 min-w-0">

          <Section
            title={t("delivered.title")}
            action={
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setStageTab("fitting")}>
                <Plus className="h-3.5 w-3.5" />
                {t("delivered.addPart")}
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">{t("delivered.dischargeDate")}</Label>
                  <Input type="date" value={proDeliveryHeader.inspectionDate} onChange={(e) => setProDeliveryHeader((f) => ({ ...f, inspectionDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("delivered.prosthetist")}</Label>
                  <Select value={proDeliveryHeader.prosthetistId || "none"} onValueChange={(v) => setProDeliveryHeader((f) => ({ ...f, prosthetistId: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder={t("delivered.choose")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("delivered.notSpecified")}</SelectItem>
                      {staffList.filter((e: any) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("الاطراف الصناعية") || e.department?.nameAr?.includes("الأطراف الصناعية"))).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("delivered.physiotherapist")}</Label>
                  <Select value={proDeliveryHeader.physiotherapistId || "none"} onValueChange={(v) => setProDeliveryHeader((f) => ({ ...f, physiotherapistId: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder={t("delivered.choose")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("delivered.notSpecified")}</SelectItem>
                      {staffList.filter((e: any) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("العلاج الفيزيائي") || e.department?.nameAr?.includes("العلاج الطبيعي"))).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── القطع المُسلَّمة — يزامنها الباك تلقائيًا من القطع المعتمدة بالمخزون (قراءة فقط) ── */}
              <div className="space-y-2">
                {(() => {
                  const items: any[] = (deliveryData19 as any)?.items ?? [];
                  return (
                    <>
                      <p className="text-sm font-semibold">
                        {t("delivered.deliveredParts")}{items.length ? ` (${items.length})` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("delivered.deliveredPartsAutoNote")}</p>
                      {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">{t("delivered.noPartsYet")}</p>
                      ) : (
                        <div className="rounded-lg border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-right p-2 font-medium">{t("delivered.name")}</th>
                                <th className="text-right p-2 font-medium">{t("delivered.symbol")}</th>
                                <th className="text-right p-2 font-medium">{t("delivered.quantity")}</th>
                                <th className="text-right p-2 font-medium">{t("delivered.company")}</th>
                                <th className="text-right p-2 font-medium">{t("delivered.source")}</th>
                                <th className="text-right p-2 font-medium">{t("delivered.addedDate")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item: any) => (
                                <tr key={item.id} className="border-t">
                                  <td className="p-2 font-medium">{item.deliveredProduct ?? "—"}</td>
                                  <td className="p-2 font-mono text-xs text-muted-foreground">{item.partCode ?? "—"}</td>
                                  <td className="p-2 text-muted-foreground">{item.quantity ?? "—"}</td>
                                  <td className="p-2 text-muted-foreground">{item.company ?? "—"}</td>
                                  <td className="p-2">
                                    <Badge variant="outline" className={cn("text-xs", item.sourceComponentId ? "border-green-300 bg-green-50 text-green-700" : "border-muted-foreground/30")}>
                                      {item.sourceComponentId ? t("delivered.auto") : t("delivered.manual")}
                                    </Badge>
                                  </td>
                                  <td className="p-2 text-muted-foreground text-xs">{item.itemAddedDate ? new Date(item.itemAddedDate).toLocaleDateString("en-GB") : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>


              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">{t("delivered.medicalDirector")}</Label>
                <Select value={proDeliveryHeader.medicalDirectorId || "none"} onValueChange={(v) => setProDeliveryHeader((f) => ({ ...f, medicalDirectorId: v === "none" ? "" : v, medicalDirectorSignatureUrl: "", medicalDirectorSignedAt: "" }))}>
                  <SelectTrigger><SelectValue placeholder={t("delivered.choose")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("delivered.notSpecified")}</SelectItem>
                    {staffList.filter((e: any) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("الادارة الطبية") || e.department?.nameAr?.includes("الإدارة الطبية"))).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Medical director signature */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold">{t("delivered.medicalDirectorSignature")}</p>
                {proDeliveryHeader.medicalDirectorSignatureUrl ? (
                  <div className="relative inline-block">
                    <img src={proDeliveryHeader.medicalDirectorSignatureUrl} alt={t("delivered.medicalDirectorSignature")} className="h-20 object-contain border rounded bg-white" />
                    <button onClick={() => setProDeliveryHeader((f) => ({ ...f, medicalDirectorSignatureUrl: "", medicalDirectorSignedAt: "" }))} className="absolute top-0 left-0 text-destructive text-xs p-0.5">✕</button>
                  </div>
                ) : (
                  <Button type="button" size="sm" variant="outline" onClick={handleMedicalDirectorSignatureClick} disabled={!proDeliveryHeader.medicalDirectorId}>
                    {proDeliveryHeader.medicalDirectorId ? t("delivered.fetchUploadSignature") : t("delivered.chooseMedicalDirectorFirst")}
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">{t("delivered.date")}</Label>
                <Input type="date" value={proDeliveryHeader.signatureDate} onChange={(e) => setProDeliveryHeader((f) => ({ ...f, signatureDate: e.target.value }))} />
              </div>

              <input ref={medicalDirectorSigRef} type="file" accept="image/*" className="hidden" onChange={handleMedicalDirectorSigFileChange} />

              <Button
                onClick={() => saveProsDelivery.mutateAsync({ caseId: id, dto: { inspectionDate: proDeliveryHeader.inspectionDate || undefined, prosthetistId: proDeliveryHeader.prosthetistId || undefined, physiotherapistId: proDeliveryHeader.physiotherapistId || undefined, medicalDirectorId: proDeliveryHeader.medicalDirectorId || undefined, medicalDirectorSignatureUrl: proDeliveryHeader.medicalDirectorSignatureUrl || undefined, medicalDirectorSignedAt: proDeliveryHeader.medicalDirectorSignedAt || undefined, signatureDate: proDeliveryHeader.signatureDate || undefined } })}
                disabled={saveProsDelivery.isPending}
                className="w-full gap-2"
              >
                {saveProsDelivery.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {t("delivered.saveDelivery")}
              </Button>
            </div>
          </Section>
          </fieldset>
        </TabsContent>

        {/* ── FINAL DELIVERY (approved items only) ─────────────────────────── */}
        <TabsContent value="final_delivery" className="mt-4 space-y-4" dir="rtl">
          {/* Not created yet — GET returns null until POST /final-delivery. */}
          {!finalDelivery ? (
            <Section title={t("finalDelivery.finalTitle")}>
              <div className="text-center py-10 space-y-3">
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {t("finalDelivery.notCreatedYet")}
                </p>
                <Button
                  onClick={() => createFinalDelivery.mutate({ caseId: id })}
                  disabled={createFinalDelivery.isPending}
                  className="gap-2"
                >
                  {createFinalDelivery.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t("finalDelivery.createFinal")}
                </Button>
              </div>
            </Section>
          ) : (
            <Section title={t("finalDelivery.finalTitle")}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">{t("delivered.dischargeDate")}</Label>
                    <Input type="date" value={finalDeliveryHeader.inspectionDate}
                      onChange={(e) => setFinalDeliveryHeader((f) => ({ ...f, inspectionDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("delivered.prosthetist")}</Label>
                    <Select value={finalDeliveryHeader.prosthetistId || "none"} onValueChange={(v) => setFinalDeliveryHeader((f) => ({ ...f, prosthetistId: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder={t("delivered.choose")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("delivered.notSpecified")}</SelectItem>
                        {staffList.filter((e: any) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("الاطراف الصناعية") || e.department?.nameAr?.includes("الأطراف الصناعية"))).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("delivered.physiotherapist")}</Label>
                    <Select value={finalDeliveryHeader.physiotherapistId || "none"} onValueChange={(v) => setFinalDeliveryHeader((f) => ({ ...f, physiotherapistId: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder={t("delivered.choose")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("delivered.notSpecified")}</SelectItem>
                        {staffList.filter((e: any) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("العلاج الفيزيائي") || e.department?.nameAr?.includes("العلاج الطبيعي"))).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* القطع — نُسخت عند الإنشاء (قراءة فقط) */}
                <div className="space-y-2">
                  {(() => {
                    const items: any[] = (finalDelivery as any)?.items ?? [];
                    return (
                      <>
                        <p className="text-sm font-semibold">{t("finalDelivery.parts")}{items.length ? ` (${items.length})` : ""}</p>
                        <p className="text-xs text-muted-foreground">{t("finalDelivery.copiedNote")}</p>
                        {items.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">{t("finalDelivery.noParts")}</p>
                        ) : (
                          <div className="rounded-lg border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-right p-2 font-medium">{t("delivered.name")}</th>
                                  <th className="text-right p-2 font-medium">{t("delivered.symbol")}</th>
                                  <th className="text-right p-2 font-medium">{t("delivered.quantity")}</th>
                                  <th className="text-right p-2 font-medium">{t("delivered.company")}</th>
                                  <th className="text-right p-2 font-medium">{t("delivered.addedDate")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item: any) => (
                                  <tr key={item.id} className="border-t">
                                    <td className="p-2 font-medium">{item.deliveredProduct ?? "—"}</td>
                                    <td className="p-2 font-mono text-xs text-muted-foreground">{item.partCode ?? "—"}</td>
                                    <td className="p-2 text-muted-foreground">{item.quantity ?? "—"}</td>
                                    <td className="p-2 text-muted-foreground">{item.company ?? "—"}</td>
                                    <td className="p-2 text-muted-foreground text-xs">{item.itemAddedDate ? new Date(item.itemAddedDate).toLocaleDateString("en-GB") : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">{t("finalDelivery.ceo")}</Label>
                  <Select value={finalDeliveryHeader.ceoId || "none"} onValueChange={(v) => setFinalDeliveryHeader((f) => ({ ...f, ceoId: v === "none" ? "" : v, ceoSignatureUrl: "" }))}>
                    <SelectTrigger><SelectValue placeholder={t("delivered.choose")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("delivered.notSpecified")}</SelectItem>
                      {staffList.filter((e: any) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("الادارة التنفيذية") || e.department?.nameAr?.includes("الإدارة التنفيذية"))).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-semibold">{t("finalDelivery.ceoSignature")}</p>
                  {finalDeliveryHeader.ceoSignatureUrl ? (
                    <div className="relative inline-block">
                      <img src={finalDeliveryHeader.ceoSignatureUrl} alt={t("finalDelivery.ceoSignature")} className="h-20 object-contain border rounded bg-white" />
                      <button onClick={() => setFinalDeliveryHeader((f) => ({ ...f, ceoSignatureUrl: "" }))} className="absolute top-0 left-0 text-destructive text-xs p-0.5">✕</button>
                    </div>
                  ) : (
                    <Button type="button" size="sm" variant="outline" onClick={handleFinalCeoSignatureClick} disabled={!finalDeliveryHeader.ceoId}>
                      {finalDeliveryHeader.ceoId ? t("delivered.fetchUploadSignature") : t("finalDelivery.chooseCeoFirst")}
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t("delivered.date")}</Label>
                  <Input type="date" value={finalDeliveryHeader.signatureDate}
                    onChange={(e) => setFinalDeliveryHeader((f) => ({ ...f, signatureDate: e.target.value }))} />
                </div>

                <input ref={finalCeoSigRef} type="file" accept="image/*" className="hidden" onChange={handleFinalCeoSigFileChange} />

                <Button
                  onClick={() => updateFinalDelivery.mutateAsync({ caseId: id, dto: {
                    inspectionDate: finalDeliveryHeader.inspectionDate || undefined,
                    prosthetistId: finalDeliveryHeader.prosthetistId || undefined,
                    physiotherapistId: finalDeliveryHeader.physiotherapistId || undefined,
                    ceoId: finalDeliveryHeader.ceoId || undefined,
                    ceoSignatureUrl: finalDeliveryHeader.ceoSignatureUrl || undefined,
                    signatureDate: finalDeliveryHeader.signatureDate || undefined,
                  } })}
                  disabled={updateFinalDelivery.isPending}
                  className="w-full gap-2"
                >
                  {updateFinalDelivery.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t("finalDelivery.saveFinal")}
                </Button>
              </div>
            </Section>
          )}

          {/* ── إقرار وتعهد المريض (الورقة المرفقة بنموذج التسليم النهائي) ── */}
          <Section
            title={t("finalDelivery.pledge.title")}
            action={
              <Button size="sm" variant="outline" className="gap-2" onClick={handleExportPledgePdf} disabled={pledgePdfLoading}>
                {pledgePdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {t("finalDelivery.pledge.exportPdf")}
              </Button>
            }
          >
            <div className="space-y-4 text-xs leading-relaxed">
              <p className="font-semibold text-sm">{t("finalDelivery.pledge.intro")}</p>

              <div className="space-y-1.5">
                <p className="font-semibold">{t("finalDelivery.pledge.firstTitle")}</p>
                <p className="text-muted-foreground">{t("finalDelivery.pledge.received")}</p>
                <p className="text-muted-foreground">{t("finalDelivery.pledge.useAsInstructed")}</p>
                <p className="text-muted-foreground">{t("finalDelivery.pledge.explained")}</p>
              </div>

              <div className="space-y-1.5">
                <p className="font-semibold">{t("finalDelivery.pledge.secondTitle")}</p>
                <p className="text-muted-foreground">{t("finalDelivery.pledge.warrantyScope")}</p>
                <p className="text-muted-foreground">{t("finalDelivery.pledge.noLiability")}</p>
                <ul className="list-disc pr-5 space-y-1 text-muted-foreground">
                  <li>{t("finalDelivery.pledge.cause1")}</li>
                  <li>{t("finalDelivery.pledge.cause2")}</li>
                  <li>{t("finalDelivery.pledge.cause3")}</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <p className="font-semibold">{t("finalDelivery.pledge.finalTitle")}</p>
                <p className="text-muted-foreground">{t("finalDelivery.pledge.finalStatement")}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("finalDelivery.pledge.fullName")}</Label>
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {patientFull ? `${patientFull.firstName} ${patientFull.lastName}` : patientName || "—"}
                  </p>
                </div>
                <PatientSignatureField
                  patientId={caseData?.patientId ?? undefined}
                  patientName={patientFull ? `${patientFull.firstName} ${patientFull.lastName}` : patientName}
                  label={t("finalDelivery.pledge.patientSignature")}
                  value={pledgeSignature}
                  onChange={setPledgeSignature}
                />
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* ── TIMELINE ────────────────────────────────────────────────────── */}
        <TabsContent value="timeline" className="mt-4" dir={isRtl ? "rtl" : "ltr"}>
          <Section title="السجل الزمني">
            {timeline.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">لا توجد أحداث بعد</p>
            ) : (
              <div className="relative space-y-4 pr-4">
                <div className="absolute right-2 top-0 bottom-0 w-0.5 bg-border" />
                {timeline.map((ev) => (
                  <div key={ev.id} className="relative flex gap-3">
                    <div className="absolute -right-4 top-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
                    <div className="flex-1 rounded-lg border p-3 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">{ev.title}</p>
                        <span className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString("ar")}</span>
                      </div>
                      {ev.description && <p className="text-xs text-muted-foreground">{ev.description}</p>}
                      {ev.actorName && <p className="text-xs text-muted-foreground">بواسطة: {ev.actorName}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </TabsContent>

        {/* ── ATTACHMENTS ──────────────────────────────────────────────── */}
      </Tabs>

      {/* Signature dialog for committee sign */}
      <SignaturePadDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        title={signRole === "DOCTOR" ? "توقيع الطبيب" : signRole === "PROSTHETIST" ? "توقيع فني الأطراف الصناعية" : "توقيع المعالج الفيزيائي"}
        legalNotice="بتوقيعك هذا تؤكد مشاركتك في قرار اللجنة الطبية."
        onSign={handleSign}
        isLoading={signDecision.isPending}
      />

      <SignaturePadDialog
        open={finalSignOpen}
        onOpenChange={setFinalSignOpen}
        title="توقيع المدير على التقييم النهائي"
        legalNotice="بتوقيعك تؤكد اعتماد التقييم النهائي والموافقة على انتقال الحالة للتسليم."
        onSign={handleSignFinalEval}
        isLoading={signFinalEval.isPending}
      />

      <SignaturePadDialog
        open={deliverySignOpen}
        onOpenChange={setDeliverySignOpen}
        title="توقيع المريض على استلام الطرف الصناعي"
        legalNotice="بتوقيعك تؤكد استلامك الطرف الصناعي بحالة جيدة."
        onSign={handleSignDelivery}
        isLoading={signDelivery.isPending}
      />
    </div>
  );
}
