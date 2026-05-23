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
import { useClinicCitiesByGovernorate } from "@/lib/hooks/use-clinic-cities";
import { CreatePatientDto, IdentityType } from "@/lib/api/clinic-patients";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  identityType: z.enum(["NATIONAL_ID", "PASSPORT", "UNHCR", "OTHER"]),
  idNumber: z.string().min(5),
  dateOfBirth: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE"]),
});

const step2Schema = z.object({
  phone: z.string().min(7),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  cityId: z.string().optional(),
  address: z.string().optional(),
});

const step3Schema = z.object({
  height: z.union([z.coerce.number().min(50).max(250), z.literal("")]).optional(),
  weight: z.union([z.coerce.number().min(10).max(300), z.literal("")]).optional(),
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

const IDENTITY_TYPE_VALUES = ["NATIONAL_ID", "PASSPORT", "UNHCR", "OTHER"] as const;
const EDUCATION_VALUES = ["NONE", "PRIMARY", "SECONDARY", "UNIVERSITY", "POSTGRADUATE"] as const;
const MARITAL_VALUES = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"] as const;
const LIVING_VALUES = ["ALONE", "FAMILY", "INSTITUTION"] as const;
const FINANCIAL_VALUES = ["LOW", "MODERATE", "GOOD", "NOT_WORKING", "RETIRED"] as const;
const CONSENT_VALUES = ["FULL", "ANONYMOUS", "NONE"] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewPatientPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("clinic.patients.new");
  const tCommon = useTranslations("clinic.common");

  const [step, setStep] = useState(0);
  const [s1, setS1] = useState<Partial<Step1>>({});
  const [s2, setS2] = useState<Partial<Step2>>({});
  const [s3, setS3] = useState<Partial<Step3>>({});
  const [s4, setS4] = useState<Partial<Step4>>({});

  const [selectedGovernorate, setSelectedGovernorate] = useState("");

  const createPatient = useCreateClinicPatient();
  const { data: governorates = [] } = useClinicCitiesByGovernorate();

  const idNumber = s1.idNumber ?? "";
  const { data: dupData } = useCheckDuplicate(idNumber);

  const form1 = useForm<Step1>({
    resolver: zodResolver(step1Schema) as any,
    defaultValues: { firstName: "", lastName: "", identityType: "NATIONAL_ID", idNumber: "", dateOfBirth: "", gender: "MALE", ...s1 },
  });

  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema) as any,
    defaultValues: { phone: "", whatsapp: "", email: "", cityId: "", address: "", ...s2 },
  });

  const form3 = useForm<Step3>({
    resolver: zodResolver(step3Schema) as any,
    defaultValues: { receivesHumanitarianAid: false, ...s3 },
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
      firstName: s1.firstName!,
      lastName: s1.lastName!,
      identityType: s1.identityType! as IdentityType,
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

  const STEPS = [0, 1, 2, 3].map((i) => ({
    label: t(`steps.${i}.label`),
    desc: t(`steps.${i}.desc`),
  }));

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
                  <Label>{t("fields.firstName")} <span className="text-destructive">*</span></Label>
                  <Input {...form1.register("firstName")} />
                  {form1.formState.errors.firstName && (
                    <p className="text-xs text-destructive">{t("validation.firstNameRequired")}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.lastName")} <span className="text-destructive">*</span></Label>
                  <Input {...form1.register("lastName")} />
                  {form1.formState.errors.lastName && (
                    <p className="text-xs text-destructive">{t("validation.lastNameRequired")}</p>
                  )}
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
                  {form1.formState.errors.idNumber && (
                    <p className="text-xs text-destructive">{t("validation.idNumberRequired")}</p>
                  )}
                </div>
              </div>
              {isDuplicate && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t("duplicate.message")}{" "}
                    <button
                      type="button"
                      className="underline font-medium"
                      onClick={() => router.push(`/${locale}/clinic/patients/${dupData?.patientId}`)}
                    >
                      {t("duplicate.viewFile")}
                    </button>
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.dateOfBirth")} <span className="text-destructive">*</span></Label>
                  <Input type="date" {...form1.register("dateOfBirth")} />
                  {form1.formState.errors.dateOfBirth && (
                    <p className="text-xs text-destructive">{t("validation.dobRequired")}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.gender")} <span className="text-destructive">*</span></Label>
                  <Select value={form1.watch("gender")} onValueChange={(v) => form1.setValue("gender", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">{tCommon("gender.MALE")}</SelectItem>
                      <SelectItem value="FEMALE">{tCommon("gender.FEMALE")}</SelectItem>
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
                  <Label>{t("fields.phone")} <span className="text-destructive">*</span></Label>
                  <Input dir="ltr" {...form2.register("phone")} placeholder="+963..." />
                  {form2.formState.errors.phone && (
                    <p className="text-xs text-destructive">{t("validation.phoneRequired")}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.whatsapp")}</Label>
                  <Input dir="ltr" {...form2.register("whatsapp")} placeholder="+963..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.email")}</Label>
                <Input dir="ltr" type="email" {...form2.register("email")} placeholder="email@example.com" />
                {form2.formState.errors.email && (
                  <p className="text-xs text-destructive">{t("validation.invalidEmail")}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.governorate")}</Label>
                  <Select
                    value={selectedGovernorate}
                    onValueChange={(v) => {
                      setSelectedGovernorate(v);
                      form2.setValue("cityId", "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("fields.governoratePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {governorates.map((g) => (
                        <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.city")}</Label>
                  <Select
                    value={form2.watch("cityId") ?? ""}
                    onValueChange={(v) => form2.setValue("cityId", v)}
                    disabled={!selectedGovernorate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedGovernorate ? t("fields.cityPlaceholder") : "—"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(governorates.find((g) => g.name === selectedGovernorate)?.cities ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.address")}</Label>
                <Textarea rows={2} {...form2.register("address")} placeholder={t("fields.addressPlaceholder")} />
              </div>
            </div>
          )}

          {/* Step 3: Social data */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.height")}</Label>
                  <Input type="number" {...form3.register("height")} placeholder="170" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.weight")}</Label>
                  <Input type="number" {...form3.register("weight")} placeholder="70" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.educationLevel")}</Label>
                  <Select value={form3.watch("educationLevel") ?? ""} onValueChange={(v) => form3.setValue("educationLevel", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {EDUCATION_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>{t(`education.${v}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.maritalStatus")}</Label>
                  <Select value={form3.watch("maritalStatus") ?? ""} onValueChange={(v) => form3.setValue("maritalStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {MARITAL_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>{t(`marital.${v}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("fields.livingStatus")}</Label>
                  <Select value={form3.watch("livingStatus") ?? ""} onValueChange={(v) => form3.setValue("livingStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {LIVING_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>{t(`living.${v}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.financialStatus")}</Label>
                  <Select value={form3.watch("financialStatus") ?? ""} onValueChange={(v) => form3.setValue("financialStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {FINANCIAL_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>{t(`financial.${v}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.centerAccessMethod")}</Label>
                <Input {...form3.register("centerAccessMethod")} placeholder={t("fields.centerAccessPlaceholder")} />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Switch
                  checked={form3.watch("receivesHumanitarianAid") ?? false}
                  onCheckedChange={(v) => form3.setValue("receivesHumanitarianAid", v)}
                />
                <Label>{t("fields.receivesHumanitarianAid")}</Label>
              </div>
            </div>
          )}

          {/* Step 4: Consent & notes */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("fields.documentConsent")}</Label>
                <Select value={form4.watch("documentConsent") ?? "FULL"} onValueChange={(v) => form4.setValue("documentConsent", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONSENT_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>{t(`consent.${v}`)}</SelectItem>
                    ))}
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
                  {s2.cityId && <><span>{t("summary.city")}:</span><span className="text-foreground">{s2.cityId}</span></>}
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
            {createPatient.isPending ? t("nav.saving") : t("nav.save")}
            <Check className="h-4 w-4 mr-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
