"use client";

import { useEffect, useState } from "react";
import { Check, Download, Eye, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useClinicPatients } from "@/lib/hooks/use-clinic-patients";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { useCreatePatientSurvey, usePatientSurvey, usePatientSurveys } from "@/lib/hooks/use-patient-surveys";
import type { Patient } from "@/lib/api/clinic-patients";
import { patientSurveysApi } from "@/lib/api/patient-surveys";
import type { SurveyPdfData } from "@/components/clinic/patient-survey-pdf";
import type {
  ComplaintStage, CreatePatientSurveyDto, NoFittingReason, PatientSurvey, PatientSurveyListParams,
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

/** نص الخيارات كما في استمارة الورق. */
const COMPLAINT_STAGE_LABEL: Record<ComplaintStage, string> = {
  ASSESSMENT: "المعاينة",
  MEASUREMENT: "أخذ القياس",
  TRAINING_REHAB: "التدريب والتأهيل",
  SOCKET_FITTING: "تركيب الحاضنة التجريبية / النهائية",
  NONE: "لا يوجد",
};

const COMPLAINT_STAGE_QUESTION =
  "في حال وجود أي شكوى أو ملاحظة أو سوء تعامل خلال رحلة علاجك في قسم الأطراف الصناعية، فيرجى التوضيح بأي مرحلة كانت بالتحديد؟";

const PODIATRY_SERVICE_LABEL: Record<PodiatryServiceType, string> = {
  ANALYSIS_ONLY: "تحليل فقط",
  ANALYSIS_AND_FITTING: "تحليل وتركيب",
};

/** «تحليل فقط» — سبب عدم التركيب، بنص استمارة الورق. */
const NO_FITTING_REASON_LABEL: Record<NoFittingReason, string> = {
  TIMING: "التوقيت غير مناسب",
  PRICE: "ثمن الضبان غير مناسب",
  OTHER: "أخرى",
};

const NO_FITTING_REASON_QUESTION = "ما سبب عدم تركيبك للضبان";

type RatingKey =
  | "staffExplanationRating" | "specialistCareRating" | "waitingAreaRating" | "waitingDurationRating"
  | "measurementAccuracyRating" | "movementEaseRating"
  | "medicalRecommendationRating" | "insoleComfortRating"
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
  insoleComfortRating: "ملاءمة الضبان لراحة القدم",
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
  PODIATRY: ["medicalRecommendationRating", "insoleComfortRating"],
  PHYSIO: ["exerciseQualityRating", "mobilityImprovementRating"],
};

/**
 * أقسام تطابق استمارة الورق (SurveyMars) حرفياً: نص الأسئلة وترتيبها، وكلها
 * إجبارية. الحقول نفسها المشتركة مع باقي الأقسام، بنص مختلف فقط.
 */
interface PaperForm {
  /** أسئلة التقييم بترتيب الاستمارة، عدا التقييم العام الذي يأتي آخراً دائماً. */
  order: RatingKey[];
  /** طب الأقدام: لكل نوع خدمة استمارة مختلفة، فتحل محل `order`. */
  orderByService?: Record<PodiatryServiceType, RatingKey[]>;
  labels: Partial<Record<RatingKey, string>>;
  /** سطر توضيح تحت السؤال، كما في الاستمارة. */
  notes?: Partial<Record<RatingKey, string>>;
}

/** أسئلة نصها واحد في كل استمارات الورق. */
const PAPER_COMMON_LABEL: Partial<Record<RatingKey, string>> = {
  staffExplanationRating: "الشرح الكافي والتعامل الجيد من قبل الفنيين",
  specialistCareRating: "مقدار شعورك باهتمام الاخصائيين اتجاهك",
  waitingAreaRating: "تقييمك لراحة مكان الانتظار وطريقة الاستقبال",
  waitingDurationRating: "متوسط مدة الانتظار قبل الدخول الى الجلسات بشكل عام",
  overallCompanyRating: "تقييمك العام للشركة وكوادر العمل",
};

