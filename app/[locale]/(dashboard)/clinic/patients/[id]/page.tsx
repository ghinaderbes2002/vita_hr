"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { clinicPatientsApi } from "@/lib/api/clinic-patients";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  User, Phone, MapPin, Calendar, FileText, Activity, Heart,
  Edit2, Trash2, Plus, Upload, Loader2, ArrowRight, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { CaseStatusBadge } from "@/components/clinic/case-status-badge";
import { PodiatryReceptionDialog } from "@/components/clinic/podiatry-reception-dialog";
import { usePodiatryReceptions } from "@/lib/hooks/use-clinic-podiatry";
import { PodiatryReception } from "@/lib/api/clinic-podiatry";
import { VISIT_TYPE_LABEL } from "@/components/clinic/podiatry-labels";
import {
  useClinicPatient, useDeleteClinicPatient,
  usePatientDocuments, useUploadPatientDocument, useDeletePatientDocument, useDownloadPatientDocument,
  usePatientNotes, useCreatePatientNote,
  usePatientConsents,
} from "@/lib/hooks/use-clinic-patients";
import { DocumentType } from "@/lib/api/clinic-patients";
import { useProstheticsCasesByPatient, useCreateProstheticsCase } from "@/lib/hooks/use-clinic-prosthetics";
import { usePhysioCasesByPatient, useCreatePhysioCase } from "@/lib/hooks/use-clinic-physio";
import { ProstheticsCase } from "@/lib/api/clinic-prosthetics";
import { PhysioCase } from "@/lib/api/clinic-physio";

