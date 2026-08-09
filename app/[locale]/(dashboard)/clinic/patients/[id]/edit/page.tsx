"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Save, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinicPatient, useUpdateClinicPatient, usePatientConsents } from "@/lib/hooks/use-clinic-patients";
import { useClinicCities } from "@/lib/hooks/use-clinic-cities";
import { clinicPatientsApi, ConsentOption, UpdatePatientDto } from "@/lib/api/clinic-patients";
import { ReferralSourceFields, referralDto } from "@/components/clinic/referral-source-fields";
import { REFERRAL_SOURCES, asCurrentReferralSource } from "@/lib/clinic/referral-sources";
import { PatientSignatureField } from "@/components/clinic/patient-signature-field";
import {
  CONSENT_CHOICES, ConsentChoiceKey, consentChoiceOf, consentSignedByValue, decisionOfChoice,
} from "@/components/clinic/consent-choices";

const schema = z.object({
  firstName:       z.string().min(2, "مطلوب"),
  lastName:        z.string().min(2, "مطلوب"),
  identityType:    z.enum(["NATIONAL_ID", "PASSPORT", "UNHCR", "OTHER"]),
  idNumber:        z.string().min(5, "مطلوب"),
  dateOfBirth:     z.string().min(1, "مطلوب"),
  gender:          z.enum(["MALE", "FEMALE"]),
  phone:           z.string().min(7, "مطلوب"),
  whatsapp:        z.string().optional(),
  email:           z.string().email("غير صحيح").optional().or(z.literal("")),
  cityId:          z.string().optional(),
  addressDetails:  z.string().optional(),
  heightCm:        z.coerce.number().min(50).max(250).optional().or(z.literal("")),
  weightKg:        z.coerce.number().min(10).max(300).optional().or(z.literal("")),
  occupation:      z.string().optional(),
  educationLevel:  z.string().optional(),
  maritalStatus:   z.string().optional(),
  livingCondition: z.string().optional(),
  financialStatus: z.string().optional(),
  receivesAid:     z.string().optional(),
  referralSource:  z.enum([...REFERRAL_SOURCES, ""]).optional(),
  referralDetails: z.string().optional(),
  referralStaffId: z.string().optional(),
  notes:           z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const IDENTITY_TYPES = [
  { value: "NATIONAL_ID", label: "هوية وطنية" }, { value: "PASSPORT", label: "جواز سفر" },
  { value: "UNHCR", label: "UNHCR" }, { value: "OTHER", label: "أخرى" },
];
const EDUCATION = [
  { value: "ILLITERATE", label: "أمي" }, { value: "PRIMARY", label: "ابتدائي" },
  { value: "SECONDARY", label: "إعدادي" }, { value: "HIGH_SCHOOL", label: "ثانوي" },
  { value: "UNIVERSITY", label: "جامعي" }, { value: "POSTGRADUATE", label: "دراسات عليا" },
];
const MARITAL = [
  { value: "SINGLE", label: "أعزب" }, { value: "MARRIED", label: "متزوج" },
  { value: "DIVORCED", label: "مطلق" }, { value: "WIDOWED", label: "أرمل" },
];
const LIVING = [
  { value: "WITH_FAMILY", label: "مع العائلة" }, { value: "INDEPENDENT", label: "مستقل" },
  { value: "SHELTER_CAMP", label: "مخيم" }, { value: "OTHER", label: "أخرى" },
];
const FINANCIAL = [
  { value: "LOW", label: "منخفض" }, { value: "MODERATE", label: "متوسط" },
  { value: "GOOD", label: "جيد" }, { value: "NOT_WORKING", label: "لا يعمل" },
  { value: "RETIRED", label: "متقاعد" },
];
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive mt-0.5">{msg}</p>;
}

export default function EditPatientPage() {
  const { id } = useParams<{ id: string }>();
  const { data: patient, isLoading: patientLoading } = useClinicPatient(id);
  const { data: cities = [], isLoading: citiesLoading } = useClinicCities();

  if (patientLoading || citiesLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
      </div>
    );
  }
  if (!patient) return <div className="text-center py-20 text-muted-foreground">المريض غير موجود</div>;

  return <EditPatientForm patient={patient} cities={cities} />;
}

import type { Patient } from "@/lib/api/clinic-patients";
import type { City } from "@/lib/api/clinic-cities";

