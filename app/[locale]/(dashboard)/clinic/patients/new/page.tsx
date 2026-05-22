"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCreateClinicPatient, useCheckDuplicate } from "@/lib/hooks/use-clinic-patients";
import { useClinicCities } from "@/lib/hooks/use-clinic-cities";
import { CreatePatientDto } from "@/lib/api/clinic-patients";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  firstName: z.string().min(2, "الاسم الأول مطلوب"),
  lastName: z.string().min(2, "اسم العائلة مطلوب"),
  identityType: z.enum(["NATIONAL_ID", "PASSPORT", "RESIDENCE"]),
  idNumber: z.string().min(5, "رقم الهوية مطلوب"),
  dateOfBirth: z.string().min(1, "تاريخ الميلاد مطلوب"),
  gender: z.enum(["MALE", "FEMALE"]),
});

const step2Schema = z.object({
  phone: z.string().min(7, "رقم الهاتف مطلوب"),
  whatsapp: z.string().optional(),
  email: z.string().email("بريد إلكتروني غير صحيح").optional().or(z.literal("")),
  cityId: z.string().optional(),
  address: z.string().optional(),
});

const step3Schema = z.object({
  height: z.coerce.number().min(50).max(250).optional().or(z.literal("")),
  weight: z.coerce.number().min(10).max(300).optional().or(z.literal("")),
  educationLevel: z.string().optional(),
  maritalStatus: z.string().optional(),
  livingStatus: z.string().optional(),
  financialStatus: z.string().optional(),
  receivesHumanitarianAid: z.boolean().optional(),
  centerAccessMethod: z.string().optional(),
});

