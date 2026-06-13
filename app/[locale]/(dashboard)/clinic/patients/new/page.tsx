"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronRight, ChevronLeft, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useCreateClinicPatient, useCheckDuplicate } from "@/lib/hooks/use-clinic-patients";
import { useClinicCities } from "@/lib/hooks/use-clinic-cities";
import { clinicPatientsApi } from "@/lib/api/clinic-patients";
import { CreatePatientDto, IdentityType, ConsentOption } from "@/lib/api/clinic-patients";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  firstName:    z.string().min(2),
  lastName:     z.string().min(2),
  identityType: z.enum(["NATIONAL_ID", "PASSPORT", "UNHCR", "OTHER"]),
  idNumber:     z.string().min(5),
  dateOfBirth:  z.string().min(1),
  gender:       z.enum(["MALE", "FEMALE"]),
  occupation:   z.string().optional(),
});

const step2Schema = z.object({
  phone:    z.string().min(7),
  whatsapp: z.string().optional(),
  email:    z.string().email().optional().or(z.literal("")),
  cityId:   z.string().optional(),
  addressDetails: z.string().optional(),
});

const step3Schema = z.object({
  heightCm:        z.union([z.coerce.number().min(50).max(250), z.literal("")]).optional(),
  weightKg:        z.union([z.coerce.number().min(10).max(300), z.literal("")]).optional(),
  educationLevel:  z.string().optional(),
  maritalStatus:   z.string().optional(),
  livingCondition: z.string().optional(),
  financialStatus: z.string().optional(),
  receivesAid:     z.string().optional(),
  referralSource:  z.enum(["SELF","RELATIVES","SOCIAL_MEDIA","MEDICAL_REFERRAL","OTHER",""]).optional(),
  referralDetails: z.string().optional(),
});

