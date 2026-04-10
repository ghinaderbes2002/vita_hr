"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateEmployee, useUpdateEmployee, useEmployees } from "@/lib/hooks/use-employees";
import { toast } from "sonner";
import { useDepartments } from "@/lib/hooks/use-departments";
import { useJobGrades } from "@/lib/hooks/use-job-grades";
import { useJobTitles } from "@/lib/hooks/use-job-titles";
import { Employee } from "@/types";
import { Camera, Loader2, Paperclip, Plus, Trash2, Upload, X } from "lucide-react";

type FormData = {
  firstNameAr: string; lastNameAr: string; firstNameEn: string; lastNameEn: string;
  email: string; phone?: string; mobile?: string; nationalId: string;
  gender: "MALE" | "FEMALE"; dateOfBirth: string; departmentId: string; hireDate: string;
  contractType: "FIXED_TERM" | "INDEFINITE" | "TEMPORARY" | "TRAINEE";
  probationPeriod?: "ONE_MONTH" | "TWO_MONTHS" | "THREE_MONTHS";
  interviewEvaluation?: "EXCELLENT" | "VERY_GOOD" | "GOOD" | "ACCEPTABLE" | "POOR";
  employmentStatus?: "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED";
  jobTitleId?: string; jobGradeId?: string; managerId?: string; basicSalary?: number;
  profilePhoto?: string;
  bloodType?: "A_POSITIVE" | "A_NEGATIVE" | "B_POSITIVE" | "B_NEGATIVE" | "AB_POSITIVE" | "AB_NEGATIVE" | "O_POSITIVE" | "O_NEGATIVE";
  familyMembersCount?: number; chronicDiseases?: string; currentAddress?: string;
  isSmoker?: boolean;
  hasDrivingLicense?: boolean;
  maritalStatus?: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
  educationLevel?: "ILLITERATE" | "PRIMARY" | "SECONDARY" | "DIPLOMA" | "UNIVERSITY" | "POSTGRADUATE";
  universityYear?: number; religion?: string; yearsOfExperience?: number;
  certificate1?: string; specialization1?: string; certificateAttachment1?: string;
  certificate2?: string; specialization2?: string; certificateAttachment2?: string;
};

type Attachment = { fileUrl: string; fileName: string };
type TrainingCertificate = { name: string; attachmentUrl?: string };
type Allowance = { type: string; amount: number };

function PhotoPicker({ value, onChange, chooseLabel, removeLabel }: {
  value: string;
  onChange: (v: string) => void;
  chooseLabel: string;
  removeLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="flex items-center gap-4">
      <div
        className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors bg-muted/30 shrink-0"
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <img src={value} alt="profile" className="w-full h-full object-cover" />
        ) : (
          <Camera className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          {chooseLabel}
        </Button>
        {value && (
          <Button
            type="button" variant="ghost" size="sm" className="text-destructive"
            onClick={() => { onChange(""); if (inputRef.current) inputRef.current.value = ""; }}
          >
            <X className="h-3 w-3 ml-1" />
            {removeLabel}
          </Button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function FilePicker({ value, onChange, labels }: {
  value: string;
  onChange: (url: string) => void;
  labels: { change: string; choose: string; noFile: string; uploadError: string };
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { fileUrl } = await res.json();
      onChange(fileUrl);
    } catch {
      toast.error(labels.uploadError);
    } finally {
      setUploading(false);
    }
  };

  const fileName = value ? value.split("/").pop() : null;

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 shrink-0"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {value ? labels.change : labels.choose}
      </Button>
      {fileName && (
        <>
          <span className="text-sm text-muted-foreground truncate max-w-40" title={fileName}>{fileName}</span>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onChange("")}>
            <X className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </>
      )}
      {!value && !uploading && (
        <span className="text-xs text-muted-foreground">{labels.noFile}</span>
      )}
      <input ref={inputRef} type="file" className="hidden" onChange={handleFile} />
    </div>
  );
}

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee;
  defaultInterviewEvaluation?: "EXCELLENT" | "VERY_GOOD" | "GOOD" | "ACCEPTABLE" | "POOR";
}