const step4Schema = z.object({
  documentConsent: z.enum(["FULL", "ANONYMOUS", "NONE"]).optional(),
  mediaConsent: z.boolean().optional(),
  notes: z.string().optional(),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type Step3 = z.infer<typeof step3Schema>;
type Step4 = z.infer<typeof step4Schema>;

// ─── Step labels ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "المعلومات الأساسية", desc: "الهوية والجنس" },
  { label: "التواصل والموقع", desc: "الهاتف والعنوان" },
  { label: "البيانات الاجتماعية", desc: "المستوى التعليمي والحالة" },
  { label: "الموافقات والملاحظات", desc: "الإذن بالبيانات" },
];

// ─── Options ──────────────────────────────────────────────────────────────────

const IDENTITY_TYPES = [
  { value: "NATIONAL_ID", label: "هوية وطنية" },
  { value: "PASSPORT", label: "جواز سفر" },
  { value: "UNHCR", label: "بطاقة UNHCR" },
  { value: "OTHER", label: "أخرى" },
];

const EDUCATION = [
  { value: "NONE", label: "بدون تعليم" },
  { value: "PRIMARY", label: "ابتدائي" },
  { value: "SECONDARY", label: "ثانوي" },
  { value: "UNIVERSITY", label: "جامعي" },
  { value: "POSTGRADUATE", label: "دراسات عليا" },
];

const MARITAL = [
  { value: "SINGLE", label: "أعزب" },
  { value: "MARRIED", label: "متزوج" },
  { value: "DIVORCED", label: "مطلق" },
  { value: "WIDOWED", label: "أرمل" },
];

const LIVING = [
  { value: "ALONE", label: "وحده" },
  { value: "FAMILY", label: "مع العائلة" },
  { value: "INSTITUTION", label: "مؤسسة" },
];

const FINANCIAL = [
  { value: "LOW", label: "منخفض" },
  { value: "MODERATE", label: "متوسط" },
  { value: "GOOD", label: "جيد" },
  { value: "NOT_WORKING", label: "غير عامل" },
  { value: "RETIRED", label: "متقاعد" },
];

const CONSENT = [
  { value: "FULL", label: "موافقة كاملة" },
  { value: "ANONYMOUS", label: "موافقة مجهولة" },
  { value: "NONE", label: "رفض" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewPatientPage() {
  const router = useRouter();
  const locale = useLocale();
  const [step, setStep] = useState(0);

  const [s1, setS1] = useState<Partial<Step1>>({});
  const [s2, setS2] = useState<Partial<Step2>>({});
  const [s3, setS3] = useState<Partial<Step3>>({});
  const [s4, setS4] = useState<Partial<Step4>>({});

  const createPatient = useCreateClinicPatient();
  const { data: cities = [] } = useClinicCities();

  // Duplicate check on idNumber
  const idNumber = s1.idNumber ?? "";
  const { data: dupData } = useCheckDuplicate(idNumber);

  // ── Step 1 Form ──
  const form1 = useForm<Step1>({
    resolver: zodResolver(step1Schema),
    defaultValues: { firstName: "", lastName: "", identityType: "NATIONAL_ID", idNumber: "", dateOfBirth: "", gender: "MALE", ...s1 },
  });

  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: { phone: "", whatsapp: "", email: "", cityId: "", address: "", ...s2 },
  });

  const form3 = useForm<Step3>({
    resolver: zodResolver(step3Schema),
    defaultValues: { receivesHumanitarianAid: false, ...s3 },
  });

  const form4 = useForm<Step4>({
    resolver: zodResolver(step4Schema),
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
      firstName: s1.firstName!,
      lastName: s1.lastName!,
      identityType: s1.identityType!,
      idNumber: s1.idNumber!,
      dateOfBirth: s1.dateOfBirth!,
      gender: s1.gender!,
      phone: s2.phone!,
      whatsapp: s2.whatsapp || undefined,
      email: s2.email || undefined,
      cityId: s2.cityId ? parseInt(s2.cityId) : undefined,
      address: s2.address || undefined,
      height: s3.height ? Number(s3.height) : undefined,
      weight: s3.weight ? Number(s3.weight) : undefined,
      educationLevel: (s3.educationLevel as any) || undefined,
      maritalStatus: (s3.maritalStatus as any) || undefined,
      livingStatus: (s3.livingStatus as any) || undefined,
      financialStatus: (s3.financialStatus as any) || undefined,
      receivesHumanitarianAid: s3.receivesHumanitarianAid,
      centerAccessMethod: s3.centerAccessMethod || undefined,
      documentConsent: (v4.documentConsent as any) || undefined,
      mediaConsent: v4.mediaConsent,
      notes: v4.notes || undefined,
    };

    const patient = await createPatient.mutateAsync(dto);
    router.push(`/${locale}/clinic/patients/${patient.id}`);
  };

  const isDuplicate = dupData?.exists && idNumber.length >= 7;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold">تسجيل مريض جديد</h1>
        <p className="text-muted-foreground text-sm mt-1">أدخل بيانات المريض في 4 خطوات</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
                i < step ? "bg-primary border-primary text-primary-foreground"
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
                  <Input {...form1.register("firstName")} placeholder="محمد" />
                  {form1.formState.errors.firstName && (
                    <p className="text-xs text-destructive">{form1.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>اسم العائلة <span className="text-destructive">*</span></Label>
                  <Input {...form1.register("lastName")} placeholder="أحمد" />
                  {form1.formState.errors.lastName && (
                    <p className="text-xs text-destructive">{form1.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>نوع الهوية <span className="text-destructive">*</span></Label>
                  <Select value={form1.watch("identityType")} onValueChange={(v) => form1.setValue("identityType", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {IDENTITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>رقم الهوية <span className="text-destructive">*</span></Label>
                  <Input {...form1.register("idNumber")} placeholder="1234567890" />
                  {form1.formState.errors.idNumber && (
                    <p className="text-xs text-destructive">{form1.formState.errors.idNumber.message}</p>
                  )}
                </div>
              </div>
              {isDuplicate && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    هذا الرقم مسجل مسبقاً.{" "}
                    <button
                      type="button"
                      className="underline font-medium"
                      onClick={() => router.push(`/${locale}/clinic/patients/${dupData?.patientId}`)}
                    >
                      عرض ملف المريض
                    </button>
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>تاريخ الميلاد <span className="text-destructive">*</span></Label>
                  <Input type="date" {...form1.register("dateOfBirth")} />
                  {form1.formState.errors.dateOfBirth && (
                    <p className="text-xs text-destructive">{form1.formState.errors.dateOfBirth.message}</p>
                  )}
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
            </div>
          )}

          {/* Step 2: Contact & location */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>رقم الهاتف <span className="text-destructive">*</span></Label>
                  <Input dir="ltr" {...form2.register("phone")} placeholder="+963..." />
                  {form2.formState.errors.phone && (
                    <p className="text-xs text-destructive">{form2.formState.errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>واتساب</Label>
                  <Input dir="ltr" {...form2.register("whatsapp")} placeholder="+963..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>البريد الإلكتروني</Label>
                <Input dir="ltr" type="email" {...form2.register("email")} placeholder="email@example.com" />
                {form2.formState.errors.email && (
                  <p className="text-xs text-destructive">{form2.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>المدينة</Label>
                <Select value={form2.watch("cityId") ?? ""} onValueChange={(v) => form2.setValue("cityId", v)}>
                  <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>العنوان التفصيلي</Label>
                <Textarea rows={2} {...form2.register("address")} placeholder="الحي، الشارع..." />
              </div>
            </div>
          )}

          {/* Step 3: Social data */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>الطول (سم)</Label>
                  <Input type="number" {...form3.register("height")} placeholder="170" />
                </div>
                <div className="space-y-1.5">
                  <Label>الوزن (كغ)</Label>
                  <Input type="number" {...form3.register("weight")} placeholder="70" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>المستوى التعليمي</Label>
                  <Select value={form3.watch("educationLevel") ?? ""} onValueChange={(v) => form3.setValue("educationLevel", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {EDUCATION.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>الحالة الاجتماعية</Label>
                  <Select value={form3.watch("maritalStatus") ?? ""} onValueChange={(v) => form3.setValue("maritalStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {MARITAL.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>وضع السكن</Label>
                  <Select value={form3.watch("livingStatus") ?? ""} onValueChange={(v) => form3.setValue("livingStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {LIVING.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>الوضع المادي</Label>
                  <Select value={form3.watch("financialStatus") ?? ""} onValueChange={(v) => form3.setValue("financialStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {FINANCIAL.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>طريقة الوصول إلى المركز</Label>
                <Input {...form3.register("centerAccessMethod")} placeholder="سيارة خاصة، مواصلات عامة..." />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Switch
                  checked={form3.watch("receivesHumanitarianAid") ?? false}
                  onCheckedChange={(v) => form3.setValue("receivesHumanitarianAid", v)}
                />
                <Label>يتلقى مساعدات إنسانية</Label>
              </div>
            </div>
          )}

          {/* Step 4: Consent & notes */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>الموافقة على توثيق البيانات</Label>
                <Select value={form4.watch("documentConsent") ?? "FULL"} onValueChange={(v) => form4.setValue("documentConsent", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONSENT.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form4.watch("mediaConsent") ?? true}
                  onCheckedChange={(v) => form4.setValue("mediaConsent", v)}
                />
                <Label>الموافقة على استخدام الوسائط (صور/فيديو)</Label>
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات</Label>
                <Textarea rows={3} {...form4.register("notes")} placeholder="أي ملاحظات إضافية عن المريض..." />
              </div>

              {/* Summary */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <p className="font-semibold">ملخص البيانات</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                  <span>الاسم:</span><span className="text-foreground">{s1.firstName} {s1.lastName}</span>
                  <span>رقم الهوية:</span><span className="text-foreground font-mono">{s1.idNumber}</span>
                  <span>الهاتف:</span><span className="text-foreground" dir="ltr">{s2.phone}</span>
                  {s2.cityId && <><span>المدينة:</span><span className="text-foreground">{s2.cityId}</span></>}
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