const step4Schema = z.object({
  documentConsent: z.enum(["FULL", "ANONYMOUS", "NONE"]).optional(),
  mediaConsent:    z.boolean().optional(),
  notes:           z.string().optional(),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type Step3 = z.infer<typeof step3Schema>;
type Step4 = z.infer<typeof step4Schema>;

const IDENTITY_TYPE_VALUES  = ["NATIONAL_ID", "PASSPORT", "UNHCR", "OTHER"] as const;
const EDUCATION_VALUES      = ["ILLITERATE", "PRIMARY", "SECONDARY", "HIGH_SCHOOL", "UNIVERSITY", "POSTGRADUATE"] as const;
const MARITAL_VALUES        = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"] as const;
const LIVING_VALUES         = ["WITH_FAMILY", "INDEPENDENT", "SHELTER_CAMP", "OTHER"] as const;
const FINANCIAL_VALUES      = ["LOW", "MODERATE", "GOOD", "NOT_WORKING", "RETIRED"] as const;
const CONSENT_VALUES        = ["FULL", "ANONYMOUS", "NONE"] as const;

const EDUCATION_LABELS: Record<string, string> = {
  ILLITERATE:   "أمي",
  PRIMARY:      "ابتدائي",
  SECONDARY:    "إعدادي",
  HIGH_SCHOOL:  "ثانوي",
  UNIVERSITY:   "جامعي",
  POSTGRADUATE: "دراسات عليا",
};
const LIVING_LABELS: Record<string, string> = {
  WITH_FAMILY:  "مع العائلة",
  INDEPENDENT:  "مستقل",
  SHELTER_CAMP: "مخيم",
  OTHER:        "أخرى",
};
const FINANCIAL_LABELS: Record<string, string> = {
  LOW:         "منخفض",
  MODERATE:    "متوسط",
  GOOD:        "جيد",
  NOT_WORKING: "لا يعمل",
  RETIRED:     "متقاعد",
};
const MARITAL_LABELS: Record<string, string> = {
  SINGLE:   "أعزب",
  MARRIED:  "متزوج",
  DIVORCED: "مطلق",
  WIDOWED:  "أرمل",
};
const IDENTITY_LABELS: Record<string, string> = {
  NATIONAL_ID: "هوية وطنية",
  PASSPORT:    "جواز سفر",
  UNHCR:       "بطاقة UNHCR",
  OTHER:       "أخرى",
};
const CONSENT_LABELS: Record<string, string> = {
  FULL:      "موافقة كاملة",
  ANONYMOUS: "مجهول الهوية",
  NONE:      "رفض",
};
const REFERRAL_VALUES = ["SELF", "RELATIVES", "SOCIAL_MEDIA", "MEDICAL_REFERRAL", "OTHER"] as const;
const REFERRAL_LABELS: Record<string, string> = {
  SELF:             "نفسه",
  RELATIVES:        "أقارب",
  SOCIAL_MEDIA:     "وسائل التواصل الاجتماعي",
  MEDICAL_REFERRAL: "إحالة طبية",
  OTHER:            "أخرى",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewPatientPage() {
  const router  = useRouter();
  const locale  = useLocale();
  const t       = useTranslations("clinic.patients.new");
  const tCommon = useTranslations("clinic.common");

  const [step, setStep] = useState(0);
  const [s1, setS1] = useState<Partial<Step1>>({});
  const [s2, setS2] = useState<Partial<Step2>>({});
  const [s3, setS3] = useState<Partial<Step3>>({});
  const [s4, setS4] = useState<Partial<Step4>>({});

  const createPatient = useCreateClinicPatient();
  const { data: cities = [] } = useClinicCities();

  const idNumber = s1.idNumber ?? "";
  const { data: dupData } = useCheckDuplicate(idNumber);

  const form1 = useForm<Step1>({
    resolver: zodResolver(step1Schema) as any,
    defaultValues: { firstName: "", lastName: "", identityType: "NATIONAL_ID", idNumber: "", dateOfBirth: "", gender: "MALE", occupation: "", ...s1 },
  });

  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema) as any,
    defaultValues: { phone: "", whatsapp: "", email: "", cityId: "", addressDetails: "", ...s2 },
  });

  const form3 = useForm<Step3>({
    resolver: zodResolver(step3Schema) as any,
    defaultValues: { receivesAid: "", referralSource: "", referralDetails: "", ...s3 },
  });

  const form4 = useForm<Step4>({
    resolver: zodResolver(step4Schema) as any,
    defaultValues: { documentConsent: "FULL", mediaConsent: true, notes: "", ...s4 },
  });

  const nextStep = async () => {
    if (step === 0) {
      const ok = await form1.trigger();
      if (!ok) return;
      setS1(form1.getValues());
    } else if (step === 1) {
      const ok = await form2.trigger();
      if (!ok) return;
      setS2(form2.getValues());
    } else if (step === 2) {
      const ok = await form3.trigger();
      if (!ok) return;
      setS3(form3.getValues());
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    const ok = await form4.trigger();
    if (!ok) return;
    const v4 = form4.getValues();
    setS4(v4);

    const dto: CreatePatientDto = {
      firstName:       s1.firstName!,
      lastName:        s1.lastName!,
      identityType:    s1.identityType! as IdentityType,
      idNumber:        s1.idNumber!,
      dateOfBirth:     s1.dateOfBirth!,
      gender:          s1.gender!,
      occupation:      s1.occupation || undefined,
      phone:           s2.phone!,
      whatsapp:        s2.whatsapp || undefined,
      email:           s2.email || undefined,
      cityId:          s2.cityId && !isNaN(parseInt(s2.cityId)) ? parseInt(s2.cityId) : undefined,
      addressDetails:  s2.addressDetails || undefined,
      heightCm:        s3.heightCm ? Number(s3.heightCm) : undefined,
      weightKg:        s3.weightKg ? Number(s3.weightKg) : undefined,
      educationLevel:  (s3.educationLevel as any) || undefined,
      maritalStatus:   (s3.maritalStatus as any) || undefined,
      livingCondition: (s3.livingCondition as any) || undefined,
      financialStatus: (s3.financialStatus as any) || undefined,
      receivesAid:     s3.receivesAid,
      referralSource:  s3.referralSource || undefined,
      referralDetails: s3.referralDetails || undefined,
    };

    const patient = await createPatient.mutateAsync(dto);

    // Consent created separately via POST /patients/:id/consents
    if (v4.documentConsent || v4.mediaConsent != null) {
      try {
        await clinicPatientsApi.createConsent(patient.id, {
          documentConsent: (v4.documentConsent as ConsentOption) ?? "FULL",
          mediaConsent:    v4.mediaConsent ?? true,
        });
      } catch {
        // consent failure is non-blocking
      }
    }
    // Notes via POST /patients/:id/notes
    if (v4.notes?.trim()) {
      try {
        await clinicPatientsApi.createNote(patient.id, v4.notes.trim());
      } catch {
        // note failure is non-blocking
      }
    }

    router.push(`/${locale}/clinic/patients/${patient.id}`);
  };

  const isDuplicate = dupData?.exists && idNumber.length >= 7;

  const STEPS = [
    { label: "المعلومات الأساسية", desc: "الاسم والهوية وتاريخ الميلاد" },
    { label: "التواصل والعنوان",   desc: "الهاتف والبريد والموقع" },
    { label: "البيانات الاجتماعية", desc: "المستوى التعليمي والوضع المعيشي" },
    { label: "الموافقة والملاحظات", desc: "الموافقات والملاحظات الإضافية" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تسجيل مريض جديد</h1>
        <p className="text-muted-foreground text-sm mt-1">أدخل بيانات المريض عبر الخطوات التالية</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
                i < step  ? "bg-primary border-primary text-primary-foreground"
                : i === step ? "border-primary text-primary"
                : "border-muted-foreground/30 text-muted-foreground",
              )}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-xs font-medium text-center hidden sm:block", i === step ? "text-primary" : "text-muted-foreground")}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-0.5 flex-1 mx-1", i < step ? "bg-primary" : "bg-muted")} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{STEPS[step].label}</CardTitle>
          <p className="text-sm text-muted-foreground">{STEPS[step].desc}</p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Step 1: Basic info */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>الاسم الأول <span className="text-destructive">*</span></Label>
                  <Input {...form1.register("firstName")} />
                  {form1.formState.errors.firstName && <p className="text-xs text-destructive">مطلوب</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>الاسم الأخير <span className="text-destructive">*</span></Label>
                  <Input {...form1.register("lastName")} />
                  {form1.formState.errors.lastName && <p className="text-xs text-destructive">مطلوب</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>نوع الهوية <span className="text-destructive">*</span></Label>
                  <Select value={form1.watch("identityType")} onValueChange={(v) => form1.setValue("identityType", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {IDENTITY_TYPE_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>{IDENTITY_LABELS[v]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>رقم الهوية <span className="text-destructive">*</span></Label>
                  <Input {...form1.register("idNumber")} />
                  {form1.formState.errors.idNumber && <p className="text-xs text-destructive">مطلوب</p>}
                </div>
              </div>
              {isDuplicate && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    يوجد مريض بهذا الرقم.{" "}
                    <button type="button" className="underline font-medium" onClick={() => router.push(`/${locale}/clinic/patients/${dupData?.patientId}`)}>
                      عرض الملف
                    </button>
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>تاريخ الميلاد <span className="text-destructive">*</span></Label>
                  <Input type="date" {...form1.register("dateOfBirth")} />
                  {form1.formState.errors.dateOfBirth && <p className="text-xs text-destructive">مطلوب</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>الجنس <span className="text-destructive">*</span></Label>
                  <Select value={form1.watch("gender")} onValueChange={(v) => form1.setValue("gender", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">ذكر</SelectItem>
                      <SelectItem value="FEMALE">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>المهنة / Occupation</Label>
                <Input {...form1.register("occupation")} placeholder="مثال: مهندس، معلم، ربة منزل..." />
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>رقم الهاتف <span className="text-destructive">*</span></Label>
                  <Input dir="ltr" {...form2.register("phone")} placeholder="+963..." />
                  {form2.formState.errors.phone && <p className="text-xs text-destructive">مطلوب</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>واتساب</Label>
                  <Input dir="ltr" {...form2.register("whatsapp")} placeholder="+963..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>البريد الإلكتروني</Label>
                <Input dir="ltr" type="email" {...form2.register("email")} placeholder="email@example.com" />
                {form2.formState.errors.email && <p className="text-xs text-destructive">بريد غير صالح</p>}
              </div>
              <div className="space-y-1.5">
                <Label>المدينة / المحافظة</Label>
                <Select value={form2.watch("cityId") ?? ""} onValueChange={(v) => form2.setValue("cityId", v)}>
                  <SelectTrigger><SelectValue placeholder="اختر المدينة..." /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}{c.governorate ? ` — ${c.governorate}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>تفاصيل العنوان</Label>
                <Textarea rows={2} {...form2.register("addressDetails")} placeholder="الحي، الشارع، رقم المنزل..." />
              </div>
            </div>
          )}

          {/* Step 3: Social data */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>الطول (سم)</Label>
                  <Input type="number" {...form3.register("heightCm")} placeholder="170" />
                </div>
                <div className="space-y-1.5">
                  <Label>الوزن (كغ)</Label>
                  <Input type="number" {...form3.register("weightKg")} placeholder="70" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>المستوى التعليمي</Label>
                  <Select value={form3.watch("educationLevel") ?? ""} onValueChange={(v) => form3.setValue("educationLevel", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {EDUCATION_VALUES.map((v) => <SelectItem key={v} value={v}>{EDUCATION_LABELS[v]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>الحالة الاجتماعية</Label>
                  <Select value={form3.watch("maritalStatus") ?? ""} onValueChange={(v) => form3.setValue("maritalStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {MARITAL_VALUES.map((v) => <SelectItem key={v} value={v}>{MARITAL_LABELS[v]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>وضع السكن</Label>
                  <Select value={form3.watch("livingCondition") ?? ""} onValueChange={(v) => form3.setValue("livingCondition", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {LIVING_VALUES.map((v) => <SelectItem key={v} value={v}>{LIVING_LABELS[v]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>الوضع المالي</Label>
                  <Select value={form3.watch("financialStatus") ?? ""} onValueChange={(v) => form3.setValue("financialStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {FINANCIAL_VALUES.map((v) => <SelectItem key={v} value={v}>{FINANCIAL_LABELS[v]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>مصدر الإحالة</Label>
                <Select
                  value={form3.watch("referralSource") ?? ""}
                  onValueChange={(v) => form3.setValue("referralSource", v as any)}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {REFERRAL_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>{REFERRAL_LABELS[v]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>تفاصيل الإحالة</Label>
                <Input {...form3.register("referralDetails")} placeholder="تفاصيل إضافية..." />
              </div>
              <div className="space-y-1.5">
                <Label>مقدم الرعاية / Care Provider</Label>
                <Input {...form3.register("receivesAid")} placeholder="مقدم الرعاية..." />
              </div>
            </div>
          )}

          {/* Step 4: Consent & notes */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>موافقة الوثائق</Label>
                <Select value={form4.watch("documentConsent") ?? "FULL"} onValueChange={(v) => form4.setValue("documentConsent", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONSENT_VALUES.map((v) => <SelectItem key={v} value={v}>{CONSENT_LABELS[v]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form4.watch("mediaConsent") ?? true}
                  onCheckedChange={(v) => form4.setValue("mediaConsent", v)}
                />
                <Label>موافقة على استخدام الصور/الوسائط</Label>
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات</Label>
                <Textarea rows={3} {...form4.register("notes")} placeholder="ملاحظات إضافية..." />
              </div>

              {/* Summary */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <p className="font-semibold">ملخص البيانات</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                  <span>الاسم:</span><span className="text-foreground">{s1.firstName} {s1.lastName}</span>
                  <span>رقم الهوية:</span><span className="text-foreground font-mono">{s1.idNumber}</span>
                  <span>الهاتف:</span><span className="text-foreground" dir="ltr">{s2.phone}</span>
                  {s1.occupation && <><span>المهنة:</span><span className="text-foreground">{s1.occupation}</span></>}
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={step === 0 ? () => router.back() : prevStep}>
          <ChevronRight className="h-4 w-4 ml-1" />
          {step === 0 ? "إلغاء" : "السابق"}
        </Button>
        {step < 3 ? (
          <Button onClick={nextStep} disabled={isDuplicate && step === 0}>
            التالي
            <ChevronLeft className="h-4 w-4 mr-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createPatient.isPending}>
            {createPatient.isPending ? "جاري الحفظ..." : "حفظ المريض"}
            <Check className="h-4 w-4 mr-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
