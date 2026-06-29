"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronRight, ChevronLeft, Check, AlertCircle, Upload, X, FileText, Loader2, Plus } from "lucide-react";
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
import { clinicPatientsApi, CreatePatientDto, IdentityType, ConsentOption, DocumentType } from "@/lib/api/clinic-patients";

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

const REFERRAL_VALUES = ["SELF", "RELATIVES", "SOCIAL_MEDIA", "MEDICAL_REFERRAL", "OTHER"] as const;

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "PERSONAL_PHOTO",      label: "صورة شخصية" },
  { value: "ID_COPY",             label: "نسخة هوية" },
  { value: "AMPUTATION_PHOTO",    label: "صورة البتر" },
  { value: "RESIDUAL_LIMB_PHOTO", label: "صورة الطرف المتبقي" },
  { value: "MEDICAL_REPORT",      label: "تقرير طبي" },
  { value: "OTHER",               label: "أخرى" },
];

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
  const [pendingDocs, setPendingDocs] = useState<{ id: string; file: File; type: DocumentType }[]>([]);
  const [docType, setDocType] = useState<DocumentType>("OTHER");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createPatient = useCreateClinicPatient();
  const { data: rawCities = [] } = useClinicCities();
  const cities = rawCities.filter((c, i, arr) => arr.findIndex((x) => x.name === c.name && x.governorate === c.governorate) === i);

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
      // البيانات الشخصية = form1 + form3
      const ok1 = await form1.trigger();
      const ok3 = await form3.trigger();
      if (!ok1 || !ok3) return;
      setS1(form1.getValues());
      setS3(form3.getValues());
    } else if (step === 1) {
      // بيانات التواصل
      const ok = await form2.trigger();
      if (!ok) return;
      setS2(form2.getValues());
    }
    // step 2 = documents (no validation), step 3 = consent (handled in handleSubmit)
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

    // Upload pending documents
    for (const doc of pendingDocs) {
      try {
        await clinicPatientsApi.uploadDocument(patient.id, doc.file, doc.type);
      } catch {
        // non-blocking
      }
    }

    router.push(`/${locale}/clinic/patients/${patient.id}`);
  };

  const isDuplicate = dupData?.exists && idNumber.length >= 7;

  const STEPS = [
    { label: "البيانات الشخصية",       desc: "المعلومات الأساسية والبيانات الاجتماعية" },
    { label: "بيانات التواصل ", desc: "معلومات التواصل والموقع" },
    { label: "المستندات",              desc: "رفع مستندات المريض (اختياري)" },
    { label: t("steps.3.label"),       desc: t("steps.3.desc") },
  ];
  

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("subtitle")}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <button
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
                  i < step  ? "bg-primary border-primary text-primary-foreground hover:opacity-80"
                  : i === step ? "border-primary text-primary"
                  : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary/70",
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </button>
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
                  <Label>{t("fields.firstName")} <span className="text-destructive">*</span></Label>
                  <Input {...form1.register("firstName")} />
                  {form1.formState.errors.firstName && <p className="text-xs text-destructive">{t("validation.required")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.lastName")} <span className="text-destructive">*</span></Label>
                  <Input {...form1.register("lastName")} />
                  {form1.formState.errors.lastName && <p className="text-xs text-destructive">{t("validation.required")}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.identityType")} <span className="text-destructive">*</span></Label>
                  <Select value={form1.watch("identityType")} onValueChange={(v) => form1.setValue("identityType", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {IDENTITY_TYPE_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>{t(`identityTypes.${v}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.idNumber")} <span className="text-destructive">*</span></Label>
                  <Input {...form1.register("idNumber")} />
                  {form1.formState.errors.idNumber && <p className="text-xs text-destructive">{t("validation.required")}</p>}
                </div>
              </div>
              {isDuplicate && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t("duplicate.message")}{" "}
                    <button type="button" className="underline font-medium" onClick={() => router.push(`/${locale}/clinic/patients/${dupData?.patientId}`)}>
                      {t("duplicate.viewFile")}
                    </button>
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.dateOfBirth")} <span className="text-destructive">*</span></Label>
                  <Input type="date" {...form1.register("dateOfBirth")} />
                  {form1.formState.errors.dateOfBirth && <p className="text-xs text-destructive">{t("validation.required")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.gender")} <span className="text-destructive">*</span></Label>
                  <Select value={form1.watch("gender")} onValueChange={(v) => form1.setValue("gender", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">{t("gender.MALE")}</SelectItem>
                      <SelectItem value="FEMALE">{t("gender.FEMALE")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.occupation")}</Label>
                <Input {...form1.register("occupation")} placeholder={t("fields.occupationPlaceholder")} />
              </div>

              {/* البيانات الاجتماعية */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label>{t("fields.height")}</Label>
                  <Input type="number" {...form3.register("heightCm")} placeholder="170" />
                  {form3.formState.errors.heightCm && <p className="text-xs text-destructive">{t("validation.heightRange")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.weight")}</Label>
                  <Input type="number" {...form3.register("weightKg")} placeholder="70" />
                  {form3.formState.errors.weightKg && <p className="text-xs text-destructive">{t("validation.weightRange")}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.educationLevel")}</Label>
                  <Select value={form3.watch("educationLevel") ?? ""} onValueChange={(v) => form3.setValue("educationLevel", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {EDUCATION_VALUES.map((v) => <SelectItem key={v} value={v}>{t(`education.${v}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.maritalStatus")}</Label>
                  <Select value={form3.watch("maritalStatus") ?? ""} onValueChange={(v) => form3.setValue("maritalStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {MARITAL_VALUES.map((v) => <SelectItem key={v} value={v}>{t(`marital.${v}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.livingCondition")}</Label>
                  <Select value={form3.watch("livingCondition") ?? ""} onValueChange={(v) => form3.setValue("livingCondition", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {LIVING_VALUES.map((v) => <SelectItem key={v} value={v}>{t(`living.${v}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.financialStatus")}</Label>
                  <Select value={form3.watch("financialStatus") ?? ""} onValueChange={(v) => form3.setValue("financialStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {FINANCIAL_VALUES.map((v) => <SelectItem key={v} value={v}>{t(`financial.${v}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.referralSource")}</Label>
                <Select value={form3.watch("referralSource") ?? ""} onValueChange={(v) => form3.setValue("referralSource", v as any)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {REFERRAL_VALUES.map((v) => <SelectItem key={v} value={v}>{t(`referral.${v}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.referralDetails")}</Label>
                <Input {...form3.register("referralDetails")} placeholder={t("fields.referralDetailsPlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.careProvider")}</Label>
                <Input {...form3.register("receivesAid")} placeholder={t("fields.careProviderPlaceholder")} />
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.phone")} <span className="text-destructive">*</span></Label>
                  <Input dir="ltr" {...form2.register("phone")} placeholder={t("fields.phonePlaceholder")} />
                  {form2.formState.errors.phone && <p className="text-xs text-destructive">{t("validation.required")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.whatsapp")}</Label>
                  <Input dir="ltr" {...form2.register("whatsapp")} placeholder={t("fields.phonePlaceholder")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.email")}</Label>
                <Input dir="ltr" type="email" {...form2.register("email")} placeholder={t("fields.emailPlaceholder")} />
                {form2.formState.errors.email && <p className="text-xs text-destructive">{t("validation.invalidEmail")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.city")}</Label>
                <Select value={form2.watch("cityId") ?? ""} onValueChange={(v) => form2.setValue("cityId", v)}>
                  <SelectTrigger><SelectValue placeholder={t("fields.cityPlaceholder")} /></SelectTrigger>
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
                <Label>{t("fields.address")}</Label>
                <Textarea rows={2} {...form2.register("addressDetails")} placeholder={t("fields.addressPlaceholder")} />
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 2 && (
            <div className="space-y-4">
              {/* قائمة المستندات المضافة */}
              {pendingDocs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
                  لم يتم إضافة مستندات بعد
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {DOC_TYPE_OPTIONS.find((o) => o.value === doc.type)?.label}
                          {" · "}{(doc.file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setPendingDocs((prev) => prev.filter((d) => d.id !== doc.id))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* إضافة مستند جديد */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <p className="text-sm font-medium">إضافة مستند</p>
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">نوع المستند</Label>
                    <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOC_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    className="gap-2 h-9"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="h-4 w-4" />
                    رفع ملف
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPendingDocs((prev) => [...prev, { id: crypto.randomUUID(), file, type: docType }]);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 5: Consent & notes */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("fields.documentConsent")}</Label>
                <Select value={form4.watch("documentConsent") ?? "FULL"} onValueChange={(v) => form4.setValue("documentConsent", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONSENT_VALUES.map((v) => <SelectItem key={v} value={v}>{t(`consent.${v}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form4.watch("mediaConsent") ?? true}
                  onCheckedChange={(v) => form4.setValue("mediaConsent", v)}
                />
                <Label>{t("fields.mediaConsent")}</Label>
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.notes")}</Label>
                <Textarea rows={3} {...form4.register("notes")} placeholder={t("fields.notesPlaceholder")} />
              </div>

              {/* Summary */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <p className="font-semibold">{t("summary.title")}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                  <span>{t("summary.name")}:</span><span className="text-foreground">{s1.firstName} {s1.lastName}</span>
                  <span>{t("summary.idNumber")}:</span><span className="text-foreground font-mono">{s1.idNumber}</span>
                  <span>{t("summary.phone")}:</span><span className="text-foreground" dir="ltr">{s2.phone}</span>
                  {s1.occupation && <><span>{t("summary.occupation")}:</span><span className="text-foreground">{s1.occupation}</span></>}
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
          {step === 0 ? t("nav.cancel") : t("nav.prev")}
        </Button>
        {step < 3 ? (
          <Button onClick={nextStep} disabled={isDuplicate && step === 0}>
            {t("nav.next")}
            <ChevronLeft className="h-4 w-4 mr-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createPatient.isPending}>
            {createPatient.isPending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" />{t("nav.saving")}</>
            ) : (
              <>{t("nav.save")}<Check className="h-4 w-4 mr-1" /></>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