const PAPER_FORM: Partial<Record<SurveyDepartment, PaperForm>> = {
  // سؤال مرحلة الشكوى (11) يأتي بعد هذه الأسئلة وقبل التقييم العام.
  PROSTHETICS: {
    order: [
      "staffExplanationRating", "measurementAccuracyRating", "movementEaseRating",
      "specialistCareRating", "waitingAreaRating", "waitingDurationRating",
    ],
    labels: {
      ...PAPER_COMMON_LABEL,
      measurementAccuracyRating: "دقة القياس والتركيب",
      movementEaseRating: "سهولة الحركة بالطرف الصناعي",
    },
    notes: { measurementAccuracyRating: "المؤشر هو عدم وجود ألم في الجذمور" },
  },
  // «تحليل فقط» يبدأ بسؤال سبب عدم التركيب قبل هذه الأسئلة.
  PODIATRY: {
    order: [
      "medicalRecommendationRating", "staffExplanationRating", "specialistCareRating",
      "waitingAreaRating", "waitingDurationRating",
    ],
    orderByService: {
      ANALYSIS_ONLY: [
        "medicalRecommendationRating", "staffExplanationRating", "specialistCareRating",
        "waitingAreaRating", "waitingDurationRating",
      ],
      ANALYSIS_AND_FITTING: [
        "medicalRecommendationRating", "insoleComfortRating", "staffExplanationRating",
        "specialistCareRating", "waitingAreaRating", "waitingDurationRating",
      ],
    },
    labels: {
      ...PAPER_COMMON_LABEL,
      medicalRecommendationRating: "وضوح التوصية بالضبانات الطبية",
      insoleComfortRating: "ملاءمة الضبان لراحة قدمك",
    },
  },
  PHYSIO: {
    order: [
      "staffExplanationRating", "exerciseQualityRating", "mobilityImprovementRating",
      "specialistCareRating", "waitingAreaRating", "waitingDurationRating",
    ],
    labels: {
      ...PAPER_COMMON_LABEL,
      exerciseQualityRating: "جودة التمارين والإرشادات",
      mobilityImprovementRating: "مدى تحسن حركتك ومقدار شعورك بالراحة بعد اتمام جميع جلساتك",
    },
  },
};

/** معنى طرفي السلّم كما في الاستمارة: [5، 1]. */
const PAPER_HINT: Partial<Record<RatingKey, [string, string]>> = {
  waitingDurationRating: ["مدة انتظار بسيطة جداً ومثالية", "مدة انتظار طويلة جداً تتجاوز 60 دقيقة"],
  overallCompanyRating: [
    "لقد قامت الشركة وفريقها بتلبية توقعاتك التي بنيتها قبل البدء بتجربتك معنا بشكل تام",
    "لم تكن الشركة وفريق عملها ملبية لتوقعاتي نهائياً",
  ],
};

const PAPER_NOTES_LABEL = "هل يوجد أي إضافات أخرى أو توصيات تريد أن تقدمها لنا؟";

const paperForm = (dep: SurveyDepartment | null | undefined) => (dep ? PAPER_FORM[dep] : undefined);

/** أسئلة التقييم المعروضة للقسم بترتيبها، عدا التقييم العام. */
const ratingKeysFor = (dep: SurveyDepartment, service?: PodiatryServiceType | "" | null): RatingKey[] => {
  const pf = paperForm(dep);
  if (!pf) return [...SHARED_RATINGS, ...DEPARTMENT_RATINGS[dep]];
  return (service && pf.orderByService?.[service]) || pf.order;
};

const isRequiredRating = (dep: SurveyDepartment, key: RatingKey) =>
  key === "overallCompanyRating" || !!paperForm(dep) || DEPARTMENT_RATINGS[dep].includes(key);

const ratingLabel = (dep: SurveyDepartment | null | undefined, key: RatingKey) =>
  paperForm(dep)?.labels[key] ?? RATING_LABEL[key];

const ratingHint = (dep: SurveyDepartment | null | undefined, key: RatingKey) =>
  paperForm(dep) ? PAPER_HINT[key] : undefined;

const notesLabel = (dep: SurveyDepartment | null | undefined) =>
  paperForm(dep) ? PAPER_NOTES_LABEL : "ملاحظات إضافية";

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

// ─── Form building blocks ─────────────────────────────────────────────────────

