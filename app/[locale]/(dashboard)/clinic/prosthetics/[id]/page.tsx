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
import { KLevelSelector } from "@/components/clinic/k-level-selector";
import { AmputationLevelSelector } from "@/components/clinic/amputation-level-selector";
import { InventoryItemCombobox } from "@/components/clinic/inventory-item-combobox";
import { SignaturePadDialog } from "@/components/clinic/signature-pad-dialog";
import { PdfExportButton } from "@/components/clinic/pdf-export-button";
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
  "INTAKE", "ASSESSMENT", "COMMITTEE_REVIEW", "COMMITTEE_APPROVED",
  "FITTING", "GAIT_ANALYSIS", "FINAL_EVALUATION", "DELIVERED", "FOLLOW_UP",
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
  caseId, program, idx, staffList, currentUser,
}: {
  caseId: string;
  program: any;
  idx: number;
  staffList: any[];
  currentUser: any;
}) {
  const updateProgram = useUpdateTreatmentProgram();
  const archiveProgram = useArchiveTreatmentProgram();
  const [editing, setEditing] = useState(false);
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
        <div className="flex gap-2 items-center flex-wrap">
          <Badge variant="secondary" className="text-base font-bold px-3 py-1">#{idx + 1}</Badge>
          {displayDate && <span className="font-medium text-sm">{displayDate}</span>}
          {form.sessionTime && <span className="text-xs text-muted-foreground">{form.sessionTime}</span>}
        </div>
        <div className="flex gap-1.5 items-center flex-wrap justify-end">
          {isArchived && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs gap-1">
              <Archive className="h-3 w-3" />
              مؤرشف
            </Badge>
          )}
          {!hasOtherData && (
            <Button size="sm" variant={editing ? "default" : "outline"} onClick={() => setEditing((v) => !v)}>
              {editing ? "إغلاق" : "تعديل"}
            </Button>
          )}
          {!isArchived && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setArchiveNotes(""); setArchiveOpen(true); }}>
              <Archive className="h-3.5 w-3.5" />
              أرشفة
            </Button>
          )}
        </div>
      </div>

      {isArchived && (
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

      {!editing && (
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
  caseId, staffList, currentUser,
}: {
  caseId: string;
  staffList: any[];
  currentUser: any;
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
          <Button size="sm" variant="outline" className="gap-1 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
            onClick={() => { setAlertNote(""); setAlertOpen(true); }}>
            <Bell className="h-3.5 w-3.5" />
            تنبيه رئيس القسم
          </Button>
          <Button size="sm" variant={showForm ? "secondary" : "outline"} className="gap-1 text-xs" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            {showForm ? "إغلاق" : "إضافة جلسة"}
          </Button>
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
            />
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Review Program card & section ────────────────────────────────────────────
function ReviewProgramCard({
  caseId, review, idx, staffList, currentUser,
}: {
  caseId: string;
  review: any;
  idx: number;
  staffList: any[];
  currentUser: any;
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
        <div className="flex gap-1.5">
          <Button size="sm" variant={editing ? "default" : "outline"} onClick={() => setEditing((v) => !v)}>
            {editing ? "إغلاق" : "تعديل"}
          </Button>
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmDel(true)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
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
  caseId, staffList, currentUser,
}: {
  caseId: string;
  staffList: any[];
  currentUser: any;
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
      action={
        <Button size="sm" variant={showForm ? "secondary" : "outline"} className="gap-1 text-xs" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-3.5 w-3.5" />
          {showForm ? "إغلاق" : "إضافة زيارة"}
        </Button>
      }
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
  caseId, staffList, session, idx, onCancel,
}: { caseId: string; staffList: any[]; session?: any; idx?: number; onCancel?: () => void }) {
  const isNew = !session;
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<GaitForm>(() => session ? gaitFormFromData(session) : { ...INITIAL_GAIT_FORM, phases: {} });
  const [activeTab, setActiveTab] = useState("basic");
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
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>إغلاق</Button>
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

function GaitAnalysisSection({ caseId, staffList }: { caseId: string; staffList: any[] }) {
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
          <GaitAnalysisCard key={formKey} caseId={caseId} staffList={staffList}
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
            <GaitAnalysisCard key={s.id} caseId={caseId} staffList={staffList} session={s} idx={i} />
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
type RomEntry = { selected: boolean; grade?: string };

const UPPER_ROM_MOVES: { key: string; label: string; group: string; hasGrade: boolean }[] = [
  { key: "عطف المرفق",   label: "العطف",          group: "المرفق", hasGrade: true  },
  { key: "بسط المرفق",   label: "البسط",          group: "المرفق", hasGrade: true  },
  { key: "الكب",         label: "الكب",           group: "المرفق", hasGrade: true  },
  { key: "الاستلقاء",    label: "الاستلقاء",      group: "المرفق", hasGrade: true  },
  { key: "عطف الكتف",   label: "العطف",          group: "الكتف",  hasGrade: true  },
  { key: "بسط الكتف",   label: "البسط",          group: "الكتف",  hasGrade: true  },
  { key: "التقريب",      label: "التقريب",        group: "الكتف",  hasGrade: true  },
  { key: "التبعيد",      label: "التبعيد",        group: "الكتف",  hasGrade: true  },
  { key: "دوران داخلي",  label: "دوران داخلي",   group: "الكتف",  hasGrade: false },
  { key: "عطف الرسغ",   label: "العطف",          group: "الرسغ",  hasGrade: true  },
  { key: "بسط الرسغ",   label: "البسط",          group: "الرسغ",  hasGrade: true  },
  { key: "انحراف كعبري", label: "انحراف كعبري",   group: "الرسغ",  hasGrade: false },
  { key: "انحراف زندي",  label: "انحراف زندي",    group: "الرسغ",  hasGrade: false },
];

const LOWER_ROM_MOVES: { key: string; label: string; group: string; hasGrade: boolean }[] = [
  { key: "عطف ظهري",    label: "عطف ظهري",      group: "الكاحل", hasGrade: true  },
  { key: "عطف أخمصي",   label: "عطف أخمصي",     group: "الكاحل", hasGrade: true  },
  { key: "انقلاب داخلي", label: "انقلاب داخلي",  group: "الكاحل", hasGrade: false },
  { key: "انقلاب خارجي", label: "انقلاب خارجي",  group: "الكاحل", hasGrade: false },
  { key: "عطف الركبة",  label: "العطف",          group: "الركبة", hasGrade: true  },
  { key: "بسط الركبة",  label: "البسط",          group: "الركبة", hasGrade: true  },
  { key: "عطف الورك",   label: "العطف",          group: "الورك",  hasGrade: true  },
  { key: "بسط الورك",   label: "البسط",          group: "الورك",  hasGrade: true  },
  { key: "التقريب",      label: "التقريب",        group: "الورك",  hasGrade: true  },
  { key: "التبعيد",      label: "التبعيد",        group: "الورك",  hasGrade: true  },
  { key: "دوران داخلي",  label: "دوران داخلي",   group: "الورك",  hasGrade: false },
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
  return (
    <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 text-xs gap-1">
      <CheckCircle2 className="h-3 w-3" />
      محفوظ — للقراءة فقط
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProstheticsCasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("clinic.prosthetics.case");

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
  const [committeeSigUrls, setCommitteeSigUrls] = useState<Record<string, string>>({});
  const [committeeSigLoading, setCommitteeSigLoading] = useState<Record<string, boolean>>({});
  const committeeSigRefs = { DOCTOR: useRef<HTMLInputElement>(null), PROSTHETIST: useRef<HTMLInputElement>(null), PHYSIOTHERAPIST: useRef<HTMLInputElement>(null) };
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
  const [finalSignOpen, setFinalSignOpen] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({ deliveryDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [deliverySignOpen, setDeliverySignOpen] = useState(false);

  // ── Pro-019 state ─────────────────────────────────────────────────────────
  const [proDeliveryHeader, setProDeliveryHeader] = useState({ inspectionDate: "", prosthetistId: "", physiotherapistId: "", medicalDirectorId: "", medicalDirectorSignatureUrl: "", medicalDirectorSignedAt: "", signatureDate: "" });
  // Final delivery is an independent record; its header is edited via PATCH.
  // It is signed by the CEO (the trial delivery is signed by the medical director).
  const [finalDeliveryHeader, setFinalDeliveryHeader] = useState({ inspectionDate: "", prosthetistId: "", physiotherapistId: "", ceoId: "", ceoSignatureUrl: "", signatureDate: "" });
  const finalCeoSigRef = useRef<HTMLInputElement>(null);
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
    setStaffForm({
      prosthetistIds: caseData.prosthetistId ? [caseData.prosthetistId] : caseData.assignedProsthetistId ? [caseData.assignedProsthetistId] : [],
      physiotherapistIds: caseData.physiotherapistId ? [caseData.physiotherapistId] : [],
      supervisingDoctorIds: caseData.supervisingDoctorId ? [caseData.supervisingDoctorId] : [],
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

  // The staff section persists only through the upper save button
  // (handleSaveUpperAll → handleSaveStaff), so freeze it once that button is
  // gone; leaving it live would accept edits that never reach the server.
  const staffLocked = ampTypes.includes("UPPER") ? upperSaved : lowerSaved;

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
        const s = String(raw).toUpperCase();
        if (s === "BOTH") return ["UPPER", "LOWER"] as any;
        if (s === "UPPER" || s === "LOWER") return [s] as any;
        if (Array.isArray(raw)) return raw as any;
        return undefined;
      })(),
      amputationSide: (intakeForm.amputationSide || c.amputationSide || undefined) as AmputationSide | undefined,
      amputationLevel: intakeForm.amputationLevels.length
        ? intakeForm.amputationLevels.join("/")
        : c.amputationLevel || undefined,
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
    await updateCase.mutateAsync({
      id,
      dto: {
        prosthetistIds: staffForm.prosthetistIds.length ? staffForm.prosthetistIds : undefined,
        physiotherapistIds: staffForm.physiotherapistIds.length ? staffForm.physiotherapistIds : undefined,
        supervisingDoctorIds: staffForm.supervisingDoctorIds.length ? staffForm.supervisingDoctorIds : undefined,
      } as any,
    });
  };
  const toggleStaffMember = (key: keyof typeof staffForm, empId: string) =>
    setStaffForm((f) => ({ ...f, [key]: (f[key] as string[]).includes(empId) ? (f[key] as string[]).filter((x) => x !== empId) : [...(f[key] as string[]), empId] }));

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

  const handleSaveUpperAll = async () => {
    await handleSaveStaff();
    await handleSubmitUpperAssessment();
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

  const handleSubmitAssessmentAndAdvance = async () => {
    if (ampTypes.includes("UPPER")) {
      await submitAssessmentUpper.mutateAsync({ id, dto: buildUpperDto() });
    }
    if (ampTypes.includes("LOWER")) {
      await submitAssessmentLower.mutateAsync({ id, dto: buildLowerDto() });
    }
    await updateStatus.mutateAsync({ id, status: "COMMITTEE_REVIEW" });
  };

  const handleSubmitOpinion = async (role: "PROSTHETIST" | "PHYSIOTHERAPIST" | "DOCTOR", opinion: string) => {
    await submitOpinion.mutateAsync({ id, dto: { role, opinion } });
  };

  const handleSaveCommitteeAll = async () => {
    if (prosthetistOpinion.trim()) await submitOpinion.mutateAsync({ id, dto: { role: "PROSTHETIST", opinion: prosthetistOpinion } });
    if (physioOpinion.trim()) await submitOpinion.mutateAsync({ id, dto: { role: "PHYSIOTHERAPIST", opinion: physioOpinion } });
    if (doctorOpinion.trim()) await submitOpinion.mutateAsync({ id, dto: { role: "DOCTOR", opinion: doctorOpinion } });
    if (decisionForm.finalSummary.trim()) await handleSubmitDecision();
  };

  const handleSubmitDecision = async () => {
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

  const handleSign = async (base64: string) => {
    await signDecision.mutateAsync({ id, role: signRole, signatureUrl: base64 });
  };

  const handleCommitteeSigFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    role: "DOCTOR" | "PROSTHETIST" | "PHYSIOTHERAPIST"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCommitteeSigLoading((prev) => ({ ...prev, [role]: true }));
    try {
      const res = await clinicProstheticsApi.uploadSignatureFile(file);
      const url = res.url.startsWith("http") ? res.url : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${res.url}`;
      setCommitteeSigUrls((prev) => ({ ...prev, [role]: url }));
      await signDecision.mutateAsync({ id, role, signatureUrl: url });
    } catch { toast.error("فشل رفع التوقيع"); }
    finally { setCommitteeSigLoading((prev) => ({ ...prev, [role]: false })); }
    e.target.value = "";
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
    await updateStatus.mutateAsync({ id, status: "GAIT_ANALYSIS" });
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
    await updateStatus.mutateAsync({ id, status: "FINAL_EVALUATION" });
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
            {ampTypes.map((t) => <Badge key={t} variant="outline">{TYPE_LABEL[t] ?? t}</Badge>)}
            {c.amputationSide && <Badge variant="outline">{SIDE_LABEL[c.amputationSide]}</Badge>}
          </div>
          <StepIndicator status={c.status} />
          {/* Staff team */}
          {(c.prosthetist || c.physiotherapist || c.supervisingDoctor || c.workshopSupervisor) && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1">
              {[
                { label: "أخصائي أطراف", obj: c.prosthetist },
                { label: "أخصائي علاج فيزيائي", obj: c.physiotherapist },
                { label: "اسم المشرف", obj: c.supervisingDoctor },
                { label: "مشرف الورشة", obj: c.workshopSupervisor },
              ].filter((s) => s.obj).map((s) => (
                <span key={s.label} className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{s.obj!.firstNameAr} {s.obj!.lastNameAr}</span>
                  {" · "}{s.obj!.jobTitleAr ?? s.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <PdfExportButton type="prosthetics-case" id={id} size="sm" />
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
        value={stageTab ?? (c.status === "CANCELLED" || c.status === "CLOSED" ? "timeline" : c.status.toLowerCase())}
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

          <div>
          <Section title="بيانات الاستقبال">
            <div className="space-y-5">

              {/* 1. هل يوجد أمراض مزمنة */}
              {(() => {
                const val = intakeForm.hasChronicDiseases ?? c.hasChronicDiseases ?? false;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">هل يوجد أمراض مزمنة؟</Label>
                      <Switch checked={!!val} onCheckedChange={(v) => setIntakeForm((f) => ({ ...f, hasChronicDiseases: v, chronicDiseases: v ? f.chronicDiseases : "" }))} />
                    </div>
                    {val && (
                      <div className="space-y-1.5">
                        <Label className="text-sm text-muted-foreground">اسم المرض</Label>
                        <Input value={intakeForm.chronicDiseases || c.chronicDiseases || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, chronicDiseases: e.target.value }))} placeholder="اذكر اسم المرض..." />
                      </div>
                    )}
                  </div>
                );
              })()}

              <Separator />

              {/* 2. سبب الإصابة + تاريخ البتر */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>سبب الإصابة</Label>
                  <Select
                    value={intakeForm.amputationCause || c.causeOfAmputation || ""}
                    onValueChange={(v) => setIntakeForm((f) => ({ ...f, amputationCause: v, amputationCauseOtherDetail: "" }))}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر السبب..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WAR_INJURY">إصابة حرب</SelectItem>
                      <SelectItem value="TRAFFIC_ACCIDENT">حادث مرور</SelectItem>
                      <SelectItem value="DIABETES">داء السكري</SelectItem>
                      <SelectItem value="VASCULAR_DISEASE">مرض الأوعية الدموية</SelectItem>
                      <SelectItem value="CONGENITAL">خلقي</SelectItem>
                      <SelectItem value="INFECTION">عدوى</SelectItem>
                      <SelectItem value="TUMOR">ورم</SelectItem>
                      <SelectItem value="WORK_INJURY">إصابة عمل</SelectItem>
                      <SelectItem value="OTHER">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  {(intakeForm.amputationCause || c.causeOfAmputation) === "OTHER" && (
                    <Input
                      className="mt-1"
                      placeholder="يرجى التحديد..."
                      value={intakeForm.amputationCauseOtherDetail}
                      onChange={(e) => setIntakeForm((f) => ({ ...f, amputationCauseOtherDetail: e.target.value }))}
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>تاريخ البتر</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="السنة *"
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
                        <SelectValue placeholder="الشهر (اختياري)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">— بدون شهر —</SelectItem>
                        {ARABIC_MONTHS.map((mn, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{mn}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 3. عدد البتور */}
              <div className="space-y-1.5">
                <Label>عدد البتور</Label>
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
                <Label>جانب الاصابة</Label>
                <div className="flex gap-5">
                  {([["RIGHT", "يمين (R)"], ["LEFT", "يسار (L)"], ["BILATERAL", "ثنائي"]] as const).map(([val, label]) => {
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
                <Label>نوع البتر</Label>
                <div className="flex gap-5">
                  {([["UPPER", "طرف علوي"], ["LOWER", "طرف سفلي"]] as const).map(([val, label]) => {
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
                <Label>مستوى البتر</Label>
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
                      <Label className="text-base">هل خضع لجلسات علاج فيزيائي سابقاً؟</Label>
                      <Switch checked={!!val} onCheckedChange={(v) => setIntakeForm((f) => ({ ...f, hasPhysicalTherapy: v, physicalTherapyDetails: v ? f.physicalTherapyDetails : "" }))} />
                    </div>
                    {val && (
                      <div className="space-y-1.5">
                        <Label className="text-sm text-muted-foreground">التوضيح</Label>
                        <Input value={intakeForm.physicalTherapyDetails || c.physicalTherapyDetails || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, physicalTherapyDetails: e.target.value }))} placeholder="تفاصيل جلسات العلاج..." />
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
                      <Label className="text-base">هل سبق له تركيب طرف صناعي؟</Label>
                      <Switch checked={!!val} onCheckedChange={(v) => setIntakeForm((f) => ({ ...f, hasPreviousProsthesis: v, previousProsthesisDetails: v ? f.previousProsthesisDetails : "", previousProsthesisWhen: v ? f.previousProsthesisWhen : "", previousProsthesisWhere: v ? f.previousProsthesisWhere : "", previousProsthesisType: v ? f.previousProsthesisType : "" }))} />
                    </div>
                    {val && (
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm text-muted-foreground">التوضيح</Label>
                          <Input value={intakeForm.previousProsthesisDetails || c.previousProsthesisDetails || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, previousProsthesisDetails: e.target.value }))} placeholder="تفاصيل الطرف السابق..." />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-sm text-muted-foreground">متى؟</Label>
                            <Input value={intakeForm.previousProsthesisWhen || c.previousProsthesisWhen || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, previousProsthesisWhen: e.target.value }))} placeholder="السنة أو التاريخ" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm text-muted-foreground">أين؟</Label>
                            <Input value={intakeForm.previousProsthesisWhere || c.previousProsthesisWhere || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, previousProsthesisWhere: e.target.value }))} placeholder="المكان أو المركز" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm text-muted-foreground">نوع الطرف</Label>
                            <Input value={intakeForm.previousProsthesisType || c.previousProsthesisType || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, previousProsthesisType: e.target.value }))} placeholder="نوع الطرف الصناعي" />
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
                      <Label className="text-base">هل سبق أن خضع لعملية تصحيح بتر؟</Label>
                      <Switch checked={!!val} onCheckedChange={(v) => setIntakeForm((f) => ({ ...f, hasRevisionSurgery: v, revisionDetails: v ? f.revisionDetails : "" }))} />
                    </div>
                    {val && (
                      <div className="space-y-1.5">
                        <Label className="text-sm text-muted-foreground">التوضيح</Label>
                        <Input value={intakeForm.revisionDetails || c.revisionDetails || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, revisionDetails: e.target.value }))} placeholder="تفاصيل عملية التصحيح..." />
                      </div>
                    )}
                  </div>
                );
              })()}

              <Separator />

              {/* تاريخ ووقت الموعد */}
              <div className="space-y-1.5">
                <Label className="text-base">تاريخ ووقت الموعد</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">التاريخ</Label>
                    <Input type="date" value={intakeForm.appointmentDate || (c as any).appointmentDate || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, appointmentDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">الوقت</Label>
                    <Input type="time" value={intakeForm.appointmentTime || (c as any).appointmentTime || ""} onChange={(e) => setIntakeForm((f) => ({ ...f, appointmentTime: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveIntake} disabled={updateCase.isPending} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                  {updateCase.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                  حفظ
                </Button>
                {c.status === "INTAKE" && (
                  <Button onClick={handleSaveIntakeAndAdvance} disabled={updateCase.isPending || updateStatus.isPending} className="flex-1">
                    {(updateCase.isPending || updateStatus.isPending) ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                    حفظ والانتقال للتقييم
                  </Button>
                )}
              </div>
            </div>
          </Section>
          </div>
        </TabsContent>

        {/* ── PATIENT INFO ─────────────────────────────────────────────────── */}
        <TabsContent value="patient_info" className="mt-4" dir="rtl">
          <Section
            title="معلومات المريض"
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
                {patientEditMode ? "إلغاء" : "تعديل"}
              </Button>
            }
          >
            <div className="flex gap-6 items-start">
              {/* بيانات المريض — يمين */}
              <div className="flex-1">
                {patientEditMode ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">الاسم الأول</Label>
                      <Input className="h-8 text-sm" value={patientEditForm.firstName} onChange={(e) => setPatientEditForm((f) => ({ ...f, firstName: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">الاسم الأخير</Label>
                      <Input className="h-8 text-sm" value={patientEditForm.lastName} onChange={(e) => setPatientEditForm((f) => ({ ...f, lastName: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">تاريخ الميلاد</Label>
                      <Input type="date" className="h-8 text-sm" value={patientEditForm.dateOfBirth} onChange={(e) => setPatientEditForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">الطول (cm)</Label>
                      <Input type="number" className="h-8 text-sm" value={patientEditForm.heightCm} onChange={(e) => setPatientEditForm((f) => ({ ...f, heightCm: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">الوزن (kg)</Label>
                      <Input type="number" className="h-8 text-sm" value={patientEditForm.weightKg} onChange={(e) => setPatientEditForm((f) => ({ ...f, weightKg: e.target.value }))} />
                    </div>
                    <Button onClick={handleSavePatient} disabled={updatePatient.isPending} className="col-span-2 h-8">
                      {updatePatient.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin ml-2" />}
                      حفظ التعديلات
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">رقم المريض</p>
                      <p className="text-muted-foreground">{patientFull?.patientNumber ?? c.patient?.patientNumber ?? "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">اسم المريض</p>
                      <p className="text-muted-foreground">{patientFull ? `${patientFull.firstName} ${patientFull.lastName}` : patientName}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">تاريخ الميلاد</p>
                      <p className="text-muted-foreground">{patientFull?.dateOfBirth ? patientFull.dateOfBirth.slice(0, 10) : "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">مستوى البتر</p>
                      <p className="text-muted-foreground">{toAmputationLevels(c.amputationLevel).join(" / ") || "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">الطول</p>
                      <p className="text-muted-foreground">{patientFull?.heightCm ? `${patientFull.heightCm} cm` : "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">الوزن</p>
                      <p className="text-muted-foreground">{patientFull?.weightKg ? `${patientFull.weightKg} kg` : "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">مؤشر كتلة الجسم</p>
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
                        : <span className="opacity-50">لا توجد صورة</span>}
                    </div>
                  </div>
                );
              })()}
            </div>
          </Section>
        </TabsContent>

        {/* ── ASSESSMENT ──────────────────────────────────────────────────── */}
        <TabsContent value="assessment" className="mt-4 space-y-4" dir="rtl">

          {/* ── فريق العمل المعالج ── */}
          {openStaffKey && <div className="fixed inset-0 z-40" onClick={() => setOpenStaffKey(null)} />}
          <Section title="فريق العمل المعالج" action={staffLocked ? <SavedBadge /> : undefined}>
            <fieldset disabled={staffLocked} className="contents">
            <div className="grid grid-cols-3 gap-4">
              {([
                { key: "prosthetistIds" as const,     label: "فني الأطراف الصناعية" },
                { key: "physiotherapistIds" as const, label: "المعالج الفيزيائي" },
                { key: "supervisingDoctorIds" as const,"label":"اسم المشرف" },
              ]).map(({ key, label }) => {
                const selected = staffForm[key];
                const isOpen = openStaffKey === key;
                return (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <div className="relative">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-muted/40 transition-colors"
                        onClick={(e) => { e.stopPropagation(); setOpenStaffKey(isOpen ? null : key); }}
                      >
                        <span className="text-muted-foreground">
                          {selected.length === 0 ? "اختر..." : `${selected.length} محدد`}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                      {selected.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selected.map((empId) => {
                            const emp = staffList.find((e) => e.id === empId);
                            return emp ? (
                              <span key={empId} className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-800 text-xs px-2 py-0.5">
                                {emp.firstNameAr} {emp.lastNameAr}
                                <button type="button" onClick={() => toggleStaffMember(key, empId)} className="hover:text-orange-600">
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
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
            </fieldset>
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
                  <PfRow label="في البتور عبر الساعد والعضد، كم طول الجذمور؟">
                    {[["LONG","طويل"],["MEDIUM","وسط"],["SHORT","قصير"],["VERY_SHORT","قصير جداً"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={sf.residualLimbLength === val} label={lbl} onClick={() => setS({ residualLimbLength: val })} />
                    ))}
                  </PfRow>
                  <PfRow label="شكل الطرف المتبقي">
                    {[["BONY","عظمي"],["SOFT","لين"],["NORMAL","طبيعي"],["CONICAL_BONY","عظمي مخروطي"],["CONICAL_SOFT","لين مخروطي"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={sf.residualLimbShape === val} label={lbl} onClick={() => setS({ residualLimbShape: val })} />
                    ))}
                  </PfRow>
                  {showShared && <>
                    <PfRow label="ملاحظة حول مستوى البتر">
                      <Textarea rows={2} className="text-sm w-full" value={sf.amputationLevelNote} onChange={(e) => setS({ amputationLevelNote: e.target.value })} />
                    </PfRow>
                    <PfRow label="تاريخ البتر">
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          placeholder="السنة *"
                          min={1900} max={2100}
                          className="h-7 text-sm w-24"
                          value={g.amputationYear}
                          onChange={(e) => setG({ amputationYear: e.target.value })}
                        />
                        <Select value={g.amputationMonth} onValueChange={(v) => setG({ amputationMonth: v })}>
                          <SelectTrigger className="h-7 text-sm w-32">
                            <SelectValue placeholder="الشهر" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">— بدون شهر —</SelectItem>
                            {ARABIC_MONTHS.map((mn, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>{mn}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </PfRow>
                    <PfRow label="سبب البتر">
                      {[["WAR_INJURY","إصابة حرب"],["TRAFFIC_ACCIDENT","حادث سير"],["DIABETES","مضاعفات سكري"],["VASCULAR_DISEASE","مرض وعائي"],["CONGENITAL","خلقي"],["INFECTION","عدوى"],["TUMOR","ورم"],["WORK_INJURY","إصابة عمل"],["OTHER","أخرى"]].map(([val, lbl]) => (
                        <PfSq key={val} checked={g.amputationCause === val} label={lbl} onClick={() => setG({ amputationCause: val })} />
                      ))}
                      {g.amputationCause === "OTHER" && (
                        <Input className="h-7 text-sm w-52 mt-1" placeholder="حدد السبب..." value={g.amputationCauseOtherDetail} onChange={(e) => setG({ amputationCauseOtherDetail: e.target.value })} />
                      )}
                    </PfRow>
                    <PfRow label="القصة السريرية">
                      <Textarea rows={2} className="text-sm w-full" value={g.clinicalHistory} onChange={(e) => setG({ clinicalHistory: e.target.value })} />
                    </PfRow>
                  </>}
                  <PfDivider label="الألم والحساسية" />
                  <PfRow label=" الألم والحساسية">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">غير موجود</span>
                      <Switch checked={sf.painPresent === true} onCheckedChange={(v) => setS({ painPresent: v })} />
                      <span className="text-sm text-muted-foreground">موجود</span>
                    </div>
                    {sf.painPresent && <PfNumPicker value={sf.painIntensity} onChange={(n) => setS({ painIntensity: n })} max={9} />}
                  </PfRow>
                  <PfRow label="ألم وهمي">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">غير موجود</span>
                      <Switch checked={sf.phantomPainPresent === true} onCheckedChange={(v) => setS({ phantomPainPresent: v })} />
                      <span className="text-sm text-muted-foreground">موجود</span>
                    </div>
                    {sf.phantomPainPresent && <PfNumPicker value={sf.phantomPainIntensity} onChange={(n) => setS({ phantomPainIntensity: n })} max={9} />}
                  </PfRow>
                  <PfRow label="نوع الألم">
                    {[["NUMBNESS","خدر"],["DULL_ACHE","ألم خفيف"],["HOT_BURNING","حارق"],["SHARP_STABBING","حاد"],["PINS","واخز"],["OTHER","أخر"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={sf.painTypes.includes(val)} label={lbl} onClick={() => setS({ painTypes: togS(sf.painTypes, val) })} />
                    ))}
                    {sf.painTypes.includes("OTHER") && (
                      <Input className="h-7 text-sm w-52 mt-1" placeholder="حدد نوع الألم..." value={sf.painTypeOtherDetail} onChange={(e) => setS({ painTypeOtherDetail: e.target.value })} />
                    )}
                  </PfRow>
                  <PfRow label="النوروم العصبي">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">غير موجود</span>
                      <Switch checked={sf.neuromaPresent === true} onCheckedChange={(v) => setS({ neuromaPresent: v })} />
                      <span className="text-sm text-muted-foreground">موجود</span>
                    </div>
                  </PfRow>
                  <PfRow label="وضع الجذمور">
                    <PfSq checked={sf.neuromaPalpable === true} label="قابل للمس" onClick={() => setS({ neuromaPalpable: true })} />
                    <PfSq checked={sf.neuromaPalpable === false} label="غير قابل للمس" onClick={() => setS({ neuromaPalpable: false })} />
                  </PfRow>
                  <PfRow label="ملاحظات">
                    <Textarea rows={2} className="text-sm w-full" value={sf.skinNotes} onChange={(e) => setS({ skinNotes: e.target.value })} />
                  </PfRow>
                  <PfDivider label="الجلد" />
                  <PfRow label="المظهر العام">
                    {[["NORMAL","طبيعي"],["PALE","شاحب"],["DRY","جاف"],["INFLAMED","ملتهب"],["PEELING","متقشر"],["OOZING","ناز"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={sf.skinAppearance.includes(val)} label={lbl} onClick={() => setS({ skinAppearance: togS(sf.skinAppearance, val) })} />
                    ))}
                  </PfRow>
                  <PfRow label="لون البشرة">
                    {[["NORMAL","طبيعي"],["PALE","شاحب"],["YELLOWISH","مصفر"],["ERYTHEMATOUS","محمر"],["CYANOTIC","مزرق"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={sf.skinColor.includes(val)} label={lbl} onClick={() => setS({ skinColor: togS(sf.skinColor, val) })} />
                    ))}
                  </PfRow>
                  <PfRow label="درجة حرارة الجلد">
                    {[["NORMAL","طبيعي"],["COLD","بارد"],["HOT","حار"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={sf.skinTemperature === val} label={lbl} onClick={() => setS({ skinTemperature: val })} />
                    ))}
                  </PfRow>
                  <PfRow label="الطعوم الجلدية">
                    <PfSq checked={sf.hasSkinGrafts} label="يوجد طعم جلدي" onClick={() => setS({ hasSkinGrafts: !sf.hasSkinGrafts })} />
                    {sf.hasSkinGrafts && (
                      <Input className="h-7 text-sm w-52" placeholder="منطقة الطعم..." value={sf.graftArea} onChange={(e) => setS({ graftArea: e.target.value })} />
                    )}
                  </PfRow>
                  <PfRow label="حالة الندبة">
                    {[["HEALED","ملتئمة"],["FLEXIBLE","مرنة"],["HEALED_WITH_PINS","ملتئمة مع ترس"],["OPEN","مفتوحة"],["DRY","جافة"],["INFLAMED","ملتهبة"],["OOZING","نازة"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={sf.scarCondition.includes(val)} label={lbl} onClick={() => setS({ scarCondition: togS(sf.scarCondition, val) })} />
                    ))}
                  </PfRow>
                  <PfRow label="تعليقات">
                    <Textarea rows={2} className="text-sm w-full" value={sf.closureNotes} onChange={(e) => setS({ closureNotes: e.target.value })} />
                  </PfRow>
                  <PfDivider label="الحالة العامة" />
                  <PfRow label="حالة الصحة العامة">
                    <Textarea rows={2} className="text-sm w-full" value={sf.generalHealthNotes} onChange={(e) => setS({ generalHealthNotes: e.target.value })} />
                  </PfRow>
                  <PfRow label="حالة الأطراف الأخرى">
                    <Textarea rows={2} className="text-sm w-full" value={sf.otherLimbCondition} onChange={(e) => setS({ otherLimbCondition: e.target.value })} />
                  </PfRow>
                  {showShared && <>
                    <PfRow label="هل يستخدم المريض طرفاً صناعياً حالياً؟">
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">لا</span>
                          <Switch checked={g.currentlyUsingProsthesis === true} onCheckedChange={(v) => setG({ currentlyUsingProsthesis: v })} />
                          <span className="text-sm text-muted-foreground">نعم</span>
                        </div>
                        {g.currentlyUsingProsthesis === true && (
                          <Input className="h-7 text-sm w-64" placeholder="نوع الطرف الصناعي..." value={sf.prostheticLimbType} onChange={(e) => setS({ prostheticLimbType: e.target.value })} />
                        )}
                      </div>
                    </PfRow>
                    {g.currentlyUsingProsthesis === false && (
                      <PfRow label="هل استخدم الطرف الصناعي سابقاً؟">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">لا</span>
                          <Switch checked={g.previouslyUsedProsthesis === true} onCheckedChange={(v) => setG({ previouslyUsedProsthesis: v })} />
                          <span className="text-sm text-muted-foreground">نعم</span>
                        </div>
                        {g.previouslyUsedProsthesis === true && (
                          <Input className="h-7 text-sm w-64 mt-1" placeholder="تحديد نظام الطرف الصناعي..." value={g.previousProsthesisSystemDetail} onChange={(e) => setG({ previousProsthesisSystemDetail: e.target.value })} />
                        )}
                      </PfRow>
                    )}
                  </>}
                  <PfRow label="هل يستطيع الحفاظ على توازنه على جانب واحد فقط؟">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">لا</span>
                      <Switch checked={sf.canBalanceOneSide} onCheckedChange={(v) => setS({ canBalanceOneSide: v })} />
                      <span className="text-sm text-muted-foreground">نعم</span>
                    </div>
                  </PfRow>
                  <PfRow label="هل يستخدم المريض رباط ضاغط؟">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">لا</span>
                      <Switch checked={sf.usesCompressionBandage} onCheckedChange={(v) => setS({ usesCompressionBandage: v })} />
                      <span className="text-sm text-muted-foreground">نعم</span>
                    </div>
                  </PfRow>
                  {showShared && <>
                    <PfRow label="الحالة الطبيعية">
                      <PfSq checked={sf.jointsRangeOfMotion === "ACTIVE"} label="نشط" onClick={() => setS({ jointsRangeOfMotion: "ACTIVE" })} />
                      <PfSq checked={sf.jointsRangeOfMotion === "SEDENTARY"} label="خامل" onClick={() => setS({ jointsRangeOfMotion: "SEDENTARY" })} />
                    </PfRow>
                    <PfRow label="مستوى النشاط">
                      {["K0","K1","K2","K3","K4"].map((k) => (
                        <PfSq key={k} checked={sf.activityLevel === k} label={k} onClick={() => setS({ activityLevel: k })} />
                      ))}
                    </PfRow>
                  </>}
                </>
              );
            };

            return (
              <Section title="تقييم الطرف العلوي" action={upperSaved ? <SavedBadge /> : undefined}>
                <fieldset disabled={upperSaved} className="contents">
                <div className="divide-y divide-border/30">

                  {/* جانب البتر */}
                  <PfRow label="جانب البتر">
                    <PfSq checked={f.amputationSide === "RIGHT"} label="يمين" onClick={() => set({ amputationSide: "RIGHT" })} />
                    <PfSq checked={f.amputationSide === "LEFT"} label="يسار" onClick={() => set({ amputationSide: "LEFT" })} />
                    <PfSq checked={f.amputationSide === "BILATERAL"} label="ثنائي الاطراف" onClick={() => set({ amputationSide: "BILATERAL" })} />
                  </PfRow>

                  {/* أسئلة خاصة بالجانب — تُعرض مرتين عند الثنائي */}
                  {isBilateral ? (
                    <div className="grid grid-cols-2 gap-x-6 border-t border-border/30 pt-1">
                      <div className="divide-y divide-border/30 border-l border-border/30 pl-4">
                        <PfDivider label="يمين" />
                        {renderSideBlock(upperAssessForm, setUpperAssessForm, true)}
                      </div>
                      <div className="divide-y divide-border/30">
                        <PfDivider label="يسار" />
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
            const groups = [...new Set(UPPER_ROM_MOVES.map((m) => m.group))];
            return (
              <Section title="تقييم قوة حركة العضلات" action={upperSaved ? <SavedBadge /> : undefined}>
                <fieldset disabled={upperSaved} className="contents">
                <div className="divide-y divide-border/30">
                  {groups.map((group) => (
                    <PfRow key={group} label={group}>
                      <div className="flex flex-col gap-2 w-full">
                        {UPPER_ROM_MOVES.filter((m) => m.group === group).map((m) => {
                          const entry = f.romData[m.key] ?? { selected: false };
                          return (
                            <div key={m.key} className="flex items-center gap-3 flex-wrap">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-[15px] h-[15px] checkbox-orange"
                                  checked={entry.selected}
                                  onChange={() => setRom(m.key, { ...entry, selected: !entry.selected })}
                                />
                                <span className="text-sm">{m.label}</span>
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
                  {!upperSaved && (
                    <div className="pt-3">
                      <Button onClick={handleSaveUpperAll} disabled={updateCase.isPending || submitAssessmentUpper.isPending} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                        {(updateCase.isPending || submitAssessmentUpper.isPending) ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                        حفظ تقييم الطرف العلوي
                      </Button>
                    </div>
                  )}
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
                      <PfRow label="ما هو طول الجذمور في البتر فوق الركبة وتحت الركبة">
                        {[
                          ["LONG", "طويل"],
                          ["MEDIUM", "وسط"],
                          ["SHORT", "قصير"],
                          ["VERY_SHORT", "قصير جداً"],
                        ].map(([val, lbl]) => (
                          <PfSq
                            key={val}
                            checked={sf.residualLimbLength === val}
                            label={lbl}
                            onClick={() => setS({ residualLimbLength: val })}
                          />
                        ))}
                      </PfRow>
                      <PfRow label="شكل الطرف المتبقي">
                        {[
                          ["BONY", "عظمي"],
                          ["SOFT", "لين"],
                          ["NORMAL", "طبيعي"],
                          ["CONICAL_BONY", "عظمي مخروطي"],
                          ["CONICAL_SOFT", "لين مخروطي"],
                        ].map(([val, lbl]) => (
                          <PfSq
                            key={val}
                            checked={sf.residualLimbShape === val}
                            label={lbl}
                            onClick={() => setS({ residualLimbShape: val })}
                          />
                        ))}
                      </PfRow>
                      <PfRow label="ملاحظة حول مستوى البتر">
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
                  <PfRow label="الألم والحساسية">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        غير موجود
                      </span>
                      <Switch
                        checked={sf.painPresent === true}
                        onCheckedChange={(v) => setS({ painPresent: v })}
                      />
                      <span className="text-sm text-muted-foreground">
                        موجود
                      </span>
                    </div>
                    {sf.painPresent && (
                      <>
                        <Input
                          className="h-7 text-sm w-64 mt-1"
                          placeholder="المنطقة..."
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
                  <PfRow label="ألم وهمي">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        غير موجود
                      </span>
                      <Switch
                        checked={sf.phantomPainPresent === true}
                        onCheckedChange={(v) => setS({ phantomPainPresent: v })}
                      />
                      <span className="text-sm text-muted-foreground">
                        موجود
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
                  <PfRow label="نوع الألم">
                    {[
                      ["NUMBNESS", "خدر"],
                      ["DULL_ACHE", "ألم خفيف"],
                      ["HOT_BURNING", "حارق"],
                      ["SHARP_STABBING", "حاد"],
                      ["PINS", "واخز"],
                      ["OTHER", "أخر"],
                    ].map(([val, lbl]) => (
                      <PfSq
                        key={val}
                        checked={sf.painTypes.includes(val)}
                        label={lbl}
                        onClick={() =>
                          setS({ painTypes: togS(sf.painTypes, val) })
                        }
                      />
                    ))}
                    {sf.painTypes.includes("OTHER") && (
                      <Input
                        className="h-7 text-sm w-52 mt-1"
                        placeholder="وصف..."
                        value={sf.painTypeOtherDetail}
                        onChange={(e) =>
                          setS({ painTypeOtherDetail: e.target.value })
                        }
                      />
                    )}
                  </PfRow>
                  <PfRow label="النوروم العصبي">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        غير موجود
                      </span>
                      <Switch
                        checked={sf.neuromaPalpable === true}
                        onCheckedChange={(v) => setS({ neuromaPalpable: v })}
                      />
                      <span className="text-sm text-muted-foreground">
                        موجود
                      </span>
                    </div>
                  </PfRow>
                  <PfRow label="قابلية التحميل على الجذمور">
                    {[
                      ["PALPABLE", "قابل للمس"],
                      ["WEIGHT_BEARING", "قابل لتحمل الوزن"],
                      ["NON_WEIGHT_BEARING", "غير قابل لتحمل الوزن"],
                      ["NOT_PALPABLE", "غير قابل للمس"],
                    ].map(([val, lbl]) => (
                      <PfSq
                        key={val}
                        checked={sf.loadTolerance === val}
                        label={lbl}
                        onClick={() => setS({ loadTolerance: val })}
                      />
                    ))}
                  </PfRow>
                  {sf.loadTolerance === "WEIGHT_BEARING" && (
                    <PfRow label="إذا كان قابل لتحمل الوزن">
                      {[
                        ["FULL", "كامل"],
                        ["HIGH", "مرتفع"],
                        ["MEDIUM", "متوسط"],
                        ["LOW", "منخفض"],
                      ].map(([val, lbl]) => (
                        <PfSq
                          key={val}
                          checked={sf.weightBearingLevel === val}
                          label={lbl}
                          onClick={() => setS({ weightBearingLevel: val })}
                        />
                      ))}
                    </PfRow>
                  )}
                  <PfRow label="ملاحظات">
                    <Textarea
                      rows={2}
                      className="text-sm w-full"
                      value={sf.notes}
                      onChange={(e) => setS({ notes: e.target.value })}
                    />
                  </PfRow>
                  <PfRow label="المظهر العام للجلد">
                    {[
                      ["NORMAL", "طبيعي"],
                      ["PALE", "شاحب"],
                      ["DRY", "جاف"],
                      ["INFLAMED", "ملتهب"],
                      ["PEELING", "متقشر"],
                      ["OOZING", "نازّ"],
                    ].map(([val, lbl]) => (
                      <PfSq
                        key={val}
                        checked={sf.skinAppearance.includes(val)}
                        label={lbl}
                        onClick={() =>
                          setS({ skinAppearance: togS(sf.skinAppearance, val) })
                        }
                      />
                    ))}
                  </PfRow>
                  <PfRow label="لون البشرة">
                    {[
                      ["NORMAL", "طبيعي"],
                      ["PALE", "شاحب"],
                      ["YELLOWISH", "مصفر"],
                      ["ERYTHEMATOUS", "محمر"],
                      ["CYANOTIC", "مزرق"],
                    ].map(([val, lbl]) => (
                      <PfSq
                        key={val}
                        checked={sf.skinColor.includes(val)}
                        label={lbl}
                        onClick={() =>
                          setS({ skinColor: togS(sf.skinColor, val) })
                        }
                      />
                    ))}
                  </PfRow>
                  <PfRow label="درجة حرارة الجسم">
                    {[
                      ["NORMAL", "طبيعي"],
                      ["COLD", "بارد"],
                      ["HOT", "حار"],
                    ].map(([val, lbl]) => (
                      <PfSq
                        key={val}
                        checked={sf.skinTemperature === val}
                        label={lbl}
                        onClick={() => setS({ skinTemperature: val })}
                      />
                    ))}
                  </PfRow>
                  <PfRow label="الطعوم الجلدية">
                    <PfSq
                      checked={sf.hasSkinGrafts}
                      label="يوجد طعم جلدي"
                      onClick={() => setS({ hasSkinGrafts: !sf.hasSkinGrafts })}
                    />
                    {sf.hasSkinGrafts && (
                      <Input
                        className="h-7 text-sm w-64 mt-1"
                        placeholder="منطقة الطعم..."
                        value={sf.graftArea}
                        onChange={(e) => setS({ graftArea: e.target.value })}
                      />
                    )}
                  </PfRow>
                  <PfRow label="حالة الندبة">
                    {[
                      ["HEALED", "ملتئمة"],
                      ["INFLAMED", "ملتهبة"],
                      ["FLEXIBLE", "مرنة"],
                      ["HEALED_WITH_PINS", "ملتئمة مع ترس"],
                      ["DRY", "جافة"],
                      ["OPEN", "مفتوحة"],
                      ["OOZING", "نازّة"],
                    ].map(([val, lbl]) => (
                      <PfSq
                        key={val}
                        checked={sf.scarCondition.includes(val)}
                        label={lbl}
                        onClick={() =>
                          setS({ scarCondition: togS(sf.scarCondition, val) })
                        }
                      />
                    ))}
                  </PfRow>
                  <PfRow label="حالة الصحة العامة">
                    <Textarea
                      rows={3}
                      className="text-sm w-full resize-none"
                      value={sf.generalHealthNotes}
                      onChange={(e) =>
                        setS({ generalHealthNotes: e.target.value })
                      }
                    />
                  </PfRow>
                  <PfRow label="حالة الأطراف الأخرى">
                    <Textarea
                      rows={3}
                      className="text-sm w-full resize-none"
                      value={sf.otherLimbCondition}
                      onChange={(e) =>
                        setS({ otherLimbCondition: e.target.value })
                      }
                    />
                  </PfRow>
                  <PfRow label="هل يستخدم المريض طرفاً صناعياً حالياً">
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">لا</span>
                        <Switch checked={g.currentlyUsingProsthesis === true} onCheckedChange={(v) => setG({ currentlyUsingProsthesis: v })} />
                        <span className="text-sm text-muted-foreground">نعم</span>
                      </div>
                      {g.currentlyUsingProsthesis === true && (
                        <Input className="h-7 text-sm w-64" placeholder="نوع الطرف الصناعي..." value={sf.prostheticLimbType} onChange={(e) => setS({ prostheticLimbType: e.target.value })} />
                      )}
                    </div>
                  </PfRow>
                  {g.currentlyUsingProsthesis === false && (
                    <PfRow label="إذا كانت الإجابة لا هل استخدمه سابقاً">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          لا
                        </span>
                        <Switch
                          checked={g.previouslyUsedProsthesis === true}
                          onCheckedChange={(v) =>
                            setG({ previouslyUsedProsthesis: v })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          نعم
                        </span>
                      </div>
                      {g.previouslyUsedProsthesis === true && (
                        <Input
                          className="h-7 text-sm w-64 mt-1"
                          placeholder="يرجى تحديد نظام الطرف الصناعي..."
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
                  <PfRow label="هل يستخدم وسائل مساعدة في عملية التنقل">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">لا</span>
                      <Switch
                        checked={sf.usesAssistiveDevices === true}
                        onCheckedChange={(v) =>
                          setS({ usesAssistiveDevices: v })
                        }
                      />
                      <span className="text-sm text-muted-foreground">نعم</span>
                    </div>
                    {sf.usesAssistiveDevices && (
                      <Input
                        className="h-7 text-sm w-64 mt-1"
                        placeholder="نوع الوسيلة المساعدة..."
                        value={sf.assistiveDeviceTypes}
                        onChange={(e) =>
                          setS({ assistiveDeviceTypes: e.target.value })
                        }
                      />
                    )}
                  </PfRow>
                  <PfRow label="هل يمكنه صعود ونزول درج">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">لا</span>
                      <Switch
                        checked={sf.canClimbStairs === true}
                        onCheckedChange={(v) => setS({ canClimbStairs: v })}
                      />
                      <span className="text-sm text-muted-foreground">نعم</span>
                    </div>
                  </PfRow>
                  <PfRow label="هل يستطيع الحفاظ على توازنه على جانب واحد فقط">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">لا</span>
                      <Switch
                        checked={sf.canBalanceOneSide === true}
                        onCheckedChange={(v) => setS({ canBalanceOneSide: v })}
                      />
                      <span className="text-sm text-muted-foreground">نعم</span>
                    </div>
                  </PfRow>
                  {!ampTypes.includes("UPPER") && <>
                    <PfRow label="الحالة الطبيعية">
                      {[["ACTIVE", "نشط"], ["SEDENTARY", "خامل"]].map(([val, lbl]) => (
                        <PfSq key={val} checked={sf.jointsRangeOfMotion === val} label={lbl} onClick={() => setS({ jointsRangeOfMotion: val })} />
                      ))}
                    </PfRow>
                    <PfRow label="مستوى النشاط">
                      {["K0", "K1", "K2", "K3", "K4"].map((k) => (
                        <PfSq key={k} checked={sf.activityLevel === k} label={k} onClick={() => setS({ activityLevel: k })} />
                      ))}
                    </PfRow>
                  </>}
                </>
              );
            };

            return (
              <Section title="تقييم الطرف السفلي" action={lowerSaved ? <SavedBadge /> : undefined}>
                <fieldset disabled={lowerSaved} className="contents">
                <div className="divide-y divide-border/30">

                  <PfRow label="جانب البتر">
                    <PfSq checked={f.amputationSide === "RIGHT"} label="يمين" onClick={() => set({ amputationSide: "RIGHT" })} />
                    <PfSq checked={f.amputationSide === "LEFT"} label="يسار" onClick={() => set({ amputationSide: "LEFT" })} />
                    <PfSq checked={f.amputationSide === "BILATERAL"} label="ثنائي الأطراف" onClick={() => set({ amputationSide: "BILATERAL" })} />
                  </PfRow>

                  {!isBilateral && (
                    <>
                      <PfRow label="ما هو طول الجذمور في البتر فوق الركبة وتحت الركبة">
                        {[["LONG","طويل"],["MEDIUM","وسط"],["SHORT","قصير"],["VERY_SHORT","قصير جداً"]].map(([val, lbl]) => (
                          <PfSq key={val} checked={f.residualLimbLength === val} label={lbl} onClick={() => set({ residualLimbLength: val })} />
                        ))}
                      </PfRow>
                      <PfRow label="شكل الطرف المتبقي">
                        {[["BONY","عظمي"],["SOFT","لين"],["NORMAL","طبيعي"],["CONICAL_BONY","عظمي مخروطي"],["CONICAL_SOFT","لين مخروطي"]].map(([val, lbl]) => (
                          <PfSq key={val} checked={f.residualLimbShape === val} label={lbl} onClick={() => set({ residualLimbShape: val })} />
                        ))}
                      </PfRow>
                      <PfRow label="ملاحظة حول مستوى البتر">
                        <Textarea rows={3} className="text-sm w-full resize-none" value={f.amputationLevelNote} onChange={(e) => set({ amputationLevelNote: e.target.value })} />
                      </PfRow>
                    </>
                  )}

                  <PfRow label="تاريخ البتر">
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        placeholder="السنة *"
                        min={1900} max={2100}
                        className="h-7 text-sm w-24"
                        value={g.amputationYear}
                        onChange={(e) => setG({ amputationYear: e.target.value })}
                      />
                      <Select value={g.amputationMonth} onValueChange={(v) => setG({ amputationMonth: v })}>
                        <SelectTrigger className="h-7 text-sm w-32">
                          <SelectValue placeholder="الشهر" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">— بدون شهر —</SelectItem>
                          {ARABIC_MONTHS.map((mn, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>{mn}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </PfRow>
                  <PfRow label="سبب البتر">
                    {[["WAR_INJURY","إصابة حرب"],["TRAFFIC_ACCIDENT","حادث مرور"],["DIABETES","داء السكري"],["VASCULAR_DISEASE","مرض الأوعية"],["CONGENITAL","خلقي"],["INFECTION","عدوى"],["TUMOR","ورم"],["WORK_INJURY","إصابة عمل"],["OTHER","أخرى"]].map(([val, lbl]) => (
                      <PfSq key={val} checked={g.amputationCause === val} label={lbl} onClick={() => setG({ amputationCause: val })} />
                    ))}
                    {g.amputationCause === "OTHER" && (
                      <Input className="h-7 text-sm w-52 mt-1" placeholder="تحديد السبب..." value={g.amputationCauseOtherDetail} onChange={(e) => setG({ amputationCauseOtherDetail: e.target.value })} />
                    )}
                  </PfRow>
                  <PfRow label="القصة السريرية">
                    <Textarea rows={2} className="text-sm w-full" value={g.clinicalHistory} onChange={(e) => setG({ clinicalHistory: e.target.value })} />
                  </PfRow>

                  {isBilateral ? (
                    <div className="grid grid-cols-2 gap-x-6 border-t border-border/30 pt-1">
                      <div className="divide-y divide-border/30 border-l border-border/30 pl-4">
                        <PfDivider label="يمين" />
                        {renderSideBlock(lowerAssessForm, setLowerAssessForm, true)}
                      </div>
                      <div className="divide-y divide-border/30">
                        <PfDivider label="يسار" />
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
            const groups = [...new Set(LOWER_ROM_MOVES.map((m) => m.group))];
            return (
              <Section title="تقييم قوة حركة العضلات" action={lowerSaved ? <SavedBadge /> : undefined}>
                <fieldset disabled={lowerSaved} className="contents">
                <div className="divide-y divide-border/30">
                  {groups.map((group) => (
                    <PfRow key={group} label={group}>
                      <div className="flex flex-col gap-2 w-full">
                        {LOWER_ROM_MOVES.filter((m) => m.group === group).map((m) => {
                          const entry = f.romData[m.key] ?? { selected: false };
                          return (
                            <div key={m.key} className="flex items-center gap-3 flex-wrap">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-[15px] h-[15px] checkbox-orange"
                                  checked={entry.selected}
                                  onChange={() => setRom(m.key, { ...entry, selected: !entry.selected })}
                                />
                                <span className="text-sm">{m.label}</span>
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
                  <PfRow label="ملاحظات">
                    <Textarea rows={2} className="text-sm w-full" value={f.muscleMotionNotes} onChange={(e) => set({ muscleMotionNotes: e.target.value })} />
                  </PfRow>
                  {!lowerSaved && (
                    <div className="pt-3">
                      <Button onClick={handleSubmitLowerAssessment} disabled={submitAssessmentLower.isPending} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                        {submitAssessmentLower.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                        حفظ تقييم الطرف السفلي
                      </Button>
                    </div>
                  )}
                </div>
                </fieldset>
              </Section>
            );
          })()}

          {/* ─── زر الإرسال للجنة ────────────────────────────────────────────── */}
          {c.status === "ASSESSMENT" && (
            <Button
              onClick={handleSubmitAssessmentAndAdvance}
              disabled={submitAssessmentUpper.isPending || submitAssessmentLower.isPending || updateStatus.isPending}
              className="w-full"
            >
              {(submitAssessmentUpper.isPending || submitAssessmentLower.isPending || updateStatus.isPending) ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
              إرسال التقييم للجنة
            </Button>
          )}
          {/* ── صور البتر ── */}
          <Section
            title={`صور البتر${attachments.length > 0 ? ` (${attachments.length})` : ""}`}
            action={
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={uploadAttachment.isPending}>
                      {uploadAttachment.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Plus className="h-4 w-4 ml-1" />}
                      رفع صورة
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => attachCameraRef.current?.click()}>
                      <Camera className="h-4 w-4 ml-2" />
                      التقاط من الكاميرا
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => attachFileRef.current?.click()}>
                      <Plus className="h-4 w-4 ml-2" />
                      اختيار من الملفات
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
              <p className="text-center py-8 text-muted-foreground text-sm">لا توجد صور مرفقة</p>
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
        </TabsContent>

        {/* ── COMMITTEE ───────────────────────────────────────────────────── */}
        <TabsContent value="committee_review" className="mt-4 space-y-4" dir={isRtl ? "rtl" : "ltr"}>

          {/* أعضاء لجنة القبول وتقييماتهم */}
          <Section title="أعضاء لجنة القبول وتقييماتهم">
            <div className="space-y-5 divide-y divide-border/40">

              {/* فني الأطراف الصناعية */}
              <div className="space-y-2 pt-2 first:pt-0">
                <Label className="font-semibold">تقييم فني الأطراف الصناعية</Label>
                <Textarea rows={3} value={prosthetistOpinion} onChange={(e) => setProsthetistOpinion(e.target.value)} placeholder="رأي فني الأطراف الصناعية..." />
              </div>

              {/* المعالج الفيزيائي */}
              <div className="space-y-2 pt-4">
                <Label className="font-semibold">تقييم المعالج الفيزيائي</Label>
                <Textarea rows={3} value={physioOpinion} onChange={(e) => setPhysioOpinion(e.target.value)} placeholder="رأي المعالج الفيزيائي..." />
              </div>

              {/* الطبيب المختص */}
              <div className="space-y-2 pt-4">
                <Label className="font-semibold">رأي الطبيب المختص</Label>
                <Textarea rows={3} value={doctorOpinion} onChange={(e) => setDoctorOpinion(e.target.value)} placeholder="رأي الطبيب المختص..." />
              </div>

              {/* الخلاصة */}
              <div className="space-y-2 pt-4">
                <Label className="font-semibold">الخلاصة <span className="text-destructive">*</span></Label>
                <Textarea rows={3} value={decisionForm.finalSummary} onChange={(e) => setDecisionForm((f) => ({ ...f, finalSummary: e.target.value }))} placeholder="الخلاصة النهائية للجنة..." />
              </div>

              {c.status === "COMMITTEE_REVIEW" && (
                <div className="pt-4">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSaveCommitteeAll}
                    disabled={submitOpinion.isPending}
                  >
                    {submitOpinion.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                    حفظ الآراء
                  </Button>
                </div>
              )}
            </div>
          </Section>

          {/* القرار النهائي */}
          <Section title="القرار النهائي">
            <div className="space-y-3">
              {/* هل المريض مناسب للطرف الصناعي؟ */}
              <div className="space-y-1.5">
                <Label>هل المريض مناسب للطرف الصناعي؟</Label>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">غير مناسب</span>
                    <Switch
                      checked={committeeSuitForm.prosthesisSuitable === true}
                      onCheckedChange={(v) => setCommitteeSuitForm((f) => ({
                        ...f,
                        prosthesisSuitable: v,
                        proposedProsthesisType: v ? f.proposedProsthesisType : "",
                      }))}
                    />
                    <span className="text-sm text-muted-foreground">مناسب</span>
                  </div>
                  {committeeSuitForm.prosthesisSuitable === true && (
                    <Input
                      className="h-8 text-sm"
                      placeholder="نوع الطرف الصناعي المقترح..."
                      value={committeeSuitForm.proposedProsthesisType}
                      onChange={(e) => setCommitteeSuitForm((f) => ({ ...f, proposedProsthesisType: e.target.value }))}
                    />
                  )}
                </div>
              </div>
              {(c.status === "COMMITTEE_REVIEW" || c.status === "COMMITTEE_APPROVED") && (
                <>
                  <div className="pt-2">
                    <p className="text-sm font-semibold mb-2">التوقيعات</p>
                    <div className="grid grid-cols-3 gap-3">
                      {(([
                        { role: "DOCTOR" as const, label: "توقيع الطبيب" },
                        { role: "PROSTHETIST" as const, label: "توقيع فني الأطراف" },
                        { role: "PHYSIOTHERAPIST" as const, label: "توقيع المعالج الفيزيائي" },
                      ])).map(({ role, label }) => (
                        <ActionGuard key={role} permission={PERMISSIONS.CLINIC_PROSTHETICS.COMMITTEE_SIGN}>
                          <div className="space-y-1.5">
                            <input
                              ref={committeeSigRefs[role]}
                              type="file" accept="image/*" className="hidden"
                              onChange={(e) => handleCommitteeSigFileChange(e, role)}
                            />
                            {committeeSigUrls[role] ? (
                              <div className="rounded border p-2 space-y-1.5 text-center">
                                <img src={committeeSigUrls[role]} alt={label} className="h-14 w-full object-contain border rounded bg-white" />
                                <p className="text-[11px] text-muted-foreground">{label}</p>
                                <button
                                  type="button"
                                  className="text-xs text-destructive hover:underline"
                                  onClick={() => setCommitteeSigUrls((prev) => { const n = { ...prev }; delete n[role]; return n; })}
                                >
                                  إزالة
                                </button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                className="w-full flex-col h-auto py-3 gap-1"
                                disabled={committeeSigLoading[role]}
                                onClick={() => committeeSigRefs[role].current?.click()}
                              >
                                {committeeSigLoading[role]
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <span className="text-sm font-medium">{label}</span>
                                }
                                {!committeeSigLoading[role] && <span className="text-xs text-muted-foreground">رفع صورة</span>}
                              </Button>
                            )}
                          </div>
                        </ActionGuard>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleSubmitDecision} disabled={!decisionForm.finalSummary || submitDecision.isPending} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    {submitDecision.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
                    حفظ القرار
                  </Button>
                </>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* ── FITTING ─────────────────────────────────────────────────────── */}
        <TabsContent value="fitting" className="mt-4 space-y-4" dir={isRtl ? "rtl" : "ltr"}>
          <Section title="أجزاء ومكونات الطرف الصناعي">
            <div className="space-y-5">

              {/* موقع أجزاء الطرف الصناعي */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">موقع أجزاء الطرف الصناعي </p>
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
                      {val === "WAREHOUSE" ? "المستودع — warehouse" : "خارجي — external"}
                    </label>
                  ))}
                </div>
              </div>

              {/* الشركة */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">الشركة </p>
                <div className="flex flex-wrap items-center gap-5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="supplier"
                      checked={compShared.supplier === "OTTOBOCK"}
                      onChange={() => setCompShared((s) => ({ ...s, supplier: "OTTOBOCK" }))}
                      className="accent-primary"
                    />
                    أوتوبوك — OTTOBOCK
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="supplier"
                      checked={compShared.supplier === "OTHER"}
                      onChange={() => setCompShared((s) => ({ ...s, supplier: "OTHER" }))}
                      className="accent-primary"
                    />
                    أخر — Other
                  </label>
                  {compShared.supplier === "OTHER" && (
                    <Input
                      className="h-7 w-44 text-sm"
                      placeholder="اسم الشركة..."
                      value={compShared.supplierOther}
                      onChange={(e) => setCompShared((s) => ({ ...s, supplierOther: e.target.value }))}
                    />
                  )}
                </div>
              </div>

              {/* جدول الأجزاء */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">اجزاء ومكونات الطرف الصناعي مع الكود</p>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="border border-border px-2 py-1.5 text-center w-9 font-medium">#</th>
                      <th className="border border-border px-3 py-1.5 text-right font-medium">الاسم / name</th>
                      <th className="border border-border px-3 py-1.5 text-right font-medium">الكود / Code</th>
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
                disabled={addComponent.isPending || !compRows.some((r) => r.inventoryItemId)}
                className="w-full gap-2"
              >
                {addComponent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                حفظ الأجزاء
              </Button>

              {/* الأجزاء المضافة */}
              {components.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">الأجزاء المضافة</p>
                  <div className="rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-right p-2 font-medium">الكود</th>
                          <th className="text-right p-2 font-medium">القطعة</th>
                          <th className="text-right p-2 font-medium">الشركة</th>
                          <th className="text-right p-2 font-medium">المصدر</th>
                          <th className="text-right p-2 font-medium">تاريخ الإضافة</th>
                          <th className="text-right p-2 font-medium">حالة الطلب</th>
                          <th className="text-right p-2 font-medium">المخزون</th>
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
                            <td className="p-2 text-muted-foreground">{SOURCE_LOCATION_LABEL[(comp.sourceLocation ?? comp.source) as string] ?? "—"}</td>
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
                                        {REQUEST_STATUS_LABEL[reqStatus]}
                                      </Badge>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 text-sm">{reqNotes}</PopoverContent>
                                </Popover>
                              ) : (
                                <Badge variant="outline" className={`text-xs ${REQUEST_STATUS_BADGE[reqStatus]}`}>
                                  {REQUEST_STATUS_LABEL[reqStatus]}
                                </Badge>
                              )}
                            </td>
                            <td className="p-2">
                              {reqStatus === "APPROVED" || reqStatus === "DONE"
                                ? <span className="text-xs text-green-600 font-medium">خُصم</span>
                                : reqStatus === "PENDING"
                                ? <span className="text-xs text-amber-600 font-medium">معلق</span>
                                : reqStatus === "NOT_AVAILABLE"
                                ? <span className="text-xs text-red-600 font-medium">لم يُخصم</span>
                                : matched === false
                                ? <span className="text-xs text-orange-600 font-medium">غير موجود بالمخزون</span>
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
                    <DialogTitle>إضافة قطعة غير مسجّلة بالمخزون</DialogTitle>
                    <DialogDescription>تُحفظ بدون ربط بالمخزون ويصل إشعار لمسؤول المخزون لإضافتها.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-1">
                    <div className="space-y-1.5">
                      <Label>اسم القطعة *</Label>
                      <Input
                        value={customPartDialog.name}
                        onChange={(e) => setCustomPartDialog((s) => ({ ...s, name: e.target.value }))}
                        placeholder="اسم القطعة..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>الكود *</Label>
                      <Input
                        value={customPartDialog.code}
                        onChange={(e) => setCustomPartDialog((s) => ({ ...s, code: e.target.value }))}
                        placeholder="الكود..."
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <DialogFooter className="flex gap-2 justify-end sm:justify-end">
                    <Button variant="outline" onClick={() => setCustomPartDialog({ open: false, name: "", code: "" })}>إلغاء</Button>
                    <Button
                      onClick={handleAddCustomPart}
                      disabled={addComponent.isPending || !customPartDialog.name.trim() || !customPartDialog.code.trim()}
                    >
                      {addComponent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إضافة"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={!!confirmDelComp} onOpenChange={(open) => { if (!open) setConfirmDelComp(null); }}>
                <DialogContent className="max-w-sm" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>تأكيد الحذف</DialogTitle>
                    <DialogDescription>هل تريد حذف هذا الجزء؟ لا يمكن التراجع عن هذا الإجراء.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="flex gap-2 justify-end sm:justify-end">
                    <Button variant="outline" onClick={() => setConfirmDelComp(null)}>لا</Button>
                    <Button variant="destructive" disabled={deleteComponent.isPending}
                      onClick={() => { if (confirmDelComp) { deleteComponent.mutate({ id, compId: confirmDelComp }); setConfirmDelComp(null); } }}>
                      {deleteComponent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "نعم، احذف"}
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
                  <span className="text-sm font-medium">الطرف مكتمل </span>
                </label>
                {c.status === "FITTING" && (
                  <Button onClick={handleAdvanceToGait} disabled={updateStatus.isPending} className="w-full">
                    الانتقال لتحليل المشي
                  </Button>
                )}
              </div>

            </div>
          </Section>
        </TabsContent>

        {/* ── MEASUREMENT SHEET ───────────────────────────────────────────── */}
        <TabsContent value="measurement_sheet" className="mt-4 space-y-4" dir="rtl">
          {/* Type selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              { key: "ankle_disarticulation", label: "عبر الكاحل" },
              { key: "below_knee", label: "تحت الركبة" },
              { key: "knee_disarticulation", label: "عبر الركبة" },
              { key: "above_knee", label: "فوق الركبة" },
              { key: "hemipelvectomy", label: "عبر الحوض" },
              { key: "elbow_disarticulation", label: "عبر المرفق" },
              { key: "transhumeral", label: "فوق المرفق" },
              { key: "transradial", label: "تحت المرفق" },
            ] as { key: MeasureSheetType; label: string }[]).map(({ key, label }) => (
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
                {label}
              </button>
            ))}
          </div>

          {/* Ankle disarticulation form */}
          {measureSheetType.includes("ankle_disarticulation") && (
            <Section title="ورق قياس — عبر الكاحل">
              <div className="space-y-5">
                <MeasurementHistoryList records={ankleDisarticulationRecords} />

                {(ankleDisarticulationRecords.length === 0 || measureAddOpen.ankle_disarticulation) && (
                  <div className="space-y-5">
                    {/* Side + foot measurement + notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>الجهة *</Label>
                        <Select
                          value={ankleForm.side}
                          onValueChange={(v) => setAnkleForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">اليمين</SelectItem>
                            <SelectItem value="LEFT">اليسار</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>قياس القدم</Label>
                        <Input
                          placeholder="مثال: 26cm"
                          value={ankleForm.footMeasurement}
                          onChange={(e) => setAnkleForm((f) => ({ ...f, footMeasurement: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>ملاحظات</Label>
                        <Input
                          placeholder="ملاحظات عامة..."
                          value={ankleForm.notes}
                          onChange={(e) => setAnkleForm((f) => ({ ...f, notes: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Measurements grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Affected limb — 19 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف المصاب (1–19)</p>
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
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف السليم (1–5)</p>
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
                        حفظ ورق القياس
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
                      {measureAddOpen.ankle_disarticulation ? "إلغاء" : "إضافة قياس جديد"}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Knee disarticulation form */}
          {measureSheetType.includes("knee_disarticulation") && (
            <Section title="ورق قياس — عبر الركبة">
              <div className="space-y-5">
                <MeasurementHistoryList records={kneeDisarticulationRecords} />

                {(kneeDisarticulationRecords.length === 0 || measureAddOpen.knee_disarticulation) && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>الجهة *</Label>
                        <Select value={kneeForm.side} onValueChange={(v) => setKneeForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">اليمين</SelectItem>
                            <SelectItem value="LEFT">اليسار</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>قياس القدم</Label>
                        <Input placeholder="مثال: 26cm" value={kneeForm.footMeasurement} onChange={(e) => setKneeForm((f) => ({ ...f, footMeasurement: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>ملاحظات</Label>
                        <Input placeholder="ملاحظات عامة..." value={kneeForm.notes} onChange={(e) => setKneeForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Affected limb — 12 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف المصاب (1–12)</p>
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
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف السليم (1–5)</p>
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
                        حفظ ورق القياس
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
                      {measureAddOpen.knee_disarticulation ? "إلغاء" : "إضافة قياس جديد"}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Transfemoral (above knee) form */}
          {measureSheetType.includes("above_knee") && (
            <Section title="ورق قياس — فوق الركبة">
              <div className="space-y-5">
                <MeasurementHistoryList records={transfemoralRecords} />

                {(transfemoralRecords.length === 0 || measureAddOpen.above_knee) && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>الجهة *</Label>
                        <Select value={transfemoralForm.side} onValueChange={(v) => setTransfemoralForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">اليمين</SelectItem>
                            <SelectItem value="LEFT">اليسار</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>قياس القدم</Label>
                        <Input placeholder="مثال: 27cm" value={transfemoralForm.footMeasurement} onChange={(e) => setTransfemoralForm((f) => ({ ...f, footMeasurement: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>ملاحظات</Label>
                        <Input placeholder="ملاحظات عامة..." value={transfemoralForm.notes} onChange={(e) => setTransfemoralForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Affected limb — 12 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف المصاب (1–12)</p>
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
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف السليم (1–11)</p>
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
                        حفظ ورق القياس
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
                      {measureAddOpen.above_knee ? "إلغاء" : "إضافة قياس جديد"}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Transtibial (below knee) form */}
          {measureSheetType.includes("below_knee") && (
            <Section title="ورق قياس — تحت الركبة">
              <div className="space-y-5">
                <MeasurementHistoryList records={transtibialRecords} />

                {(transtibialRecords.length === 0 || measureAddOpen.below_knee) && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>الجهة *</Label>
                        <Select value={transtibialForm.side} onValueChange={(v) => setTranstibialForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">اليمين</SelectItem>
                            <SelectItem value="LEFT">اليسار</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>قياس القدم</Label>
                        <Input placeholder="مثال: 26cm" value={transtibialForm.footMeasurement} onChange={(e) => setTranstibialForm((f) => ({ ...f, footMeasurement: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>ملاحظات</Label>
                        <Input placeholder="ملاحظات عامة..." value={transtibialForm.notes} onChange={(e) => setTranstibialForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Affected limb — 19 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف المصاب (1–19)</p>
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
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف السليم (1–5)</p>
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
                        حفظ ورق القياس
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
                      {measureAddOpen.below_knee ? "إلغاء" : "إضافة قياس جديد"}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Transradial (below elbow) form */}
          {measureSheetType.includes("transradial") && (
            <Section title="ورق قياس — تحت المرفق">
              <div className="space-y-5">
                <MeasurementHistoryList records={transradialRecords} />

                {(transradialRecords.length === 0 || measureAddOpen.transradial) && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>الجهة *</Label>
                        <Select value={transradialForm.side} onValueChange={(v) => setTransradialForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">اليمين</SelectItem>
                            <SelectItem value="LEFT">اليسار</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>ملاحظات</Label>
                        <Input placeholder="ملاحظات عامة..." value={transradialForm.notes} onChange={(e) => setTransradialForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sound limb — 7 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف السليم (1–7)</p>
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
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف المصاب (1–10)</p>
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
                        حفظ ورق القياس
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
                      {measureAddOpen.transradial ? "إلغاء" : "إضافة قياس جديد"}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Transhumeral (above elbow) form */}
          {measureSheetType.includes("transhumeral") && (
            <Section title="ورق قياس — فوق المرفق">
              <div className="space-y-5">
                <MeasurementHistoryList records={transhumeralRecords} />

                {(transhumeralRecords.length === 0 || measureAddOpen.transhumeral) && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>الجهة *</Label>
                        <Select value={transhumeralForm.side} onValueChange={(v) => setTranshumeralForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">اليمين</SelectItem>
                            <SelectItem value="LEFT">اليسار</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>ملاحظات</Label>
                        <Input placeholder="ملاحظات عامة..." value={transhumeralForm.notes} onChange={(e) => setTranshumeralForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sound limb — 10 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف السليم (1–10)</p>
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
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف المصاب (1–6)</p>
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
                        حفظ ورق القياس
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
                      {measureAddOpen.transhumeral ? "إلغاء" : "إضافة قياس جديد"}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Elbow disarticulation form */}
          {measureSheetType.includes("elbow_disarticulation") && (
            <Section title="ورق قياس — عبر المرفق">
              <div className="space-y-5">
                <MeasurementHistoryList records={elbowDisarticulationRecords} />

                {(elbowDisarticulationRecords.length === 0 || measureAddOpen.elbow_disarticulation) && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>الجهة *</Label>
                        <Select value={elbowForm.side} onValueChange={(v) => setElbowForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">اليمين</SelectItem>
                            <SelectItem value="LEFT">اليسار</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>ملاحظات</Label>
                        <Input placeholder="ملاحظات عامة..." value={elbowForm.notes} onChange={(e) => setElbowForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sound limb — 12 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف السليم (1–12)</p>
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
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف المصاب (1–9)</p>
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
                        حفظ ورق القياس
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
                      {measureAddOpen.elbow_disarticulation ? "إلغاء" : "إضافة قياس جديد"}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Hemipelvectomy (through pelvis) form */}
          {measureSheetType.includes("hemipelvectomy") && (
            <Section title="ورق قياس — عبر الحوض">
              <div className="space-y-5">
                <MeasurementHistoryList records={hemipelvectomyRecords} />

                {(hemipelvectomyRecords.length === 0 || measureAddOpen.hemipelvectomy) && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>الجهة *</Label>
                        <Select value={hemipelvectomyForm.side} onValueChange={(v) => setHemipelvectomyForm((f) => ({ ...f, side: v as "RIGHT" | "LEFT" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RIGHT">اليمين</SelectItem>
                            <SelectItem value="LEFT">اليسار</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>قياس القدم</Label>
                        <Input placeholder="مثال: 27cm" value={hemipelvectomyForm.footMeasurement} onChange={(e) => setHemipelvectomyForm((f) => ({ ...f, footMeasurement: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>ملاحظات</Label>
                        <Input placeholder="ملاحظات عامة..." value={hemipelvectomyForm.notes} onChange={(e) => setHemipelvectomyForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sound limb — 15 fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف السليم (1–15)</p>
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
                        <p className="text-sm font-semibold text-center border-b pb-2">الطرف المصاب</p>
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
                        حفظ ورق القياس
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
                      {measureAddOpen.hemipelvectomy ? "إلغاء" : "إضافة قياس جديد"}
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          {measureSheetType.length === 0 && (
            <div className="rounded-lg border border-dashed flex items-center justify-center py-16">
              <p className="text-muted-foreground text-sm">اختر نوع البتر لعرض ورق القياس المناسب</p>
            </div>
          )}
        </TabsContent>

        {/* ── TREATMENT PROGRAM ───────────────────────────────────────────── */}
        <TabsContent value="treatment_program" className="mt-4 space-y-4" dir="rtl">
          <TreatmentProgramsSection
            caseId={id}
            staffList={staffList}
            currentUser={currentUser}
          />
          <ReviewProgramsSection
            caseId={id}
            staffList={staffList}
            currentUser={currentUser}
          />
        </TabsContent>

        {/* ── GAIT ANALYSIS ───────────────────────────────────────────────── */}
        <TabsContent value="gait_analysis" className="mt-4" dir={isRtl ? "rtl" : "ltr"}>
          <GaitAnalysisSection caseId={id} staffList={staffList} />
        </TabsContent>

        {/* ── BALANCE ASSESSMENT ──────────────────────────────────────────── */}
        {ampTypes.includes("LOWER") && (
          <TabsContent value="balance_assessment" className="mt-4" dir={isRtl ? "rtl" : "ltr"}>
            <BalanceAssessmentSection caseId={id} staffList={staffList} />
          </TabsContent>
        )}

        {/* ── FINAL EVALUATION (Pro-018) ───────────────────────────────── */}
        <TabsContent value="final_evaluation" className="mt-4 space-y-4" dir="rtl">

          {/* ── قسم 1: المعلومات الطبية ── */}
          <Section title="المعلومات الطبية حول الطرف الصناعي">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">حالة الجذمور</Label>
                <Textarea rows={2} className="resize-none text-xs" value={finalEvalForm.residualLimbCondition ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, residualLimbCondition: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">نظام التعليق</Label>
                <Input value={finalEvalForm.suspensionSystemUsed ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, suspensionSystemUsed: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">عدد الجوارب / اللاينر (السيليكون) التي تم تسليمها</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">جوارب</span>
                    <Input type="number" min={0} value={finalEvalForm.socksDelivered ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, socksDelivered: e.target.value === "" ? undefined : Number(e.target.value) }))} className="h-8 text-xs" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">لاينر</span>
                    <Input type="number" min={0} value={finalEvalForm.linersDelivered ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, linersDelivered: e.target.value === "" ? undefined : Number(e.target.value) }))} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">تاريخ التركيب</Label>
                <Input type="date" value={finalEvalForm.fittingDate ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, fittingDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ملاحظات عامة</Label>
                <Textarea rows={2} className="resize-none text-xs" value={finalEvalForm.generalNotes ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, generalNotes: e.target.value }))} />
              </div>
            </div>
          </Section>

          {/* ── قسم 2: الرأي النهائي للجنة ── */}
          <Section title="الرأي النهائي للجنة">
            <div className="space-y-3">
              {([
                ["physioOpinion",               "رأي المعالج الفيزيائي"],
                ["departmentHeadOpinion",        "رأي رئيس القسم"],
                ["prosthetistOpinion",           "رأي فني الأطراف الصناعية"],
                ["prosthetistSupervisorOpinion", "رأي مسؤول فني الأطراف الصناعية"],
                ["committeeHeadOpinion",         "رأي رئيس اللجنة"],
                ["expertOpinion",                "رأي الخبير (إن وجد)"],
              ] as const).map(([fld, lbl]) => (
                <div key={fld} className="space-y-1.5">
                  <Label className="text-xs">{lbl}</Label>
                  <Textarea rows={2} className="resize-none text-xs" value={(finalEvalForm as any)[fld] ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, [fld]: e.target.value }))} />
                </div>
              ))}
            </div>
          </Section>

          {/* ── قسم 3: اعتماد المدير الطبي ── */}
          <Section title="اعتماد المدير الطبي">
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed border rounded-lg px-3 py-2.5 bg-muted/30">
                بعد مراجعة التقييمات أعلاه، أقر بأن الطرف الصناعي جاهز للتسليم ولا يوجد مانع طبي أو فني من خروج المريض.
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={!!finalEvalForm.readyForDelivery}
                    onChange={() => setFinalEvalForm((f) => ({ ...f, readyForDelivery: true, needsFollowUp: false }))}
                    className="w-[16px] h-[16px] checkbox-orange rounded-sm" />
                  <span className="text-sm">معتمد للتسليم</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={!!finalEvalForm.needsFollowUp}
                    onChange={() => setFinalEvalForm((f) => ({ ...f, needsFollowUp: true, readyForDelivery: false }))}
                    className="w-[16px] h-[16px] checkbox-orange rounded-sm" />
                  <span className="text-sm">يحتاج متابعة / تعديل قبل التسليم</span>
                </label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">خطة المتابعة (إن وجدت)</Label>
                <Textarea rows={2} className="resize-none text-xs" value={finalEvalForm.followUpPlan ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, followUpPlan: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">يوجد ملحق</Label>
                <Input className="text-xs" value={(finalEvalForm as any).attachment ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, attachment: e.target.value }))} placeholder="وصف الملحق إن وجد..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ملاحظات عامة</Label>
                <Textarea rows={2} className="resize-none text-xs" value={finalEvalForm.medicalDirectorNotes ?? ""} onChange={(e) => setFinalEvalForm((f) => ({ ...f, medicalDirectorNotes: e.target.value }))} />
              </div>
            </div>
          </Section>

          {/* ── قسم 4: تدقيق المدير ── */}
          <Section title="تدقيق المدير">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">ملاحظات عامة</Label>
                <Textarea rows={2} className="resize-none text-xs" value={finalEvalForm.managerNotes} onChange={(e) => setFinalEvalForm((f) => ({ ...f, managerNotes: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">اضبارة المريض</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={finalEvalForm.patientFileComplete === true}
                      onChange={() => setFinalEvalForm((f) => ({ ...f, patientFileComplete: true }))}
                      className="w-[16px] h-[16px] checkbox-orange rounded-sm" />
                    <span className="text-sm">مكتملة</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={finalEvalForm.patientFileComplete === false}
                      onChange={() => setFinalEvalForm((f) => ({ ...f, patientFileComplete: false }))}
                      className="w-[16px] h-[16px] checkbox-orange rounded-sm" />
                    <span className="text-sm">غير مكتملة</span>
                  </label>
                </div>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold">توقيع المدير</p>
                <Select value={finalEvalForm.managerId || "none"}
                  onValueChange={(v) => setFinalEvalForm((f) => ({ ...f, managerId: v === "none" ? "" : v, managerSignatureUrl: "" }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر المدير" /></SelectTrigger>
                  <SelectContent>
                    {staffList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.fullName ?? s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {finalEvalForm.managerSignatureUrl ? (
                  <div className="relative">
                    <img src={finalEvalForm.managerSignatureUrl} alt="توقيع المدير" className="h-16 w-full object-contain border rounded bg-white" />
                    <button onClick={() => setFinalEvalForm((f) => ({ ...f, managerSignatureUrl: "" }))} className="absolute top-0 left-0 text-destructive text-xs p-0.5">✕</button>
                  </div>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={handleFinalEvalManagerSigClick} disabled={!finalEvalForm.managerId}>
                    {finalEvalForm.managerId ? "جلب / رفع التوقيع" : "اختر المدير أولاً"}
                  </Button>
                )}
                <input ref={finalEvalManagerSigRef} type="file" accept="image/*" className="hidden" onChange={handleFinalEvalManagerSigFileChange} />
              </div>
            </div>
          </Section>

          {/* ── الأزرار ── */}
          <div className="flex gap-2">
            <Button onClick={handleSubmitFinalEval} disabled={submitFinalEval.isPending} className="flex-1 gap-2">
              {submitFinalEval.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ التقييم
            </Button>
          </div>
        </TabsContent>

        {/* ── DELIVERED (Pro-019) ──────────────────────────────────────────── */}
        <TabsContent value="delivered" className="mt-4 space-y-4" dir="rtl">

          <Section
            title="بيانات تسليم الطرف الصناعي — Pro-019"
            action={
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setStageTab("fitting")}>
                <Plus className="h-3.5 w-3.5" />
                إضافة قطعة
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">تاريخ الخروج</Label>
                  <Input type="date" value={proDeliveryHeader.inspectionDate} onChange={(e) => setProDeliveryHeader((f) => ({ ...f, inspectionDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">الفني — الأطراف الصناعية</Label>
                  <Select value={proDeliveryHeader.prosthetistId || "none"} onValueChange={(v) => setProDeliveryHeader((f) => ({ ...f, prosthetistId: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— غير محدد —</SelectItem>
                      {staffList.filter((e: any) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("الاطراف الصناعية") || e.department?.nameAr?.includes("الأطراف الصناعية"))).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">المعالج الفيزيائي</Label>
                  <Select value={proDeliveryHeader.physiotherapistId || "none"} onValueChange={(v) => setProDeliveryHeader((f) => ({ ...f, physiotherapistId: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— غير محدد —</SelectItem>
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
                        القطع المُسلَّمة{items.length ? ` (${items.length})` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">تُضاف تلقائيًا عند اعتماد القطعة في المخزون.</p>
                      {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">لا توجد قطع بعد — تظهر هنا تلقائيًا بعد اعتماد قطع الحالة في المخزون.</p>
                      ) : (
                        <div className="rounded-lg border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-right p-2 font-medium">الاسم</th>
                                <th className="text-right p-2 font-medium">الرمز</th>
                                <th className="text-right p-2 font-medium">الكمية</th>
                                <th className="text-right p-2 font-medium">الشركة</th>
                                <th className="text-right p-2 font-medium">المصدر</th>
                                <th className="text-right p-2 font-medium">تاريخ الإضافة</th>
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
                                      {item.sourceComponentId ? "تلقائي" : "يدوي"}
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
                <Label className="text-xs">المدير الطبي</Label>
                <Select value={proDeliveryHeader.medicalDirectorId || "none"} onValueChange={(v) => setProDeliveryHeader((f) => ({ ...f, medicalDirectorId: v === "none" ? "" : v, medicalDirectorSignatureUrl: "", medicalDirectorSignedAt: "" }))}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— غير محدد —</SelectItem>
                    {staffList.filter((e: any) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("الادارة الطبية") || e.department?.nameAr?.includes("الإدارة الطبية"))).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Medical director signature */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold">توقيع المدير الطبي</p>
                {proDeliveryHeader.medicalDirectorSignatureUrl ? (
                  <div className="relative inline-block">
                    <img src={proDeliveryHeader.medicalDirectorSignatureUrl} alt="توقيع المدير الطبي" className="h-20 object-contain border rounded bg-white" />
                    <button onClick={() => setProDeliveryHeader((f) => ({ ...f, medicalDirectorSignatureUrl: "", medicalDirectorSignedAt: "" }))} className="absolute top-0 left-0 text-destructive text-xs p-0.5">✕</button>
                  </div>
                ) : (
                  <Button type="button" size="sm" variant="outline" onClick={handleMedicalDirectorSignatureClick} disabled={!proDeliveryHeader.medicalDirectorId}>
                    {proDeliveryHeader.medicalDirectorId ? "جلب / رفع التوقيع" : "اختر المدير الطبي أولاً"}
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">التاريخ</Label>
                <Input type="date" value={proDeliveryHeader.signatureDate} onChange={(e) => setProDeliveryHeader((f) => ({ ...f, signatureDate: e.target.value }))} />
              </div>

              <input ref={medicalDirectorSigRef} type="file" accept="image/*" className="hidden" onChange={handleMedicalDirectorSigFileChange} />

              <Button
                onClick={() => saveProsDelivery.mutateAsync({ caseId: id, dto: { inspectionDate: proDeliveryHeader.inspectionDate || undefined, prosthetistId: proDeliveryHeader.prosthetistId || undefined, physiotherapistId: proDeliveryHeader.physiotherapistId || undefined, medicalDirectorId: proDeliveryHeader.medicalDirectorId || undefined, medicalDirectorSignatureUrl: proDeliveryHeader.medicalDirectorSignatureUrl || undefined, medicalDirectorSignedAt: proDeliveryHeader.medicalDirectorSignedAt || undefined, signatureDate: proDeliveryHeader.signatureDate || undefined } })}
                disabled={saveProsDelivery.isPending}
                className="w-full gap-2"
              >
                {saveProsDelivery.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                حفظ بيانات التسليم
              </Button>
            </div>
          </Section>
        </TabsContent>

        {/* ── FINAL DELIVERY (approved items only) ─────────────────────────── */}
        <TabsContent value="final_delivery" className="mt-4 space-y-4" dir="rtl">
          {/* Not created yet — GET returns null until POST /final-delivery. */}
          {!finalDelivery ? (
            <Section title="التسليم النهائي">
              <div className="text-center py-10 space-y-3">
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  لم يُنشأ التسليم النهائي بعد. عند الإنشاء تُنسخ البيانات والقطع المعتمدة من «التسليم التجريبي» تلقائيًا — والنسخ يتم مرة واحدة فقط.
                </p>
                <Button
                  onClick={() => createFinalDelivery.mutate({ caseId: id })}
                  disabled={createFinalDelivery.isPending}
                  className="gap-2"
                >
                  {createFinalDelivery.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  إنشاء التسليم النهائي
                </Button>
              </div>
            </Section>
          ) : (
            <Section title="التسليم النهائي">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">تاريخ الخروج</Label>
                    <Input type="date" value={finalDeliveryHeader.inspectionDate}
                      onChange={(e) => setFinalDeliveryHeader((f) => ({ ...f, inspectionDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">الفني — الأطراف الصناعية</Label>
                    <Select value={finalDeliveryHeader.prosthetistId || "none"} onValueChange={(v) => setFinalDeliveryHeader((f) => ({ ...f, prosthetistId: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— غير محدد —</SelectItem>
                        {staffList.filter((e: any) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("الاطراف الصناعية") || e.department?.nameAr?.includes("الأطراف الصناعية"))).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">المعالج الفيزيائي</Label>
                    <Select value={finalDeliveryHeader.physiotherapistId || "none"} onValueChange={(v) => setFinalDeliveryHeader((f) => ({ ...f, physiotherapistId: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— غير محدد —</SelectItem>
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
                        <p className="text-sm font-semibold">القطع{items.length ? ` (${items.length})` : ""}</p>
                        <p className="text-xs text-muted-foreground">نُسخت من القطع المعتمدة في «التسليم التجريبي» عند الإنشاء.</p>
                        {items.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">لا توجد قطع.</p>
                        ) : (
                          <div className="rounded-lg border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-right p-2 font-medium">الاسم</th>
                                  <th className="text-right p-2 font-medium">الرمز</th>
                                  <th className="text-right p-2 font-medium">الكمية</th>
                                  <th className="text-right p-2 font-medium">الشركة</th>
                                  <th className="text-right p-2 font-medium">تاريخ الإضافة</th>
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
                  <Label className="text-xs">المدير التنفيذي (CEO)</Label>
                  <Select value={finalDeliveryHeader.ceoId || "none"} onValueChange={(v) => setFinalDeliveryHeader((f) => ({ ...f, ceoId: v === "none" ? "" : v, ceoSignatureUrl: "" }))}>
                    <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— غير محدد —</SelectItem>
                      {staffList.filter((e: any) => e.employmentStatus === "ACTIVE" && (e.department?.nameAr?.includes("الادارة التنفيذية") || e.department?.nameAr?.includes("الإدارة التنفيذية"))).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-semibold">توقيع المدير التنفيذي</p>
                  {finalDeliveryHeader.ceoSignatureUrl ? (
                    <div className="relative inline-block">
                      <img src={finalDeliveryHeader.ceoSignatureUrl} alt="توقيع المدير التنفيذي" className="h-20 object-contain border rounded bg-white" />
                      <button onClick={() => setFinalDeliveryHeader((f) => ({ ...f, ceoSignatureUrl: "" }))} className="absolute top-0 left-0 text-destructive text-xs p-0.5">✕</button>
                    </div>
                  ) : (
                    <Button type="button" size="sm" variant="outline" onClick={handleFinalCeoSignatureClick} disabled={!finalDeliveryHeader.ceoId}>
                      {finalDeliveryHeader.ceoId ? "جلب / رفع التوقيع" : "اختر المدير التنفيذي أولاً"}
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">التاريخ</Label>
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
                  حفظ التسليم النهائي
                </Button>
              </div>
            </Section>
          )}
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
