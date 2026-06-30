"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinicPatient, useUpdateClinicPatient } from "@/lib/hooks/use-clinic-patients";
import { useClinicCities } from "@/lib/hooks/use-clinic-cities";
import { UpdatePatientDto } from "@/lib/api/clinic-patients";

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
  referralSource:  z.enum(["SELF","RELATIVES","SOCIAL_MEDIA","MEDICAL_REFERRAL","OTHER",""]).optional(),
  referralDetails: z.string().optional(),
  documentConsent: z.enum(["FULL", "ANONYMOUS", "NONE"]).optional(),
  mediaConsent:    z.boolean().optional(),
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
const CONSENT = [
  { value: "FULL", label: "موافقة كاملة" }, { value: "ANONYMOUS", label: "مجهول" },
  { value: "NONE", label: "رفض" },
];
const REFERRAL_SOURCE = [
  { value: "SELF",             label: "نفسه" },
  { value: "RELATIVES",        label: "أقارب" },
  { value: "SOCIAL_MEDIA",     label: "وسائل التواصل الاجتماعي" },
  { value: "MEDICAL_REFERRAL", label: "إحالة طبية" },
  { value: "OTHER",            label: "أخرى" },
];

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive mt-0.5">{msg}</p>;
}

export default function EditPatientPage() {
  const { id } = useParams<{ id: string }>();
  const { data: patient, isLoading } = useClinicPatient(id);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
      </div>
    );
  }
  if (!patient) return <div className="text-center py-20 text-muted-foreground">المريض غير موجود</div>;

  return <EditPatientForm patient={patient} />;
}

import type { Patient } from "@/lib/api/clinic-patients";

function EditPatientForm({ patient }: { patient: Patient }) {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const locale  = useLocale();

  const { data: cities = [] } = useClinicCities();
  const updatePatient = useUpdateClinicPatient();

  const defaultValues = useMemo<FormValues>(() => ({
    firstName:       patient.firstName,
    lastName:        patient.lastName,
    identityType:    patient.identityType,
    idNumber:        patient.idNumber,
    dateOfBirth:     patient.dateOfBirth.slice(0, 10),
    gender:          patient.gender,
    phone:           patient.phone,
    whatsapp:        patient.whatsapp ?? "",
    email:           patient.email ?? "",
    cityId:          patient.cityId?.toString() ?? "",
    addressDetails:  patient.addressDetails ?? "",
    heightCm:        patient.heightCm ?? "",
    weightKg:        patient.weightKg ?? "",
    occupation:      patient.occupation ?? "",
    educationLevel:  patient.educationLevel ?? "",
    maritalStatus:   patient.maritalStatus ?? "",
    livingCondition: patient.livingCondition ?? "",
    financialStatus: patient.financialStatus ?? "",
    receivesAid:     patient.receivesAid ?? "",
    referralSource:  (patient.referralSource as any) ?? "",
    referralDetails: patient.referralDetails ?? "",
    documentConsent: patient.documentConsent ?? "FULL",
    mediaConsent:    patient.mediaConsent ?? true,
    notes:           patient.notes ?? "",
  }), [patient]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues,
  });

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
      referralSource:  values.referralSource || undefined,
      referralDetails: values.referralDetails || undefined,
      documentConsent: values.documentConsent || undefined,
      mediaConsent:    values.mediaConsent,
      notes:           values.notes || undefined,
    };
    await updatePatient.mutateAsync({ id, dto });
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
                <Select value={watch("identityType")} onValueChange={(v) => setValue("identityType", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IDENTITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                <Select value={watch("gender")} onValueChange={(v) => setValue("gender", v as any)}>
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
              <Select value={watch("cityId") ?? ""} onValueChange={(v) => setValue("cityId", v)}>
                <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                <SelectContent>
                  {cities.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
                <Select value={watch("educationLevel") ?? ""} onValueChange={(v) => setValue("educationLevel", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {EDUCATION.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>الحالة الاجتماعية</Label>
                <Select value={watch("maritalStatus") ?? ""} onValueChange={(v) => setValue("maritalStatus", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {MARITAL.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>وضع السكن</Label>
                <Select value={watch("livingCondition") ?? ""} onValueChange={(v) => setValue("livingCondition", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {LIVING.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>الوضع المالي</Label>
                <Select value={watch("financialStatus") ?? ""} onValueChange={(v) => setValue("financialStatus", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {FINANCIAL.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>مصدر الإحالة</Label>
              <Select value={watch("referralSource") ?? ""} onValueChange={(v) => setValue("referralSource", v as any)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {REFERRAL_SOURCE.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>تفاصيل الإحالة</Label>
              <Input {...register("referralDetails")} />
            </div>
            <div className="space-y-1.5">
              <Label>مقدم الرعاية / Care Provider</Label>
              <Input {...register("receivesAid")} placeholder="مقدم الرعاية..." />
            </div>
          </CardContent>
        </Card>

        {/* Consent */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">الموافقات والملاحظات</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>موافقة الوثائق</Label>
              <Select value={watch("documentConsent") ?? "FULL"} onValueChange={(v) => setValue("documentConsent", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONSENT.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={watch("mediaConsent") ?? true} onCheckedChange={(v) => setValue("mediaConsent", v)} />
              <Label>موافقة على الوسائط</Label>
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