const GENDER_LABEL: Record<string, string> = { MALE: "ذكر", FEMALE: "أنثى" };
const IDENTITY_LABEL: Record<string, string> = { NATIONAL_ID: "هوية وطنية", PASSPORT: "جواز سفر", RESIDENCE: "إقامة" };
const EDUCATION_LABEL: Record<string, string> = { NONE: "بدون تعليم", PRIMARY: "ابتدائي", SECONDARY: "ثانوي", UNIVERSITY: "جامعي", POSTGRADUATE: "دراسات عليا" };
const MARITAL_LABEL: Record<string, string> = { SINGLE: "أعزب", MARRIED: "متزوج", DIVORCED: "مطلق", WIDOWED: "أرمل" };
const FINANCIAL_LABEL: Record<string, string> = { LOW: "منخفض", MODERATE: "متوسط", GOOD: "جيد", NOT_WORKING: "غير عامل", RETIRED: "متقاعد" };
const CONSENT_LABEL: Record<string, string> = { FULL: "موافقة كاملة", ANONYMOUS: "مجهولة", NONE: "رفض" };
const DOC_TYPE_LABEL: Record<string, string> = {
  ID_COPY:             "نسخة هوية",
  PERSONAL_PHOTO:      "صورة شخصية",
  AMPUTATION_PHOTO:    "صورة البتر",
  RESIDUAL_LIMB_PHOTO: "صورة الطرف المتبقي",
  MEDICAL_REPORT:      "تقرير طبي",
  OTHER:               "أخرى",
};

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between py-1.5 border-b last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const [deletePatientOpen, setDeletePatientOpen] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<DocumentType>("OTHER");

  const { data: patient, isLoading } = useClinicPatient(id);
  const { data: prostCases = [] } = useProstheticsCasesByPatient(id);
  const { data: physioCases = [] } = usePhysioCasesByPatient(id);
  const { data: documents = [] } = usePatientDocuments(id);
  const { data: consents = [] } = usePatientConsents(id);
  const { data: podiatryReceptions = [] } = usePodiatryReceptions(id);
  const [podiatryDialogOpen, setPodiatryDialogOpen] = useState(false);
  const { data: notes = [] } = usePatientNotes(id);

  const deletePatient = useDeleteClinicPatient();
  const uploadDoc = useUploadPatientDocument();
  const deleteDoc = useDeletePatientDocument();
  const downloadDoc = useDownloadPatientDocument();
  const createNote = useCreatePatientNote();

  const photoDoc = useMemo(() => documents.find((d) => d.type === "PERSONAL_PHOTO"), [documents]);
  const [photoLoadError, setPhotoLoadError] = useState(false);
  useEffect(() => { setPhotoLoadError(false); }, [photoDoc?.id]);
  const { data: photoUrl } = useQuery({
    queryKey: ["patient-photo-blob", photoDoc?.id],
    queryFn: async () => {
      const blob = await clinicPatientsApi.downloadDocument(id, photoDoc!.id);
      if (!blob.type.startsWith("image/")) return null;
      return URL.createObjectURL(blob);
    },
    enabled: !!photoDoc?.id,
    staleTime: Infinity,
    gcTime: 60_000,
  });
  useEffect(() => {
    return () => { if (photoUrl) URL.revokeObjectURL(photoUrl); };
  }, [photoUrl]);
  const createProst = useCreateProstheticsCase();
  const createPhysio = useCreatePhysioCase();

  const age = patient?.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        المريض غير موجود
      </div>
    );
  }

  const handleDeletePatient = async () => {
    await deletePatient.mutateAsync(id);
    router.push(`/${locale}/clinic/patients`);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    await createNote.mutateAsync({ patientId: id, note: noteText.trim() });
    setNoteText("");
  };

  const handleUploadDocument = async () => {
    if (!uploadFile) return;
    await uploadDoc.mutateAsync({ patientId: id, file: uploadFile, type: uploadType });
    setUploadDialogOpen(false);
    setUploadFile(null);
    setUploadType("OTHER");
  };

  const handleNewProstheticsCase = async () => {
    const c = await createProst.mutateAsync({ patientId: id });
    router.push(`/${locale}/clinic/prosthetics/${c.id}`);
  };

  const handleNewPhysioCase = async () => {
    const c = await createPhysio.mutateAsync({ patientId: id, majorComplaint: "", symptoms: "" });
    router.push(`/${locale}/clinic/physio/${c.id}`);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {photoUrl && !photoLoadError ? (
            <button
              type="button"
              className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary/20 hover:border-primary transition-colors focus:outline-none"
              onClick={() => window.open(photoUrl, "_blank")}
              title="فتح الصورة"
            >
              <img
                src={photoUrl}
                alt={`${patient.firstName} ${patient.lastName}`}
                className="h-full w-full object-cover"
                onError={() => setPhotoLoadError(true)}
              />
            </button>
          ) : (
            <button
              type="button"
              className={`h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold ${photoDoc && photoUrl ? "cursor-pointer hover:opacity-80 border-2 border-primary/20" : "cursor-default"}`}
              onClick={() => photoDoc && photoUrl && window.open(photoUrl, "_blank")}
              disabled={!photoDoc || !photoUrl}
            >
              {patient.firstName[0]}{patient.lastName[0]}
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{patient.firstName} {patient.lastName}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-muted-foreground text-sm font-mono">{patient.patientNumber}</span>
              <Badge variant={patient.gender === "MALE" ? "default" : "secondary"}>
                {GENDER_LABEL[patient.gender]}
              </Badge>
              {age !== null && <span className="text-sm text-muted-foreground">{age} سنة</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/${locale}/clinic/patients/${id}/timeline`)}>
            <Activity className="h-4 w-4 ml-1" />
            الرحلة الزمنية
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/${locale}/clinic/patients/${id}/edit`)}>
            <Edit2 className="h-4 w-4 ml-1" />
            تعديل
          </Button>
          <ActionGuard permission={PERMISSIONS.CLINIC_PATIENTS.DELETE}>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeletePatientOpen(true)}>
              <Trash2 className="h-4 w-4 ml-1" />
              حذف
            </Button>
          </ActionGuard>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Activity className="h-4 w-4" />
              أطراف صناعية
            </div>
            <p className="text-2xl font-bold">{prostCases.length}</p>
            <p className="text-xs text-muted-foreground">حالة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Heart className="h-4 w-4" />
              علاج فيزيائي
            </div>
            <p className="text-2xl font-bold">{physioCases.length}</p>
            <p className="text-xs text-muted-foreground">حالة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <FileText className="h-4 w-4" />
              مستندات
            </div>
            <p className="text-2xl font-bold">{documents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Calendar className="h-4 w-4" />
              آخر زيارة
            </div>
            <p className="text-sm font-medium">
              {patient.lastVisitDate ? new Date(patient.lastVisitDate).toLocaleDateString("en-GB") : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="prosthetics">الأطراف الصناعية ({prostCases.length})</TabsTrigger>
          <TabsTrigger value="physio">العلاج الفيزيائي ({physioCases.length})</TabsTrigger>
          <TabsTrigger value="podiatry">طب الأقدام ({podiatryReceptions.length})</TabsTrigger>
          <TabsTrigger value="documents">المستندات ({documents.length})</TabsTrigger>
          <TabsTrigger value="notes">الملاحظات ({notes.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  المعلومات الشخصية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="الاسم الكامل" value={`${patient.firstName} ${patient.lastName}`} />
                <InfoRow label="نوع الهوية" value={IDENTITY_LABEL[patient.identityType]} />
                <InfoRow label="رقم الهوية" value={patient.idNumber} />
                <InfoRow label="تاريخ الميلاد" value={new Date(patient.dateOfBirth).toLocaleDateString("en-GB")} />
                <InfoRow label="الجنس" value={GENDER_LABEL[patient.gender]} />
                <InfoRow label="الطول" value={patient.heightCm ? `${patient.heightCm} سم` : null} />
                <InfoRow label="الوزن" value={patient.weightKg ? `${patient.weightKg} كغ` : null} />
                <InfoRow label="مؤشر كتلة الجسم" value={patient.bmi ? patient.bmi.toFixed(1) : null} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  التواصل والموقع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="الهاتف" value={patient.phone} />
                <InfoRow label="واتساب" value={patient.whatsapp} />
                <InfoRow label="البريد" value={patient.email} />
                <InfoRow label="المحافظة" value={patient.city?.governorate} />
                <InfoRow label="المدينة" value={patient.city?.name} />
                <InfoRow label="العنوان" value={patient.addressDetails} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  البيانات الاجتماعية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="المستوى التعليمي" value={patient.educationLevel ? EDUCATION_LABEL[patient.educationLevel] : null} />
                <InfoRow label="الحالة الاجتماعية" value={patient.maritalStatus ? MARITAL_LABEL[patient.maritalStatus] : null} />
                <InfoRow label="الوضع المادي" value={patient.financialStatus ? FINANCIAL_LABEL[patient.financialStatus] : null} />
                <InfoRow label="مقدم الرعاية / Care Provider" value={patient.receivesAid ?? null} />
                <InfoRow label="مصدر الإحالة" value={patient.referralSource} />
                <InfoRow label="تفاصيل الإحالة" value={patient.referralDetails} />
              </CardContent>
            </Card>

            {consents.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">الموافقات</CardTitle>
                </CardHeader>
                <CardContent>
                  {consents.map((c) => (
                    <div key={c.id} className="space-y-1">
                      <InfoRow label="توثيق البيانات" value={CONSENT_LABEL[c.documentConsent]} />
                      <InfoRow label="وسائط" value={c.mediaConsent ? "موافق" : "رافض"} />
                      {c.signedAt && <InfoRow label="تاريخ التوقيع" value={new Date(c.signedAt).toLocaleDateString("en-GB")} />}
                      {c.signatureUrl && (
                        <div className="pt-1">
                          <p className="text-sm font-medium">توقيع المريض</p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.signatureUrl.startsWith("http") || c.signatureUrl.startsWith("data:")
                              ? c.signatureUrl
                              : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${c.signatureUrl}`}
                            alt="توقيع المريض"
                            className="mt-1 h-16 max-w-55 object-contain border rounded bg-white"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {patient.notes && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">ملاحظات</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{patient.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Prosthetics Tab */}
        <TabsContent value="prosthetics" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">حالات الأطراف الصناعية</h3>
              <Button size="sm" onClick={handleNewProstheticsCase} disabled={createProst.isPending} className="gap-2">
                {createProst.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                حالة جديدة
              </Button>
          </div>
          {prostCases.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border rounded-lg">لا توجد حالات أطراف صناعية</div>
          ) : (
            <div className="space-y-3">
              {prostCases.map((c: ProstheticsCase) => (
                <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => router.push(`/${locale}/clinic/prosthetics/${c.id}`)}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CaseStatusBadge status={c.status} />
                        {c.amputationType && <Badge variant="outline" className="text-xs">{c.amputationType === "UPPER" ? "طرف علوي" : "طرف سفلي"}</Badge>}
                        {c.amputationSide && <Badge variant="outline" className="text-xs">{c.amputationSide === "RIGHT" ? "أيمن" : c.amputationSide === "LEFT" ? "أيسر" : "ثنائي"}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("en-GB")}
                        {c.amputationLevel && ` — ${c.amputationLevel}`}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Physio Tab */}
        <TabsContent value="physio" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">حالات العلاج الفيزيائي</h3>
              <Button size="sm" onClick={handleNewPhysioCase} disabled={createPhysio.isPending} className="gap-2">
                {createPhysio.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                حالة جديدة
              </Button>
          </div>
          {physioCases.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border rounded-lg">لا توجد حالات علاج فيزيائي</div>
          ) : (
            <div className="space-y-3">
              {physioCases.map((c: PhysioCase) => (
                <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => router.push(`/${locale}/clinic/physio/${c.id}`)}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div>
                      <CaseStatusBadge status={c.status} />
                      <p className="text-xs text-muted-foreground mt-1">{new Date(c.createdAt).toLocaleDateString("en-GB")}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Podiatry Tab */}
        <TabsContent value="podiatry" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">استقبالات طب الأقدام</h3>
            <Button size="sm" onClick={() => setPodiatryDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              استقبال جديد
            </Button>
          </div>
          {podiatryReceptions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border rounded-lg">لا توجد استقبالات طب أقدام</div>
          ) : (
            <div className="space-y-3">
              {(podiatryReceptions as PodiatryReception[]).map((r) => (
                <Card key={r.id} className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => router.push(`/${locale}/clinic/podiatry/${r.id}`)}>
                  <CardContent className="pt-4 flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap gap-1">
                        {(r.visitTypes ?? []).map((v) => (
                          <Badge key={v} variant="outline" className="text-[10px]">{VISIT_TYPE_LABEL[v] ?? v}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "—"}
                        {" — "}
                        {r.sessions?.length ?? 0} جلسة
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">المستندات</h3>
            <ActionGuard permission={PERMISSIONS.CLINIC_PATIENTS.UPLOAD_DOCUMENTS}>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4" />
                رفع مستند
              </Button>
            </ActionGuard>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border rounded-lg">لا توجد مستندات</div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="flex-1 text-sm font-medium">{DOC_TYPE_LABEL[doc.type] ?? doc.type}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="flex items-center gap-1 text-sm text-primary hover:opacity-80 disabled:opacity-40"
                      title="عرض"
                      disabled={downloadDoc.isPending}
                      onClick={() => downloadDoc.mutate({ patientId: id, docId: doc.id })}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <ActionGuard permission={PERMISSIONS.CLINIC_PATIENTS.DELETE}>
                      <button
                        className="text-destructive hover:opacity-80"
                        onClick={() => setDeleteDocId(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </ActionGuard>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-4 space-y-4">
          <ActionGuard permission={PERMISSIONS.CLINIC_PATIENTS.CREATE}>
            <div className="space-y-2">
              <Label>إضافة ملاحظة</Label>
              <Textarea
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="اكتب ملاحظتك هنا..."
              />
              <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim() || createNote.isPending}>
                {createNote.isPending ? "جاري الحفظ..." : "إضافة"}
              </Button>
            </div>
            <Separator />
          </ActionGuard>
          {notes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">لا توجد ملاحظات</div>
          ) : (
            <div className="space-y-3">
              {notes.map((n) => (
                <Card key={n.id}>
                  <CardContent className="pt-4">
                    <p className="text-sm whitespace-pre-wrap">{n.note}</p>
                    <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                      {n.authorName && <span>{n.authorName}</span>}
                      <span>{new Date(n.createdAt).toLocaleString("en-US")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(o) => { if (!uploadDoc.isPending) { setUploadDialogOpen(o); if (!o) { setUploadFile(null); setUploadType("OTHER"); } } }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>رفع مستند</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>نوع المستند</Label>
              <Select value={uploadType} onValueChange={(v) => setUploadType(v as DocumentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DOC_TYPE_LABEL) as DocumentType[]).map((t) => (
                    <SelectItem key={t} value={t}>{DOC_TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>اختر الملف</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
              {uploadFile && (
                <p className="text-xs text-muted-foreground">{uploadFile.name}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={uploadDoc.isPending}>إلغاء</Button>
            <Button onClick={handleUploadDocument} disabled={!uploadFile || uploadDoc.isPending}>
              {uploadDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Upload className="h-4 w-4 ml-2" />}
              رفع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PodiatryReceptionDialog
        open={podiatryDialogOpen}
        onOpenChange={setPodiatryDialogOpen}
        patientId={id}
        onCreated={(receptionId) => router.push(`/${locale}/clinic/podiatry/${receptionId}`)}
      />

      <ConfirmDialog
        open={deletePatientOpen}
        onOpenChange={setDeletePatientOpen}
        title="حذف المريض"
        description="هل أنت متأكد؟ سيتم حذف جميع بيانات المريض وحالاته بشكل نهائي."
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDeletePatient}
      />

      <ConfirmDialog
        open={!!deleteDocId}
        onOpenChange={(o) => { if (!o) setDeleteDocId(null); }}
        title="حذف المستند"
        description="هل تريد حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        variant="destructive"
        onConfirm={() => {
          if (deleteDocId) deleteDoc.mutate({ patientId: id, docId: deleteDocId });
          setDeleteDocId(null);
        }}
      />

    </div>
  );
}
