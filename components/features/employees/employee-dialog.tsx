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
import { Camera, Loader2, Paperclip, Plus, Trash2, X } from "lucide-react";
// Camera and X already imported above

const formSchema = z.object({
  firstNameAr: z.string().min(2, "الاسم الأول بالعربية مطلوب"),
  lastNameAr: z.string().min(2, "الاسم الأخير بالعربية مطلوب"),
  firstNameEn: z.string().min(2, "الاسم الأول بالإنجليزية مطلوب"),
  lastNameEn: z.string().min(2, "الاسم الأخير بالإنجليزية مطلوب"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  nationalId: z.string().min(1, "رقم الهوية مطلوب"),
  gender: z.enum(["MALE", "FEMALE"]),
  dateOfBirth: z.string().min(1, "تاريخ الميلاد مطلوب"),
  departmentId: z.string().min(1, "القسم مطلوب"),
  hireDate: z.string().min(1, "تاريخ التعيين مطلوب"),
  contractType: z.enum(["PERMANENT", "CONTRACT", "TEMPORARY", "INTERN"]),
  employmentStatus: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"]).optional(),
  jobTitleId: z.string().optional(),
  jobGradeId: z.string().optional(),
  managerId: z.string().optional(),
  basicSalary: z.number().min(0).optional(),
  // Additional fields
  profilePhoto: z.string().optional(),
  bloodType: z.enum(["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"]).optional(),
  familyMembersCount: z.number().int().min(0).optional(),
  chronicDiseases: z.string().optional(),
  currentAddress: z.string().optional(),
  isSmoker: z.boolean().optional(),
  educationLevel: z.enum(["ILLITERATE", "PRIMARY", "SECONDARY", "DIPLOMA", "UNIVERSITY", "POSTGRADUATE"]).optional(),
  universityYear: z.number().int().min(1).max(7).optional(),
  religion: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

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

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee;
}

type Attachment = { fileUrl: string; fileName: string };

export function EmployeeDialog({ open, onOpenChange, employee }: EmployeeDialogProps) {
  const t = useTranslations();
  const isEdit = !!employee;
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attUploading, setAttUploading] = useState(false);
  const attInputRef = useRef<HTMLInputElement>(null);

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
      contractType: "PERMANENT",
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
    },
  });

  const toDateInput = (dateStr?: string) => {
    if (!dateStr) return "";
    return dateStr.substring(0, 10); // "2026-02-12T00:00:00.000Z" → "2026-02-12"
  };

  useEffect(() => {
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
        contractType: employee.contractType || "PERMANENT",
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
        educationLevel: (employee as any).educationLevel || undefined,
        universityYear: (employee as any).universityYear ?? undefined,
        religion: (employee as any).religion || "",
      });
      setAttachments((employee as any).attachments || []);
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
        contractType: "PERMANENT",
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
      });
      setAttachments([]);
    }
  }, [employee, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        // Send updatable fields only (exclude fixed fields like nationalId, dateOfBirth, hireDate)
        const updateData: Record<string, any> = {
          firstNameAr: data.firstNameAr,
          lastNameAr: data.lastNameAr,
          firstNameEn: data.firstNameEn,
          lastNameEn: data.lastNameEn,
          email: data.email,
          phone: data.phone || undefined,
          mobile: data.mobile || undefined,
          departmentId: data.departmentId,
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
          educationLevel: data.educationLevel || undefined,
          universityYear: data.universityYear ?? undefined,
          religion: data.religion || undefined,
          ...(attachments.length > 0 && { attachments }),
        };
        await updateEmployee.mutateAsync({ id: employee.id, data: updateData });
      } else {
        // Remove employmentStatus when creating (backend doesn't accept it)
        const { employmentStatus, ...rest } = data;
        const createData = {
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
          educationLevel: rest.educationLevel || undefined,
          universityYear: rest.universityYear ?? undefined,
          religion: rest.religion || undefined,
          ...(attachments.length > 0 && { attachments }),
        };
        await createEmployee.mutateAsync(createData);
      }
      onOpenChange(false);
      form.reset();
      setAttachments([]);
    } catch (error: any) {
      const errData = error?.response?.data;
      console.error("💥 Backend says:", JSON.stringify(errData, null, 2));
    }
  };

  const isLoading = createEmployee.isPending || updateEmployee.isPending;

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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">{t("employees.tabs.personal")}</TabsTrigger>
                <TabsTrigger value="contact">{t("employees.tabs.contact")}</TabsTrigger>
                <TabsTrigger value="employment">{t("employees.tabs.employment")}</TabsTrigger>
                <TabsTrigger value="additional">{t("employees.tabs.additional")}</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstNameAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("employees.fields.firstNameAr")}</FormLabel>
                        <FormControl>
                          <Input {...field} dir="rtl" />
                        </FormControl>
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
                        <FormControl>
                          <Input {...field} dir="rtl" />
                        </FormControl>
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
                        <FormControl>
                          <Input {...field} dir="ltr" />
                        </FormControl>
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
                        <FormControl>
                          <Input {...field} dir="ltr" />
                        </FormControl>
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
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
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
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
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
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employees.fields.email")}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
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
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
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
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="employment" className="space-y-4">
                {/* Job Grade Info Box */}
                {(() => {
                  const selectedGradeId = form.watch("jobGradeId");
                  const selectedGrade = jobGrades.find((g: any) => g.id === selectedGradeId);
                  if (!selectedGrade) return null;
                  return (
                    <div
                      className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                      style={{ borderColor: selectedGrade.color || undefined, backgroundColor: selectedGrade.color ? `${selectedGrade.color}15` : undefined }}
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
                        {Number(selectedGrade.minSalary).toLocaleString()} – {Number(selectedGrade.maxSalary).toLocaleString()}
                      </div>
                    </div>
                  );
                })()}

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
                              <span>{title.nameAr} ({title.code})</span>
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
                                  {grade.nameAr} ({grade.code})
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
                              {dept.nameAr} ({dept.code})
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
                      <FormLabel>المدير المباشر ({t("common.optional")})</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المدير المباشر" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allEmployees
                            .filter((emp: any) => emp.id !== employee?.id)
                            .map((emp: any) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.firstNameAr} {emp.lastNameAr}
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
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
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
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PERMANENT">{t("employees.contractTypes.permanent")}</SelectItem>
                            <SelectItem value="CONTRACT">{t("employees.contractTypes.contract")}</SelectItem>
                            <SelectItem value="TEMPORARY">{t("employees.contractTypes.temporary")}</SelectItem>
                            <SelectItem value="INTERN">{t("employees.contractTypes.intern")}</SelectItem>
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
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
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
              </TabsContent>

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
                  name="currentAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("employees.fields.currentAddress")} ({t("common.optional")})</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
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
                        toast.error("فشل رفع الملف");
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
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
