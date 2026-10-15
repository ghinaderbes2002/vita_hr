"use client";

import { useEffect, useState } from "react";
import { Eye, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useClinicPatients } from "@/lib/hooks/use-clinic-patients";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { useCreatePatientSurvey, usePatientSurvey, usePatientSurveys } from "@/lib/hooks/use-patient-surveys";
import type { Patient } from "@/lib/api/clinic-patients";
import type {
  ComplaintStage, CreatePatientSurveyDto, PatientSurvey, PatientSurveyListParams,
  PodiatryServiceType, SurveyAgeGroup, SurveyDepartment, SurveyGender,
} from "@/lib/api/patient-surveys";

// ─── Labels ───────────────────────────────────────────────────────────────────

export const SURVEY_DEPARTMENT_LABEL: Record<SurveyDepartment, string> = {
  PROSTHETICS: "الأطراف الصناعية",
  PODIATRY: "طب الأقدام",
  PHYSIO: "العلاج الفيزيائي",
};

const GENDER_LABEL: Record<SurveyGender, string> = { MALE: "ذكر", FEMALE: "أنثى" };

const AGE_GROUP_LABEL: Record<SurveyAgeGroup, string> = {
  UNDER_18: "أقل من 18",
  FROM_18_25: "18 – 25",
  FROM_26_30: "26 – 30",
  FROM_31_40: "31 – 40",
  FROM_41_50: "41 – 50",
  FROM_51_60: "51 – 60",
  OVER_60: "أكثر من 60",
};

const COMPLAINT_STAGE_LABEL: Record<ComplaintStage, string> = {
  ASSESSMENT: "التقييم",
  MEASUREMENT: "أخذ القياسات",
  TRAINING_REHAB: "التدريب والتأهيل",
  SOCKET_FITTING: "تركيب السوكيت",
  NONE: "لا يوجد",
};

const PODIATRY_SERVICE_LABEL: Record<PodiatryServiceType, string> = {
  ANALYSIS_ONLY: "تحليل فقط",
  ANALYSIS_AND_FITTING: "تحليل وتركيب",
};

type RatingKey =
  | "staffExplanationRating" | "specialistCareRating" | "waitingAreaRating" | "waitingDurationRating"
  | "measurementAccuracyRating" | "movementEaseRating"
  | "medicalRecommendationRating"
  | "exerciseQualityRating" | "mobilityImprovementRating"
  | "overallCompanyRating";

const RATING_LABEL: Record<RatingKey, string> = {
  staffExplanationRating: "وضوح شرح الكادر للخدمة والإجراءات",
  specialistCareRating: "اهتمام الأخصائي ورعايته",
  waitingAreaRating: "راحة ونظافة منطقة الانتظار",
  waitingDurationRating: "مدة الانتظار",
  measurementAccuracyRating: "دقة القياسات",
  movementEaseRating: "سهولة الحركة بالطرف",
  medicalRecommendationRating: "وضوح التوصيات الطبية والاستفادة منها",
  exerciseQualityRating: "جودة التمارين",
  mobilityImprovementRating: "التحسّن في الحركة",
  overallCompanyRating: "التقييم العام للمركز",
};

/** أسئلة مشتركة بين الأقسام، كلها اختيارية. */
const SHARED_RATINGS: RatingKey[] = [
  "staffExplanationRating", "specialistCareRating", "waitingAreaRating", "waitingDurationRating",
];

/** أسئلة كل قسم — تُعرض وتُرسل فقط مع قسمها. */
const DEPARTMENT_RATINGS: Record<SurveyDepartment, RatingKey[]> = {
  PROSTHETICS: ["measurementAccuracyRating", "movementEaseRating"],
  PODIATRY: ["medicalRecommendationRating"],
  PHYSIO: ["exerciseQualityRating", "mobilityImprovementRating"],
};