function SurveySection({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
          {n}
        </span>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}

/** A short list of options as buttons — one tap instead of opening a dropdown. */
function ChoiceChips({
  options, value, onChange, className,
}: {
  options: Record<string, string>;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("grid gap-2", className)}>
      {Object.entries(options).map(([k, label]) => {
        const on = value === k;
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(k)}
            className={cn(
              "rounded-md border px-3 py-2 text-sm text-center transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on ? "border-primary bg-primary/10 text-primary font-medium" : "hover:bg-accent",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 1 to 5 as on the paper form: 1 (very dissatisfied) on the right, 5 on the
 * left. Tapping the chosen value again clears it, for the optional questions.
 */
function RatingScale({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div role="radiogroup" className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${n} من 5`}
              onClick={() => onChange(on ? 0 : n)}
              className={cn(
                "h-10 rounded-md border text-sm font-semibold tabular-nums transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>غير راضٍ جداً</span>
        <span>راضٍ جداً</span>
      </div>
    </div>
  );
}

function QuestionCard({
  n, label, required, optional, answered, note, hint, highlight, children,
}: {
  n: number;
  label: string;
  required?: boolean;
  optional?: boolean;
  answered: boolean;
  /** سطر توضيح تحت السؤال. */
  note?: string;
  /** معنى طرفي السلّم: [5، 1]. */
  hint?: [string, string];
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3 transition-colors",
        highlight && "bg-muted/40",
        answered && "border-primary/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
            answered ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {answered ? <Check className="h-3.5 w-3.5" /> : n}
        </span>
        <div className="flex-1 space-y-1 min-w-0">
          <p className="text-sm font-medium leading-relaxed">
            {label}
            {required && <span className="text-destructive"> *</span>}
            {optional && <span className="text-xs font-normal text-muted-foreground"> (اختياري)</span>}
          </p>
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
          {hint && (
            <div className="text-xs text-emerald-700 dark:text-emerald-400 space-y-0.5">
              <p>5 = {hint[0]}</p>
              <p>1 = {hint[1]}</p>
            </div>
          )}
        </div>
      </div>
      {children}
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
  noFittingReason: "" as NoFittingReason | "",
  noFittingReasonOther: "",
  additionalNotes: "",
});

/**
 * تعبئة استبيان جديد. مع `patient` يُربط بالمريض مباشرة وتُملأ بياناته مسبقاً؛
 * بدونه يظهر بحث لاختيار المريض أولاً.
 */
export function PatientSurveyDialog({
  open, onOpenChange, patient, department,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
  /** Preselected department — e.g. from a PATIENT_SURVEY_REQUIRED notification. */
  department?: SurveyDepartment;
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
      department: department ?? "",
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
  }, [open, patient?.id, department]);

  const pickPatient = (p: Patient) => {
    setPicked(p);
    prefill(p);
  };

  const setRating = (key: RatingKey, v: number) =>
    setForm((f) => ({ ...f, ratings: { ...f.ratings, [key]: v || undefined } }));

  const dep = form.department || null;
  const service = dep === "PODIATRY" ? form.podiatryServiceType : "";
  const asksNoFittingReason = service === "ANALYSIS_ONLY";
  // Podiatry's questions depend on the service type, so they wait until it is chosen.
  const questionsReady = !!dep && (dep !== "PODIATRY" || !!service);
  const questionKeys = dep ? ratingKeysFor(dep, service) : [];
  const requiredRatings: RatingKey[] = dep
    ? [...questionKeys, "overallCompanyRating" as RatingKey].filter((k) => isRequiredRating(dep, k))
    : [];
  const missing =
    !target || !dep || !form.customerName.trim() || !form.gender || !form.ageGroup
    || requiredRatings.some((k) => !form.ratings[k])
    || (dep === "PODIATRY" && !form.podiatryServiceType)
    || (asksNoFittingReason && !form.noFittingReason)
    || (dep === "PROSTHETICS" && !form.complaintStage);

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
      // and of those, only the ones this service type asks (insole comfort is fitting-only).
      ...DEPARTMENT_RATINGS[dep].filter((k) => questionKeys.includes(k)).reduce((acc, k) => ({ ...acc, ...rating(k) }), {}),
      ...(dep === "PROSTHETICS" && form.complaintStage ? { complaintStage: form.complaintStage } : {}),
      ...(dep === "PODIATRY" && form.podiatryServiceType ? { podiatryServiceType: form.podiatryServiceType } : {}),
      ...(asksNoFittingReason && form.noFittingReason ? { noFittingReason: form.noFittingReason } : {}),
      ...(asksNoFittingReason && form.noFittingReason === "OTHER" && form.noFittingReasonOther.trim()
        ? { noFittingReasonOther: form.noFittingReasonOther.trim() }
        : {}),
      ...(form.additionalNotes.trim() ? { additionalNotes: form.additionalNotes.trim() } : {}),
    };
    await createSurvey.mutateAsync(dto);
    onOpenChange(false);
  };

  // Questions are numbered in the order they appear, like the paper form.
  const firstRatingNo = asksNoFittingReason ? 2 : 1;
  const complaintNo = firstRatingNo + questionKeys.length;
  const overallNo = complaintNo + (dep === "PROSTHETICS" ? 1 : 0);
  const notesNo = overallNo + 1;

  const choiceQuestions = [
    ...(asksNoFittingReason ? [!!form.noFittingReason] : []),
    ...(dep === "PROSTHETICS" ? [!!form.complaintStage] : []),
  ];
  const requiredQuestions = requiredRatings.length + choiceQuestions.length;
  const answeredQuestions =
    requiredRatings.filter((k) => form.ratings[k]).length + choiceQuestions.filter(Boolean).length;

  const ratingCard = (key: RatingKey, n: number, highlight = false) => (
    <QuestionCard
      key={key}
      n={n}
      label={ratingLabel(dep, key)}
      required={!!dep && isRequiredRating(dep, key)}
      answered={!!form.ratings[key]}
      note={paperForm(dep)?.notes?.[key]}
      hint={ratingHint(dep, key)}
      highlight={highlight}
    >
      <RatingScale value={form.ratings[key]} onChange={(v) => setRating(key, v)} />
    </QuestionCard>
  );

  const resetForDepartment = (d: SurveyDepartment) => setForm((f) => ({
    ...f,
    department: d,
    // أسئلة القسم السابق لا تنتقل للقسم الجديد.
    ratings: Object.fromEntries(
      Object.entries(f.ratings).filter(([k]) => SHARED_RATINGS.includes(k as RatingKey) || k === "overallCompanyRating"),
    ),
    complaintStage: "",
    podiatryServiceType: "",
    noFittingReason: "",
    noFittingReasonOther: "",
  }));

  // Each service type has its own form, so the answers only one of them asks are dropped.
  const changeService = (s: PodiatryServiceType) => setForm((f) => {
    if (s === f.podiatryServiceType) return f;
    const ratings = { ...f.ratings };
    delete ratings.insoleComfortRating;
    return { ...f, podiatryServiceType: s, ratings, noFittingReason: "", noFittingReasonOther: "" };
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!createSurvey.isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>استبيان تقييم رضا العملاء</DialogTitle>
          <p className="text-sm text-muted-foreground">
            قيّم كل سؤال من 1 (غير راضٍ جداً) إلى 5 (راضٍ جداً).
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* ── 1. بيانات العميل ── */}
          <SurveySection n={1} title="بيانات العميل">
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
          <Field label="القسم الذي تلقيت فيه الخدمة" required>
            <ChoiceChips
              options={SURVEY_DEPARTMENT_LABEL}
              value={form.department}
              onChange={(d) => resetForDepartment(d as SurveyDepartment)}
              className="grid-cols-1 sm:grid-cols-3"
            />
          </Field>

          {dep && (
            <>
              <Field label="اسم العميل الثلاثي" required>
                <Input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
              </Field>
              <Field label="الجنس" required>
                <ChoiceChips
                  options={GENDER_LABEL}
                  value={form.gender}
                  onChange={(g) => setForm((f) => ({ ...f, gender: g as SurveyGender }))}
                  className="grid-cols-2 sm:max-w-xs"
                />
              </Field>
              <Field label="الفئة العمرية" required>
                <ChoiceChips
                  options={AGE_GROUP_LABEL}
                  value={form.ageGroup}
                  onChange={(a) => setForm((f) => ({ ...f, ageGroup: a as SurveyAgeGroup }))}
                  className="grid-cols-3 sm:grid-cols-4"
                />
              </Field>
              {dep === "PODIATRY" && (
                <Field label="نوع الخدمة" required>
                  <ChoiceChips
                    options={PODIATRY_SERVICE_LABEL}
                    value={form.podiatryServiceType}
                    onChange={(s) => changeService(s as PodiatryServiceType)}
                    className="grid-cols-2 sm:max-w-sm"
                  />
                </Field>
              )}
            </>
          )}
          </SurveySection>

          {dep && questionsReady && (
            <>
              {/* ── 2. تقييم الخدمة ── */}
              <SurveySection
                n={2}
                title={`تقييم الخدمة — ${SURVEY_DEPARTMENT_LABEL[dep]}${service ? ` (${PODIATRY_SERVICE_LABEL[service]})` : ""}`}
              >
                {asksNoFittingReason && (
                  <QuestionCard
                    n={1}
                    label={NO_FITTING_REASON_QUESTION}
                    required
                    answered={!!form.noFittingReason}
                  >
                    <ChoiceChips
                      options={NO_FITTING_REASON_LABEL}
                      value={form.noFittingReason}
                      onChange={(r) => setForm((f) => ({ ...f, noFittingReason: r as NoFittingReason }))}
                      className="grid-cols-1 sm:grid-cols-3"
                    />
                    {form.noFittingReason === "OTHER" && (
                      <Textarea
                        rows={2}
                        className="mt-3"
                        value={form.noFittingReasonOther}
                        placeholder="وضّح السبب (اختياري)"
                        onChange={(e) => setForm((f) => ({ ...f, noFittingReasonOther: e.target.value }))}
                      />
                    )}
                  </QuestionCard>
                )}

                {questionKeys.map((k, i) => ratingCard(k, firstRatingNo + i))}

                {dep === "PROSTHETICS" && (
                  <QuestionCard
                    n={complaintNo}
                    label={COMPLAINT_STAGE_QUESTION}
                    required
                    answered={!!form.complaintStage}
                  >
                    <ChoiceChips
                      options={COMPLAINT_STAGE_LABEL}
                      value={form.complaintStage}
                      onChange={(s) => setForm((f) => ({ ...f, complaintStage: s as ComplaintStage }))}
                      className="grid-cols-1 sm:grid-cols-2"
                    />
                  </QuestionCard>
                )}

                {ratingCard("overallCompanyRating", overallNo, true)}
              </SurveySection>

              {/* ── 3. ملاحظات ── */}
              <SurveySection n={3} title="ملاحظات">
                <QuestionCard n={notesNo} label={notesLabel(dep)} answered={!!form.additionalNotes.trim()} optional>
                  <Textarea
                    rows={3}
                    value={form.additionalNotes}
                    placeholder="اختياري"
                    onChange={(e) => setForm((f) => ({ ...f, additionalNotes: e.target.value }))}
                  />
                </QuestionCard>
              </SurveySection>
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30 sm:justify-between items-center gap-3">
          <p className="text-xs text-muted-foreground order-last sm:order-first">
            {!dep
              ? "اختر القسم لعرض الأسئلة"
              : !questionsReady
                ? "اختر نوع الخدمة لعرض الأسئلة"
                : `تمت الإجابة على ${answeredQuestions} من ${requiredQuestions} أسئلة إجبارية`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createSurvey.isPending}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={missing || createSurvey.isPending} className="gap-1.5">
              {createSurvey.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ الاستبيان
            </Button>
          </div>
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
              {s.noFittingReason && (
                <DetailRow label={NO_FITTING_REASON_QUESTION}>
                  {NO_FITTING_REASON_LABEL[s.noFittingReason] ?? s.noFittingReason}
                  {s.noFittingReasonOther && ` — ${s.noFittingReasonOther}`}
                </DetailRow>
              )}
              {answered(
                DEPARTMENT_RATINGS[s.department] ? ratingKeysFor(s.department, s.podiatryServiceType) : SHARED_RATINGS,
              ).map((k) => (
                <DetailRow key={k} label={ratingLabel(s.department, k)}><StarRating value={s[k]} size="sm" /></DetailRow>
              ))}
              {s.complaintStage && (
                <DetailRow label="مرحلة الشكوى">{COMPLAINT_STAGE_LABEL[s.complaintStage] ?? s.complaintStage}</DetailRow>
              )}
              <DetailRow label={ratingLabel(s.department, "overallCompanyRating")}>
                <StarRating value={s.overallCompanyRating} size="sm" />
              </DetailRow>
            </div>
            {s.additionalNotes && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {notesLabel(s.department)}
                </p>
                <p className="text-sm whitespace-pre-wrap">{s.additionalNotes}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

/** One survey as the PDF sheet prints it — the same questions, wording and order as the form. */
function surveyPdfData(s: PatientSurvey, staffName: (id: string) => string): SurveyPdfData {
  const dep = s.department;
  const keys = DEPARTMENT_RATINGS[dep] ? ratingKeysFor(dep, s.podiatryServiceType) : SHARED_RATINGS;
  const rating = (k: RatingKey) => ({
    label: ratingLabel(dep, k),
    value: s[k] ?? null,
    hint: ratingHint(dep, k),
    note: paperForm(dep)?.notes?.[k],
  });
  return {
    info: [
      { label: "القسم", value: SURVEY_DEPARTMENT_LABEL[dep] ?? dep },
      { label: "اسم العميل", value: s.customerName },
      { label: "رقم المريض", value: s.patient?.patientNumber },
      { label: "الجنس", value: GENDER_LABEL[s.gender] ?? s.gender },
      { label: "الفئة العمرية", value: AGE_GROUP_LABEL[s.ageGroup] ?? s.ageGroup },
      ...(s.podiatryServiceType
        ? [{ label: "نوع الخدمة", value: PODIATRY_SERVICE_LABEL[s.podiatryServiceType] ?? s.podiatryServiceType }]
        : []),
      { label: "المعالجون المسؤولون", value: s.practitionerIds?.length ? s.practitionerIds.map(staffName).join("، ") : "—" },
      { label: "تاريخ التعبئة", value: new Date(s.createdAt).toLocaleDateString("en-GB") },
    ],
    ratings: keys.map(rating),
    choices: [
      ...(s.noFittingReason
        ? [{
            label: NO_FITTING_REASON_QUESTION,
            value: (NO_FITTING_REASON_LABEL[s.noFittingReason] ?? s.noFittingReason)
              + (s.noFittingReasonOther ? ` — ${s.noFittingReasonOther}` : ""),
          }]
        : []),
      ...(s.complaintStage
        ? [{ label: COMPLAINT_STAGE_QUESTION, value: COMPLAINT_STAGE_LABEL[s.complaintStage] ?? s.complaintStage }]
        : []),
    ],
    overall: rating("overallCompanyRating"),
    notesLabel: notesLabel(dep),
    notes: s.additionalNotes,
    fileTag: `${s.customerName}-${s.createdAt?.slice(0, 10) ?? ""}`,
  };
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
  const [exportingId, setExportingId] = useState<string | null>(null);

  // The full record is fetched first: a list row may not carry every answer.
  const exportPdf = async (id: string) => {
    if (exportingId) return;
    setExportingId(id);
    try {
      const [survey, { downloadPatientSurveyPdf }] = await Promise.all([
        patientSurveysApi.get(id),
        import("@/components/clinic/patient-survey-pdf"),
      ]);
      await downloadPatientSurveyPdf(surveyPdfData(survey, staffName));
    } catch {
      toast.error("تعذّر تصدير الاستبيان");
    } finally {
      setExportingId(null);
    }
  };
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
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => setOpenId(s.id)}>
                      <Eye className="h-4 w-4" /> عرض
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="gap-1"
                      disabled={!!exportingId}
                      onClick={() => exportPdf(s.id)}
                    >
                      {exportingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      PDF
                    </Button>
                  </div>
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
          <div className="flex gap-2 rtl:flex-row-reverse">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>السابق</Button>
            <Button variant="outline" size="sm" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>التالي</Button>
          </div>
        </div>
      )}
      <PatientSurveyDetailsDialog surveyId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