export function EmployeeDialog({ open, onOpenChange, employee, defaultInterviewEvaluation }: EmployeeDialogProps) {
  const t = useTranslations();
  const isEdit = !!employee;

  const filePickerLabels = {
    change: t("employees.form.changeFile"),
    choose: t("employees.form.chooseFile"),
    noFile: t("employees.form.noFileChosen"),
    uploadError: t("employees.form.uploadError"),
  };

  const ALLOWANCE_TYPES = [
    { value: "FOOD", label: t("employees.form.allowances.FOOD") },
    { value: "PREVIOUS_EXPERIENCE", label: t("employees.form.allowances.PREVIOUS_EXPERIENCE") },
    { value: "ACADEMIC_DEGREE", label: t("employees.form.allowances.ACADEMIC_DEGREE") },
    { value: "WORK_NATURE", label: t("employees.form.allowances.WORK_NATURE") },
    { value: "RESPONSIBILITY", label: t("employees.form.allowances.RESPONSIBILITY") },
    { value: "RESIDENCE", label: t("employees.form.allowances.RESIDENCE") },
  ];

  const formSchema = z.object({
    firstNameAr: z.string().min(2, t("employees.fields.firstNameAr") + " " + t("common.required")),
    lastNameAr: z.string().min(2, t("employees.fields.lastNameAr") + " " + t("common.required")),
    firstNameEn: z.string().min(2, t("employees.form.firstNameEnRequired")),
    lastNameEn: z.string().min(2, t("employees.form.lastNameEnRequired")),
    email: z.string().email(t("employees.form.invalidEmail")),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    nationalId: z.string().min(1, t("employees.form.nationalIdRequired")),
    gender: z.enum(["MALE", "FEMALE"]),
    dateOfBirth: z.string().min(1, t("employees.form.dateOfBirthRequired")),
    departmentId: z.string().min(1, t("employees.form.departmentRequired")),
    hireDate: z.string().min(1, t("employees.form.hireDateRequired")),
    contractType: z.enum(["FIXED_TERM", "INDEFINITE", "TEMPORARY", "TRAINEE"]),
    probationPeriod: z.enum(["ONE_MONTH", "TWO_MONTHS", "THREE_MONTHS"]).optional(),
    interviewEvaluation: z.enum(["EXCELLENT", "VERY_GOOD", "GOOD", "ACCEPTABLE", "POOR"]).optional(),
    employmentStatus: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"]).optional(),
    jobTitleId: z.string().optional(),
    jobGradeId: z.string().optional(),
    managerId: z.string().optional(),
    basicSalary: z.number().min(0).optional(),
    profilePhoto: z.string().optional(),
    bloodType: z.enum(["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"]).optional(),
    familyMembersCount: z.number().int().min(0).optional(),
    chronicDiseases: z.string().optional(),
    currentAddress: z.string().optional(),
    isSmoker: z.boolean().optional(),
    hasDrivingLicense: z.boolean().optional(),
    maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional(),
    educationLevel: z.enum(["ILLITERATE", "PRIMARY", "SECONDARY", "DIPLOMA", "UNIVERSITY", "POSTGRADUATE"]).optional(),
    universityYear: z.number().int().min(1).max(7).optional(),
    religion: z.string().optional(),
    yearsOfExperience: z.number().int().min(0).optional(),
    certificate1: z.string().optional(),
    specialization1: z.string().optional(),
    certificateAttachment1: z.string().optional(),
    certificate2: z.string().optional(),
    specialization2: z.string().optional(),
    certificateAttachment2: z.string().optional(),
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attUploading, setAttUploading] = useState(false);
  const attInputRef = useRef<HTMLInputElement>(null);
  const [trainingCertificates, setTrainingCertificates] = useState<TrainingCertificate[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const { data: allEmployeesData } = useEmployees({ limit: 100 });
  const { data: departmentsData } = useDepartments({ limit: 100 });
  const { data: gradesData } = useJobGrades();
  const { data: titlesData } = useJobTitles();

  const allEmployees = (allEmployeesData as any)?.data?.items || (allEmployeesData as any)?.items || [];
  const departments = (departmentsData as any)?.data?.items || [];
  const jobGrades = Array.isArray(gradesData)
    ? gradesData
    : (gradesData as any)?.data?.items || (gradesData as any)?.data || [];
  const jobTitles = Array.isArray(titlesData)
    ? titlesData
    : (titlesData as any)?.data?.items || (titlesData as any)?.data || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstNameAr: "",
      lastNameAr: "",
      firstNameEn: "",
      lastNameEn: "",
      email: "",
      phone: "",
      mobile: "",
      nationalId: "",
      gender: "MALE",
      dateOfBirth: "",
      departmentId: "",
      hireDate: "",
      contractType: "INDEFINITE",
      probationPeriod: undefined,
      interviewEvaluation: defaultInterviewEvaluation,
      employmentStatus: "ACTIVE",
      jobTitleId: "",
      jobGradeId: "",
      managerId: "",
      basicSalary: 0,
      profilePhoto: "",
      bloodType: undefined,
      familyMembersCount: undefined,
      chronicDiseases: "",
      currentAddress: "",
      isSmoker: false,
      educationLevel: undefined,
      universityYear: undefined,
      religion: "",
      yearsOfExperience: undefined,
      certificate1: "",
      specialization1: "",
      certificateAttachment1: "",
      certificate2: "",
      specialization2: "",
      certificateAttachment2: "",
    },
  });

  const toDateInput = (dateStr?: string) => {
    if (!dateStr) return "";
    return dateStr.substring(0, 10);
  };

  useEffect(() => {
    if (!open) return;
    if (employee) {
      form.reset({
        firstNameAr: employee.firstNameAr || "",
        lastNameAr: employee.lastNameAr || "",
        firstNameEn: employee.firstNameEn || "",
        lastNameEn: employee.lastNameEn || "",
        email: employee.email || "",
        phone: employee.phone || "",
        mobile: employee.mobile || "",
        nationalId: employee.nationalId || "",
        gender: employee.gender || "MALE",
        dateOfBirth: toDateInput(employee.dateOfBirth),
        departmentId: employee.departmentId || "",
        hireDate: toDateInput(employee.hireDate),
        contractType: (employee.contractType as any) || "INDEFINITE",
        probationPeriod: (employee as any).probationPeriod || undefined,
        interviewEvaluation: (employee as any).interviewEvaluation || undefined,
        employmentStatus: employee.employmentStatus || "ACTIVE",
        jobTitleId: (employee as any).jobTitleId || "",
        jobGradeId: (employee as any).jobGradeId || "",
        managerId: (employee as any).managerId || "",
        basicSalary: Number((employee as any).basicSalary) || 0,
        profilePhoto: (employee as any).profilePhoto || "",
        bloodType: (employee as any).bloodType || undefined,
        familyMembersCount: (employee as any).familyMembersCount ?? undefined,
        chronicDiseases: (employee as any).chronicDiseases || "",
        currentAddress: (employee as any).currentAddress || "",
        isSmoker: (employee as any).isSmoker ?? false,
        hasDrivingLicense: (employee as any).hasDrivingLicense ?? false,
        maritalStatus: (employee as any).maritalStatus || undefined,
        educationLevel: (employee as any).educationLevel || undefined,
        universityYear: (employee as any).universityYear ?? undefined,
        religion: (employee as any).religion || "",
        yearsOfExperience: (employee as any).yearsOfExperience ?? undefined,
        certificate1: (employee as any).certificate1 || "",
        specialization1: (employee as any).specialization1 || "",
        certificateAttachment1: (employee as any).certificateAttachment1 || "",
        certificate2: (employee as any).certificate2 || "",
        specialization2: (employee as any).specialization2 || "",
        certificateAttachment2: (employee as any).certificateAttachment2 || "",
      });
      setAttachments((employee as any).attachments || []);
      setTrainingCertificates((employee as any).trainingCertificates || []);
      setAllowances((employee as any).allowances || []);
    } else {
      form.reset({
        firstNameAr: "",
        lastNameAr: "",
        firstNameEn: "",
        lastNameEn: "",
        email: "",
        phone: "",
        mobile: "",
        nationalId: "",
        gender: "MALE",
        dateOfBirth: "",
        departmentId: "",
        hireDate: "",
        contractType: "INDEFINITE",
        employmentStatus: "ACTIVE",
        jobTitleId: "",
        jobGradeId: "",
        managerId: "",
        basicSalary: 0,
        profilePhoto: "",
        bloodType: undefined,
        familyMembersCount: undefined,
        chronicDiseases: "",
        currentAddress: "",
        isSmoker: false,
        hasDrivingLicense: false,
        maritalStatus: undefined,
        educationLevel: undefined,
        universityYear: undefined,
        religion: "",
        yearsOfExperience: undefined,
        certificate1: "",
        specialization1: "",
        certificateAttachment1: "",
        certificate2: "",
        specialization2: "",
        certificateAttachment2: "",
        interviewEvaluation: defaultInterviewEvaluation,
      });
      setAttachments([]);
      setTrainingCertificates([]);
      setAllowances([]);
    }
  }, [open, employee, defaultInterviewEvaluation, form]);

  const onSubmit = async (data: FormData) => {
    try {
      const qualificationFields: Record<string, any> = {};
      if (data.yearsOfExperience !== undefined) qualificationFields.yearsOfExperience = data.yearsOfExperience;
      if (data.certificate1) qualificationFields.certificate1 = data.certificate1;
      if (data.specialization1) qualificationFields.specialization1 = data.specialization1;
      if (data.certificateAttachment1) qualificationFields.certificateAttachment1 = data.certificateAttachment1;
      if (data.certificate2) qualificationFields.certificate2 = data.certificate2;
      if (data.specialization2) qualificationFields.specialization2 = data.specialization2;
      if (data.certificateAttachment2) qualificationFields.certificateAttachment2 = data.certificateAttachment2;

      if (isEdit) {
        const updateData: Record<string, any> = {
          firstNameAr: data.firstNameAr,
          lastNameAr: data.lastNameAr,
          firstNameEn: data.firstNameEn,
          lastNameEn: data.lastNameEn,
          email: data.email,
          phone: data.phone || undefined,
          mobile: data.mobile || undefined,
          nationalId: data.nationalId,
          gender: data.gender,
          dateOfBirth: data.dateOfBirth,
          departmentId: data.departmentId,
          contractType: data.contractType,
          employmentStatus: data.employmentStatus,
          jobTitleId: data.jobTitleId || undefined,
          jobGradeId: data.jobGradeId || undefined,
          managerId: data.managerId || undefined,
          basicSalary: data.basicSalary || undefined,
          profilePhoto: data.profilePhoto || undefined,
          bloodType: data.bloodType || undefined,
          familyMembersCount: data.familyMembersCount ?? undefined,
          chronicDiseases: data.chronicDiseases || undefined,
          currentAddress: data.currentAddress || undefined,
          isSmoker: data.isSmoker,
          hasDrivingLicense: data.hasDrivingLicense,
          maritalStatus: data.maritalStatus || undefined,
          educationLevel: data.educationLevel || undefined,
          universityYear: data.universityYear ?? undefined,
          religion: data.religion || undefined,
          ...qualificationFields,
          ...(attachments.length > 0 && { attachments }),
          ...(trainingCertificates.length > 0 && { trainingCertificates }),
          ...(allowances.length > 0 && { allowances }),
        };
        await updateEmployee.mutateAsync({ id: employee.id, data: updateData });
      } else {
        const { employmentStatus, ...rest } = data;
        const createData: Record<string, any> = {
          ...rest,
          phone: rest.phone || undefined,
          mobile: rest.mobile || undefined,
          jobTitleId: rest.jobTitleId || undefined,
          jobGradeId: rest.jobGradeId || undefined,
          managerId: rest.managerId || undefined,
          basicSalary: rest.basicSalary || undefined,
          profilePhoto: rest.profilePhoto || undefined,
          bloodType: rest.bloodType || undefined,
          familyMembersCount: rest.familyMembersCount ?? undefined,
          chronicDiseases: rest.chronicDiseases || undefined,
          currentAddress: rest.currentAddress || undefined,
          isSmoker: rest.isSmoker ?? undefined,
          hasDrivingLicense: rest.hasDrivingLicense ?? undefined,
          maritalStatus: rest.maritalStatus || undefined,
          educationLevel: rest.educationLevel || undefined,
          universityYear: rest.universityYear ?? undefined,
          religion: rest.religion || undefined,
          certificate1: rest.certificate1 || undefined,
          specialization1: rest.specialization1 || undefined,
          certificateAttachment1: rest.certificateAttachment1 || undefined,
          certificate2: rest.certificate2 || undefined,
          specialization2: rest.specialization2 || undefined,
          certificateAttachment2: rest.certificateAttachment2 || undefined,
          ...(attachments.length > 0 && { attachments }),
          ...(trainingCertificates.length > 0 && { trainingCertificates }),
          ...(allowances.length > 0 && { allowances }),
        };
        await createEmployee.mutateAsync(createData);
      }
      onOpenChange(false);
      form.reset();
      setAttachments([]);
      setTrainingCertificates([]);
      setAllowances([]);
    } catch (error: any) {
      const errData = error?.response?.data;
      const code = errData?.error?.code || errData?.code;
      if (code === "SALARY_OUT_OF_RANGE") {
        const details = errData?.error?.details?.[0] || errData?.details?.[0];
        toast.error(
          details
            ? `${t("employees.form.salaryOutOfRange")} (${Math.min(Number(details.min), Number(details.max)).toLocaleString()} – ${Math.max(Number(details.min), Number(details.max)).toLocaleString()})`
            : t("employees.form.salaryOutOfRange")
        );
      } else {
        console.error("💥 Backend says:", JSON.stringify(errData, null, 2));
      }
    }
  };

  const isLoading = createEmployee.isPending || updateEmployee.isPending;

  const selectedGradeId = form.watch("jobGradeId");
  const selectedGrade = jobGrades.find((g: any) => g.id === selectedGradeId);
  const gradeMin = selectedGrade ? Math.min(Number(selectedGrade.minSalary), Number(selectedGrade.maxSalary)) : 0;
  const gradeMax = selectedGrade ? Math.max(Number(selectedGrade.minSalary), Number(selectedGrade.maxSalary)) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-175 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("employees.editEmployee") : t("employees.addEmployee")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="personal">{t("employees.tabs.personal")}</TabsTrigger>
                <TabsTrigger value="contact">{t("employees.tabs.contact")}</TabsTrigger>
                <TabsTrigger value="employment">{t("employees.tabs.employment")}</TabsTrigger>
                <TabsTrigger value="qualifications">{t("employees.tabs.qualifications")}</TabsTrigger>
                <TabsTrigger value="additional">{t("employees.tabs.additional")}</TabsTrigger>
              </TabsList>

              {/* ─── Personal Tab ─── */}
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstNameAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.firstNameAr")}</FormLabel>
                        <FormControl><Input {...field} dir="rtl" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastNameAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.lastNameAr")}</FormLabel>
                        <FormControl><Input {...field} dir="rtl" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="firstNameEn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.firstNameEn")}</FormLabel>
                        <FormControl><Input {...field} dir="ltr" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastNameEn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.lastNameEn")}</FormLabel>
                        <FormControl><Input {...field} dir="ltr" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nationalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.nationalId")}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.gender")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MALE">{t("employees.genders.male")}</SelectItem>
                            <SelectItem value="FEMALE">{t("employees.genders.female")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.dateOfBirth")}</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* ─── Contact Tab ─── */}
              <TabsContent value="contact" className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employees.fields.email")}</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.phone")} ({t("common.optional")})</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.mobile")} ({t("common.optional")})</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* ─── Employment Tab ─── */}
              <TabsContent value="employment" className="space-y-4">
                {/* Salary range hint box */}
                {selectedGrade && (
                  <div
                    className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                    style={{
                      borderColor: selectedGrade.color || undefined,
                      backgroundColor: selectedGrade.color ? `${selectedGrade.color}15` : undefined,
                    }}
                  >
                    {selectedGrade.color && (
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedGrade.color }} />
                    )}
                    <div className="flex-1">
                      <span className="font-medium">{selectedGrade.nameAr}</span>
                      {selectedGrade.description && (
                        <span className="text-muted-foreground"> — {selectedGrade.description}</span>
                      )}
                    </div>
                    <div className="text-muted-foreground shrink-0">
                      {gradeMin.toLocaleString()} – {gradeMax.toLocaleString()}
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="jobTitleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employees.fields.jobTitle")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("employees.selectJobTitle")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {jobTitles.map((title: any) => (
                            <SelectItem key={title.id} value={title.id}>
                              {title.nameAr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="jobGradeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.jobGrade")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("employees.selectJobGrade")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {jobGrades.map((grade: any) => (
                              <SelectItem key={grade.id} value={grade.id}>
                                <span className="flex items-center gap-2">
                                  {grade.color && (
                                    <span
                                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                      style={{ backgroundColor: grade.color }}
                                    />
                                  )}
                                  {grade.nameAr}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="basicSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.basicSalary")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={0}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        {selectedGrade && (
                          <FormDescription className="text-xs">
                            {t("employees.form.allowedRange")}: {gradeMin.toLocaleString()} – {gradeMax.toLocaleString()}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employees.fields.department")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("employees.selectDepartment")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dept: any) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.nameAr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="managerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employees.form.directManager")} ({t("common.optional")})</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("employees.form.selectDirectManager")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allEmployees
                            .filter((emp: any) => emp.id !== employee?.id)
                            .map((emp: any) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.firstNameAr} {emp.lastNameAr}
                                {emp.jobTitle?.nameAr && (
                                  <span className="text-muted-foreground mr-2">— {emp.jobTitle.nameAr}</span>
                                )}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.hireDate")}</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contractType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.contractType")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="FIXED_TERM">{t("employees.contractTypes.fixed_term")}</SelectItem>
                            <SelectItem value="INDEFINITE">{t("employees.contractTypes.indefinite")}</SelectItem>
                            <SelectItem value="TEMPORARY">{t("employees.contractTypes.temporary")}</SelectItem>
                            <SelectItem value="TRAINEE">{t("employees.contractTypes.trainee")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="probationPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>فترة التجربة ({t("common.optional")})</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            <SelectItem value="ONE_MONTH">شهر</SelectItem>
                            <SelectItem value="TWO_MONTHS">شهران</SelectItem>
                            <SelectItem value="THREE_MONTHS">3 شهور</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isEdit && (
                    <FormField
                      control={form.control}
                      name="employmentStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("employees.fields.status")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ACTIVE">{t("employees.statuses.active")}</SelectItem>
                              <SelectItem value="INACTIVE">{t("employees.statuses.inactive")}</SelectItem>
                              <SelectItem value="ON_LEAVE">{t("employees.statuses.onLeave")}</SelectItem>
                              <SelectItem value="SUSPENDED">{t("employees.statuses.suspended")}</SelectItem>
                              <SelectItem value="TERMINATED">{t("employees.statuses.terminated")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="interviewEvaluation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تقييم المقابلة ({t("common.optional")})</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          <SelectItem value="EXCELLENT">ممتاز</SelectItem>
                          <SelectItem value="VERY_GOOD">جيد جداً</SelectItem>
                          <SelectItem value="GOOD">جيد</SelectItem>
                          <SelectItem value="ACCEPTABLE">مقبول</SelectItem>
                          <SelectItem value="POOR">ضعيف</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Allowances */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{t("employees.form.allowancesTitle")} ({t("common.optional")})</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setAllowances((a) => [...a, { type: "FOOD", amount: 0 }])}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("employees.form.addAllowance")}
                    </Button>
                  </div>
                  {allowances.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("employees.form.noAllowances")}</p>
                  ) : (
                    <div className="space-y-2">
                      {allowances.map((al, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Select
                            value={al.type}
                            onValueChange={(v) => setAllowances((a) => a.map((x, j) => j === i ? { ...x, type: v } : x))}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALLOWANCE_TYPES.map((at) => (
                                <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min={0}
                            className="w-32"
                            value={al.amount}
                            onChange={(e) => setAllowances((a) => a.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))}
                            placeholder={t("employees.form.amount")}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setAllowances((a) => a.filter((_, j) => j !== i))}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ─── Qualifications Tab ─── */}
              <TabsContent value="qualifications" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="educationLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.educationLevel")} ({t("common.optional")})</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("employees.selectEducationLevel")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            {["ILLITERATE", "PRIMARY", "SECONDARY", "DIPLOMA", "UNIVERSITY", "POSTGRADUATE"].map((el) => (
                              <SelectItem key={el} value={el}>{t(`employees.educationLevels.${el}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("educationLevel") === "UNIVERSITY" && (
                    <FormField
                      control={form.control}
                      name="universityYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("employees.fields.universityYear")} ({t("common.optional")})</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={7}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="yearsOfExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employees.form.yearsOfExperience")} ({t("common.optional")})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Certificate 1 */}
                <div className="rounded-lg border p-3 space-y-3">
                  <p className="text-sm font-medium">{t("employees.form.firstDegree")} ({t("common.optional")})</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="certificate1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("employees.form.degreeName")}</FormLabel>
                          <FormControl><Input {...field} placeholder={t("employees.form.bachelorPlaceholder")} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="specialization1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("employees.form.specialization")}</FormLabel>
                          <FormControl><Input {...field} placeholder={t("employees.form.hrPlaceholder")} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="certificateAttachment1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.form.attachment")}</FormLabel>
                        <FormControl>
                          <FilePicker value={field.value || ""} onChange={field.onChange} labels={filePickerLabels} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Certificate 2 */}
                <div className="rounded-lg border p-3 space-y-3">
                  <p className="text-sm font-medium">{t("employees.form.secondDegree")} ({t("common.optional")})</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="certificate2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("employees.form.degreeName")}</FormLabel>
                          <FormControl><Input {...field} placeholder={t("employees.form.masterPlaceholder")} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="specialization2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("employees.form.specialization")}</FormLabel>
                          <FormControl><Input {...field} placeholder={t("employees.form.pmPlaceholder")} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="certificateAttachment2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.form.attachment")}</FormLabel>
                        <FormControl>
                          <FilePicker value={field.value || ""} onChange={field.onChange} labels={filePickerLabels} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Training Certificates */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{t("employees.form.trainingCertificates")} ({t("common.optional")})</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setTrainingCertificates((a) => [...a, { name: "", attachmentUrl: "" }])}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("employees.form.addCertificate")}
                    </Button>
                  </div>
                  {trainingCertificates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("employees.form.noCertificates")}</p>
                  ) : (
                    <div className="space-y-2">
                      {trainingCertificates.map((cert, i) => (
                        <div key={i} className="rounded-lg border p-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              value={cert.name}
                              onChange={(e) => setTrainingCertificates((a) => a.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                              placeholder={t("employees.form.certificateName")}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => setTrainingCertificates((a) => a.filter((_, j) => j !== i))}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground shrink-0">{t("employees.form.attachmentOptional")}</span>
                            <FilePicker
                              value={cert.attachmentUrl || ""}
                              onChange={(url) => setTrainingCertificates((a) => a.map((x, j) => j === i ? { ...x, attachmentUrl: url } : x))}
                              labels={filePickerLabels}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ─── Additional Tab ─── */}
              <TabsContent value="additional" className="space-y-4">
                <FormField
                  control={form.control}
                  name="profilePhoto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employees.fields.profilePhoto")} ({t("common.optional")})</FormLabel>
                      <FormControl>
                        <PhotoPicker
                          value={field.value || ""}
                          onChange={field.onChange}
                          chooseLabel={t("employees.choosePhoto")}
                          removeLabel={t("common.remove")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bloodType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.bloodType")} ({t("common.optional")})</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("employees.selectBloodType")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            {["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"].map((bt) => (
                              <SelectItem key={bt} value={bt}>{t(`employees.bloodTypes.${bt}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="familyMembersCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.familyMembersCount")} ({t("common.optional")})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="currentAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employees.fields.currentAddress")} ({t("common.optional")})</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="religion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employees.fields.religion")} ({t("common.optional")})</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="chronicDiseases"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employees.fields.chronicDiseases")} ({t("common.optional")})</FormLabel>
                      <FormControl><Textarea {...field} rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isSmoker"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel className="cursor-pointer">{t("employees.fields.isSmoker")}</FormLabel>
                      <FormControl>
                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasDrivingLicense"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel className="cursor-pointer">رخصة قيادة</FormLabel>
                      <FormControl>
                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maritalStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الحالة الاجتماعية ({t("common.optional")})</FormLabel>
                      <Select value={field.value || ""} onValueChange={(v) => field.onChange(v || undefined)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الحالة الاجتماعية" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SINGLE">أعزب</SelectItem>
                          <SelectItem value="MARRIED">متزوج</SelectItem>
                          <SelectItem value="DIVORCED">مطلق</SelectItem>
                          <SelectItem value="WIDOWED">أرمل</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Attachments */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{t("employees.tabs.documents")} ({t("common.optional")})</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={attUploading}
                      onClick={() => attInputRef.current?.click()}
                    >
                      {attUploading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Plus className="h-3.5 w-3.5" />}
                      {t("employees.addAttachment")}
                    </Button>
                  </div>

                  <input
                    ref={attInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      e.target.value = "";
                      if (!files.length) return;
                      setAttUploading(true);
                      try {
                        await Promise.all(
                          files.map(async (file) => {
                            const fd = new FormData();
                            fd.append("file", file);
                            const res = await fetch("/api/upload", { method: "POST", body: fd });
                            if (!res.ok) throw new Error("Upload failed");
                            const { fileUrl, fileName } = await res.json();
                            setAttachments((a) => [...a, { fileUrl, fileName }]);
                          })
                        );
                      } catch {
                        toast.error(t("employees.form.uploadError"));
                      } finally {
                        setAttUploading(false);
                      }
                    }}
                  />

                  {attachments.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => !attUploading && attInputRef.current?.click()}
                    >
                      {attUploading
                        ? <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                        : <Paperclip className="h-8 w-8 text-muted-foreground" />}
                      <p className="text-sm text-muted-foreground">{t("employees.noAttachments")}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg border p-2">
                          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                          <p className="flex-1 text-sm font-medium truncate">{att.fileName}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-7 w-7"
                            onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