function EditPatientForm({ patient, cities }: { patient: Patient; cities: City[] }) {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const locale  = useLocale();

  const updatePatient = useUpdateClinicPatient();

  // A consent is only ever recorded together with a signature, so the newest
  // signed consent — not the patient record — is the current choice.
  const { data: consents = [] } = usePatientConsents(id);
  const latestConsent = useMemo(
    () =>
      [...consents].sort(
        (a, b) =>
          new Date(b.signedAt ?? b.createdAt).getTime() - new Date(a.signedAt ?? a.createdAt).getTime(),
      )[0],
    [consents],
  );

  const defaultValues = useMemo<FormValues>(() => {
    const patientCityIdStr = (patient.cityId ?? patient.city?.id)?.toString();
    const matchedCity =
      cities.find((c) => c.id.toString() === patientCityIdStr) ??
      cities.find((c) => c.name === patient.city?.name);

    return {
    firstName:       patient.firstName,
    lastName:        patient.lastName,
    identityType:    patient.identityType,
    idNumber:        patient.idNumber,
    dateOfBirth:     patient.dateOfBirth.slice(0, 10),
    gender:          patient.gender,
    phone:           patient.phone,
    whatsapp:        patient.whatsapp ?? "",
    email:           patient.email ?? "",
    cityId:          matchedCity?.id.toString() ?? patientCityIdStr ?? "",
    addressDetails:  patient.addressDetails ?? "",
    heightCm:        patient.heightCm ?? "",
    weightKg:        patient.weightKg ?? "",
    occupation:      patient.occupation ?? "",
    educationLevel:  patient.educationLevel ?? "",
    maritalStatus:   patient.maritalStatus ?? "",
    livingCondition: patient.livingCondition ?? "",
    financialStatus: patient.financialStatus ?? "",
    receivesAid:     patient.receivesAid ?? "",
    // A retired source (SELF/RELATIVES/…) is cleared so it can't be resent.
    referralSource:  asCurrentReferralSource(patient.referralSource),
    referralDetails: patient.referralDetails ?? "",
    referralStaffId: patient.referralStaffId ?? "",
    notes:           patient.notes ?? "",
    };
  }, [patient, cities, latestConsent]);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues,
  });

  const t = useTranslations("clinic.patients.new");
  // A new signature is only recorded when one is drawn/uploaded here; leaving it
  // empty keeps whatever consent is already on file.
  const [consentSignature, setConsentSignature] = useState("");
  const [consentChoice, setConsentChoice] = useState<ConsentChoiceKey | null>(null);

  // Consents arrive after the form mounts, so the choice is applied once they
  // land — keyed on the record id so it never overwrites the user's own edit.
  const appliedConsentId = useRef<string | null>(null);
  useEffect(() => {
    if (!latestConsent || appliedConsentId.current === latestConsent.id) return;
    appliedConsentId.current = latestConsent.id;
    setConsentChoice(consentChoiceOf(latestConsent.decision));
  }, [latestConsent]);
  const [consentPdfLoading, setConsentPdfLoading] = useState(false);

  const handleExportConsentPdf = async () => {
    if (consentPdfLoading) return;
    setConsentPdfLoading(true);
    try {
      const { downloadConsentFormPdf } = await import("@/components/clinic/consent-form-pdf");
      await downloadConsentFormPdf({
        patientName: `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim(),
        choice: consentChoice,
        signatureDataUri: consentSignature || undefined,
      });
    } catch {
      toast.error(t("consentForm.exportFailed"));
    } finally {
      setConsentPdfLoading(false);
    }
  };

  // Whether the choice on screen differs from the one currently on file.
  const consentChanged =
    !!consentChoice && consentChoice !== consentChoiceOf(latestConsent?.decision);

  const onSubmit = async (values: FormValues) => {
    const dto: UpdatePatientDto = {
      firstName:       values.firstName,
      lastName:        values.lastName,
      identityType:    values.identityType,
      idNumber:        values.idNumber,
      dateOfBirth:     values.dateOfBirth,
      gender:          values.gender,
      phone:           values.phone,
      whatsapp:        values.whatsapp || undefined,
      email:           values.email || undefined,
      cityId:          values.cityId && !isNaN(parseInt(values.cityId)) ? parseInt(values.cityId) : undefined,
      addressDetails:  values.addressDetails || undefined,
      heightCm:        values.heightCm ? Number(values.heightCm) : undefined,
      weightKg:        values.weightKg ? Number(values.weightKg) : undefined,
      occupation:      values.occupation || undefined,
      educationLevel:  (values.educationLevel as any) || undefined,
      maritalStatus:   (values.maritalStatus as any) || undefined,
      livingCondition: (values.livingCondition as any) || undefined,
      financialStatus: (values.financialStatus as any) || undefined,
      receivesAid:     values.receivesAid,
      ...referralDto({
        referralSource:  values.referralSource ?? "",
        referralDetails: values.referralDetails ?? "",
        referralStaffId: values.referralStaffId ?? "",
      }),
      // Consent is deliberately NOT written here: it counts only when signed,
      // and is recorded below as a signed consent record instead.
      notes:           values.notes || undefined,
    };
    await updatePatient.mutateAsync({ id, dto });

    if (consentSignature && consentChoice) {
      try {
        await clinicPatientsApi.createConsent(id, {
          type:     "DOCUMENTATION",
          decision: decisionOfChoice(consentChoice),
          signedByPatient: consentSignedByValue(
            consentSignature,
            `${patient.firstName} ${patient.lastName}`.trim(),
          ),
        });
      } catch {
        toast.error("تم حفظ البيانات، لكن تسجيل الموافقة الموقّعة فشل");
      }
    } else if (consentChanged) {
      // Changing the choice without signing records nothing, so say so rather
      // than let the user leave believing the new choice was saved.
      toast.warning("لم يُحفظ تغيير الموافقة — يجب توقيع المريض لاعتمادها");
    }

    router.push(`/${locale}/clinic/patients/${id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/${locale}/clinic/patients/${id}`)}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">تعديل بيانات المريض</h1>
          <p className="text-sm text-muted-foreground">{patient.firstName} {patient.lastName} — {patient.patientNumber}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">المعلومات الأساسية</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>الاسم الأول <span className="text-destructive">*</span></Label>
                <Input {...register("firstName")} />
                <FieldError msg={errors.firstName?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>اسم العائلة <span className="text-destructive">*</span></Label>
                <Input {...register("lastName")} />
                <FieldError msg={errors.lastName?.message} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>نوع الهوية</Label>
                <Controller name="identityType" control={control} render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {IDENTITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>رقم الهوية <span className="text-destructive">*</span></Label>
                <Input {...register("idNumber")} />
                <FieldError msg={errors.idNumber?.message} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>تاريخ الميلاد <span className="text-destructive">*</span></Label>
                <Input type="date" {...register("dateOfBirth")} />
                <FieldError msg={errors.dateOfBirth?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>الجنس</Label>
                <Controller name="gender" control={control} render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">ذكر</SelectItem>
                      <SelectItem value="FEMALE">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>المهنة / Occupation</Label>
              <Input {...register("occupation")} placeholder="مهندس، معلم، ربة منزل..." />
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">التواصل والموقع</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>رقم الهاتف <span className="text-destructive">*</span></Label>
                <Input dir="ltr" {...register("phone")} />
                <FieldError msg={errors.phone?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>واتساب</Label>
                <Input dir="ltr" {...register("whatsapp")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>البريد الإلكتروني</Label>
              <Input dir="ltr" type="email" {...register("email")} />
              <FieldError msg={errors.email?.message} />
            </div>
            <div className="space-y-1.5">
              <Label>المدينة</Label>
              <Controller name="cityId" control={control} render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label>تفاصيل العنوان</Label>
              <Textarea rows={2} {...register("addressDetails")} />
            </div>
          </CardContent>
        </Card>

        {/* Social */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">البيانات الاجتماعية</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>الطول (سم)</Label>
                <Input type="number" {...register("heightCm")} />
              </div>
              <div className="space-y-1.5">
                <Label>الوزن (كغ)</Label>
                <Input type="number" {...register("weightKg")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>المستوى التعليمي</Label>
                <Controller name="educationLevel" control={control} render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {EDUCATION.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>الحالة الاجتماعية</Label>
                <Controller name="maritalStatus" control={control} render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {MARITAL.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>الوضع المعيشي</Label>
                <Controller name="livingCondition" control={control} render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {LIVING.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>الوضع المالي</Label>
                <Controller name="financialStatus" control={control} render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {FINANCIAL.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <ReferralSourceFields
              value={{
                referralSource:  watch("referralSource") ?? "",
                referralDetails: watch("referralDetails") ?? "",
                referralStaffId: watch("referralStaffId") ?? "",
              }}
              onChange={(v) => {
                setValue("referralSource", v.referralSource);
                setValue("referralDetails", v.referralDetails);
                setValue("referralStaffId", v.referralStaffId);
              }}
            />
            <div className="space-y-1.5">
              <Label>مقدم الرعاية / Care Provider</Label>
              <Input {...register("receivesAid")} placeholder="مقدم الرعاية..." />
            </div>
          </CardContent>
        </Card>

        {/* Consent — same Pro-002 wording and choices as the registration wizard,
            so a consent can be reviewed and changed in the shape it was taken. */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">الموافقات والملاحظات</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleExportConsentPdf}
                disabled={consentPdfLoading}
              >
                {consentPdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {t("consentForm.exportPdf")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="font-semibold text-sm">{t("consentForm.title")}</p>
              <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <p>{t("consentForm.intro")}</p>
                <p>{t("consentForm.authorization")}</p>
              </div>

              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium">{t("consentForm.choicePrompt")}</p>
                {CONSENT_CHOICES.map((c) => {
                  const checked = consentChoice === c.key;
                  return (
                    <label key={c.key} className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setConsentChoice(checked ? null : c.key);
                        }}
                        className="w-4 h-4 checkbox-orange rounded-sm mt-0.5 shrink-0"
                      />
                      <span className="text-xs leading-relaxed">{t(`consentForm.choice.${c.key}`)}</span>
                    </label>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed border-t pt-2">
                {t("consentForm.declaration")}
              </p>

              <PatientSignatureField
                className="border-t pt-3"
                patientId={id}
                patientName={`${patient.firstName} ${patient.lastName}`.trim()}
                value={consentSignature}
                onChange={setConsentSignature}
              />

              {consentChanged && !consentSignature && (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  غيّرت الخيار — لن يُحفظ إلا بتوقيع المريض.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea rows={3} {...register("notes")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between pb-6">
          <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/clinic/patients/${id}`)}>
            إلغاء
          </Button>
          <Button type="submit" disabled={updatePatient.isPending} className="gap-2">
            {updatePatient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ التعديلات
          </Button>
        </div>
      </form>
    </div>
  );
}