const DEPARTMENT_BADGE: Record<SurveyDepartment, string> = {
  PROSTHETICS: "bg-indigo-100 text-indigo-800",
  PODIATRY: "bg-amber-100 text-amber-800",
  PHYSIO: "bg-emerald-100 text-emerald-800",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageGroupOf(dateOfBirth?: string | null): SurveyAgeGroup | "" {
  if (!dateOfBirth) return "";
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
  if (age < 18) return "UNDER_18";
  if (age <= 25) return "FROM_18_25";
  if (age <= 30) return "FROM_26_30";
  if (age <= 40) return "FROM_31_40";
  if (age <= 50) return "FROM_41_50";
  if (age <= 60) return "FROM_51_60";
  return "OVER_60";
}

const patientFullName = (p?: Pick<Patient, "firstName" | "lastName"> | null) =>
  p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : "";

function useStaffName() {
  const { data: staffData } = useEmployeesBasicList();
  const staffList: any[] = Array.isArray(staffData)
    ? staffData
    : (staffData as any)?.data?.items ?? (staffData as any)?.items ?? [];
  return (id: string) => {
    const e = staffList.find((x: any) => x.userId === id || x.id === id);
    return e ? `${e.firstNameAr} ${e.lastNameAr}`.trim() : id;
  };
}

// ─── Rating input / display ───────────────────────────────────────────────────

function StarRating({ value, onChange, size = "md" }: { value?: number; onChange?: (v: number) => void; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-6 w-6";
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = !!value && n <= value;
        const star = <Star className={cn(cls, on ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />;
        return onChange ? (
          <button
            key={n}
            type="button"
            aria-label={`${n} من 5`}
            // نقرة ثانية على نفس النجمة تمسح التقييم — للأسئلة الاختيارية.
            onClick={() => onChange(value === n ? 0 : n)}
            className="p-0.5 rounded hover:bg-accent"
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}

// ─── Create dialog ────────────────────────────────────────────────────────────

const emptyForm = () => ({
  department: "" as SurveyDepartment | "",
  customerName: "",
  gender: "" as SurveyGender | "",
  ageGroup: "" as SurveyAgeGroup | "",
  ratings: {} as Partial<Record<RatingKey, number>>,
  complaintStage: "" as ComplaintStage | "",
  podiatryServiceType: "" as PodiatryServiceType | "",
  additionalNotes: "",
});

/**
 * تعبئة استبيان جديد. مع `patient` يُربط بالمريض مباشرة وتُملأ بياناته مسبقاً؛
 * بدونه يظهر بحث لاختيار المريض أولاً.
 */
export function PatientSurveyDialog({
  open, onOpenChange, patient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
}) {
  const [form, setForm] = useState(emptyForm);
  const [picked, setPicked] = useState<Patient | null>(null);
  const [search, setSearch] = useState("");
  const createSurvey = useCreatePatientSurvey();

  const target = patient ?? picked;
  const { data: searchData, isFetching: searching } = useClinicPatients(
    { search: search.trim(), limit: 20 },
    open && !patient && !picked && search.trim().length > 0,
  );

  const prefill = (p: Patient | null) => {
    setForm({
      ...emptyForm(),
      customerName: patientFullName(p),
      gender: p?.gender === "MALE" || p?.gender === "FEMALE" ? p.gender : "",
      ageGroup: ageGroupOf(p?.dateOfBirth),
    });
  };

  useEffect(() => {
    if (open) {
      setPicked(null);
      setSearch("");
      prefill(patient ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patient?.id]);

  const pickPatient = (p: Patient) => {
    setPicked(p);
    prefill(p);
  };

  const setRating = (key: RatingKey, v: number) =>
    setForm((f) => ({ ...f, ratings: { ...f.ratings, [key]: v || undefined } }));

  const dep = form.department || null;
  const requiredRatings: RatingKey[] = dep ? [...DEPARTMENT_RATINGS[dep], "overallCompanyRating"] : [];
  const missing =
    !target || !dep || !form.customerName.trim() || !form.gender || !form.ageGroup
    || requiredRatings.some((k) => !form.ratings[k])
    || (dep === "PODIATRY" && !form.podiatryServiceType);

  const handleSubmit = async () => {
    if (missing || !target || !dep || !form.gender || !form.ageGroup) return;
    const rating = (k: RatingKey) => (form.ratings[k] ? { [k]: form.ratings[k] } : {});
    const dto: CreatePatientSurveyDto = {
      patientId: target.id,
      department: dep,
      customerName: form.customerName.trim(),
      gender: form.gender,
      ageGroup: form.ageGroup,
      overallCompanyRating: form.ratings.overallCompanyRating!,
      ...SHARED_RATINGS.reduce((acc, k) => ({ ...acc, ...rating(k) }), {}),
      // حقول القسم المختار فقط — حقول الأقسام الأخرى لا تُرسل.
      ...DEPARTMENT_RATINGS[dep].reduce((acc, k) => ({ ...acc, ...rating(k) }), {}),
      ...(dep === "PROSTHETICS" && form.complaintStage ? { complaintStage: form.complaintStage } : {}),
      ...(dep === "PODIATRY" && form.podiatryServiceType ? { podiatryServiceType: form.podiatryServiceType } : {}),
      ...(form.additionalNotes.trim() ? { additionalNotes: form.additionalNotes.trim() } : {}),
    };
    await createSurvey.mutateAsync(dto);
    onOpenChange(false);
  };

  const ratingRow = (key: RatingKey, required: boolean) => (
    <div key={key} className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b last:border-0">
      <Label className="font-normal">
        {RATING_LABEL[key]}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <StarRating value={form.ratings[key]} onChange={(v) => setRating(key, v)} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!createSurvey.isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>استبيان تقييم رضا العملاء</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* المريض */}
          {!patient && (
            <div className="space-y-1.5">
              <Label>المريض <span className="text-destructive">*</span></Label>
              {picked ? (
                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{patientFullName(picked)} <span className="text-muted-foreground">({picked.patientNumber})</span></span>
                  <Button variant="ghost" size="sm" onClick={() => { setPicked(null); prefill(null); }}>تغيير</Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم المريض أو رقمه..." />
                  {search.trim() && (
                    <div className="max-h-48 overflow-y-auto rounded-md border">
                      {searching ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">جارِ البحث...</p>
                      ) : (searchData?.items ?? []).length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">لا توجد نتائج</p>
                      ) : (
                        (searchData?.items ?? []).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => pickPatient(p)}
                            className="flex w-full justify-between px-3 py-2 text-sm hover:bg-accent text-start"
                          >
                            <span>{patientFullName(p)}</span>
                            <span className="text-muted-foreground">{p.patientNumber}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* القسم أولاً — يحدد أي أسئلة تظهر */}
          <div className="space-y-1.5">
            <Label>القسم الذي تلقيت فيه الخدمة <span className="text-destructive">*</span></Label>
            <Select
              value={form.department}
              onValueChange={(v) => setForm((f) => ({
                ...f,
                department: v as SurveyDepartment,
                // أسئلة القسم السابق لا تنتقل للقسم الجديد.
                ratings: Object.fromEntries(
                  Object.entries(f.ratings).filter(([k]) => SHARED_RATINGS.includes(k as RatingKey) || k === "overallCompanyRating"),
                ),
                complaintStage: "",
                podiatryServiceType: "",
              }))}
            >
              <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
              <SelectContent>
                {(Object.keys(SURVEY_DEPARTMENT_LABEL) as SurveyDepartment[]).map((d) => (
                  <SelectItem key={d} value={d}>{SURVEY_DEPARTMENT_LABEL[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {dep && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 sm:col-span-3">
                  <Label>اسم العميل الثلاثي <span className="text-destructive">*</span></Label>
                  <Input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>الجنس <span className="text-destructive">*</span></Label>
                  <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v as SurveyGender }))}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(GENDER_LABEL) as SurveyGender[]).map((g) => (
                        <SelectItem key={g} value={g}>{GENDER_LABEL[g]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>الفئة العمرية <span className="text-destructive">*</span></Label>
                  <Select value={form.ageGroup} onValueChange={(v) => setForm((f) => ({ ...f, ageGroup: v as SurveyAgeGroup }))}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(AGE_GROUP_LABEL) as SurveyAgeGroup[]).map((a) => (
                        <SelectItem key={a} value={a}>{AGE_GROUP_LABEL[a]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {dep === "PODIATRY" && (
                <div className="space-y-1.5">
                  <Label>نوع الخدمة <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.podiatryServiceType}
                    onValueChange={(v) => setForm((f) => ({ ...f, podiatryServiceType: v as PodiatryServiceType }))}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PODIATRY_SERVICE_LABEL) as PodiatryServiceType[]).map((s) => (
                        <SelectItem key={s} value={s}>{PODIATRY_SERVICE_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="rounded-md border px-3 py-1">
                {SHARED_RATINGS.map((k) => ratingRow(k, false))}
                {DEPARTMENT_RATINGS[dep].map((k) => ratingRow(k, true))}
              </div>

              {dep === "PROSTHETICS" && (
                <div className="space-y-1.5">
                  <Label>هل واجهت مشكلة في إحدى المراحل؟</Label>
                  <Select
                    value={form.complaintStage}
                    onValueChange={(v) => setForm((f) => ({ ...f, complaintStage: v as ComplaintStage }))}
                  >
                    <SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(COMPLAINT_STAGE_LABEL) as ComplaintStage[]).map((s) => (
                        <SelectItem key={s} value={s}>{COMPLAINT_STAGE_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="rounded-md border px-3 py-1 bg-muted/30">
                {ratingRow("overallCompanyRating", true)}
              </div>

              <div className="space-y-1.5">
                <Label>ملاحظات إضافية (اختياري)</Label>
                <Textarea
                  rows={3}
                  value={form.additionalNotes}
                  onChange={(e) => setForm((f) => ({ ...f, additionalNotes: e.target.value }))}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createSurvey.isPending}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={missing || createSurvey.isPending} className="gap-1.5">
            {createSurvey.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ الاستبيان
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Details dialog ───────────────────────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

export function PatientSurveyDetailsDialog({ surveyId, onClose }: { surveyId: string | null; onClose: () => void }) {
  const { data: s, isLoading } = usePatientSurvey(surveyId);
  const staffName = useStaffName();

  const answered = (keys: RatingKey[]) => keys.filter((k) => s?.[k]);

  return (
    <Dialog open={!!surveyId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>تفاصيل الاستبيان</DialogTitle>
        </DialogHeader>
        {isLoading || !s ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : (
          <div className="space-y-4">
            <div>
              <DetailRow label="القسم">{SURVEY_DEPARTMENT_LABEL[s.department] ?? s.department}</DetailRow>
              <DetailRow label="اسم العميل">{s.customerName}</DetailRow>
              <DetailRow label="الجنس">{GENDER_LABEL[s.gender] ?? s.gender}</DetailRow>
              <DetailRow label="الفئة العمرية">{AGE_GROUP_LABEL[s.ageGroup] ?? s.ageGroup}</DetailRow>
              {s.podiatryServiceType && (
                <DetailRow label="نوع الخدمة">{PODIATRY_SERVICE_LABEL[s.podiatryServiceType] ?? s.podiatryServiceType}</DetailRow>
              )}
              <DetailRow label="المعالجون المسؤولون">
                {s.practitionerIds?.length ? s.practitionerIds.map(staffName).join("، ") : "—"}
              </DetailRow>
              <DetailRow label="تاريخ التعبئة">{new Date(s.createdAt).toLocaleString("en-GB", { hour12: true })}</DetailRow>
            </div>
            <div className="rounded-md border px-3 py-1">
              {answered([...SHARED_RATINGS, ...DEPARTMENT_RATINGS[s.department] ?? []]).map((k) => (
                <DetailRow key={k} label={RATING_LABEL[k]}><StarRating value={s[k]} size="sm" /></DetailRow>
              ))}
              {s.complaintStage && (
                <DetailRow label="مرحلة الشكوى">{COMPLAINT_STAGE_LABEL[s.complaintStage] ?? s.complaintStage}</DetailRow>
              )}
              <DetailRow label={RATING_LABEL.overallCompanyRating}>
                <StarRating value={s.overallCompanyRating} size="sm" />
              </DetailRow>
            </div>
            {s.additionalNotes && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ملاحظات إضافية</p>
                <p className="text-sm whitespace-pre-wrap">{s.additionalNotes}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────

/** جدول الاستبيانات مع صفحات — الأحدث أولاً كما يرتبها الباك. */
export function PatientSurveysTable({ params }: { params: Omit<PatientSurveyListParams, "page" | "limit"> }) {
  // الصفحة محفوظة مع الفلتر الذي اختيرت له، ففلتر جديد يرجع للصفحة الأولى.
  const paramsKey = JSON.stringify(params);
  const [paging, setPaging] = useState({ key: paramsKey, page: 1 });
  const page = paging.key === paramsKey ? paging.page : 1;
  const setPage = (fn: (p: number) => number) => setPaging({ key: paramsKey, page: fn(page) });
  const [openId, setOpenId] = useState<string | null>(null);
  const staffName = useStaffName();
  const { data, isLoading, isFetching } = usePatientSurveys({ ...params, page, limit: 20 });
  const items: PatientSurvey[] = data?.items ?? [];

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">لا توجد استبيانات</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>اسم العميل</TableHead>
              <TableHead>القسم</TableHead>
              <TableHead>التقييم العام</TableHead>
              <TableHead>المعالجون</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs whitespace-nowrap">{s.createdAt?.slice(0, 10)}</TableCell>
                <TableCell className="font-medium">{s.customerName}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={DEPARTMENT_BADGE[s.department] ?? ""}>
                    {SURVEY_DEPARTMENT_LABEL[s.department] ?? s.department}
                  </Badge>
                </TableCell>
                <TableCell><StarRating value={s.overallCompanyRating} size="sm" /></TableCell>
                <TableCell className="max-w-xs">
                  {s.practitionerIds?.length ? s.practitionerIds.map(staffName).join("، ") : "—"}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => setOpenId(s.id)}>
                    <Eye className="h-4 w-4" /> عرض
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {(data?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            صفحة {page} من {data?.totalPages} — {data?.total} استبيان
            {isFetching && " · جارِ التحديث..."}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>السابق</Button>
            <Button variant="outline" size="sm" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>التالي</Button>
          </div>
        </div>
      )}
      <PatientSurveyDetailsDialog surveyId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
