"use client";

import { useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateEmployee, useUpdateEmployee } from "@/lib/hooks/use-employees";
import { useDepartments } from "@/lib/hooks/use-departments";
import { useJobGrades } from "@/lib/hooks/use-job-grades";
import { useJobTitles } from "@/lib/hooks/use-job-titles";
import { Employee } from "@/types";
import { Loader2 } from "lucide-react";

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
  basicSalary: z.number().min(0).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee;
}

export function EmployeeDialog({ open, onOpenChange, employee }: EmployeeDialogProps) {
  const t = useTranslations();
  const isEdit = !!employee;

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const { data: departmentsData } = useDepartments({ limit: 100 });
  const { data: gradesData } = useJobGrades();
  const { data: titlesData } = useJobTitles();

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
      basicSalary: 0,
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
        basicSalary: Number((employee as any).basicSalary) || 0,
      });
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
        basicSalary: 0,
      });
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
          phone: data.phone,
          mobile: data.mobile,
          departmentId: data.departmentId,
          employmentStatus: data.employmentStatus,
          jobTitleId: data.jobTitleId || undefined,
          jobGradeId: data.jobGradeId || undefined,
          basicSalary: data.basicSalary || undefined,
        };
        console.log("📤 Sending updateData:", updateData);
        await updateEmployee.mutateAsync({ id: employee.id, data: updateData });
      } else {
        // Remove employmentStatus when creating (backend doesn't accept it)
        const { employmentStatus, ...rest } = data;
        const createData = {
          ...rest,
          jobTitleId: rest.jobTitleId || undefined,
          jobGradeId: rest.jobGradeId || undefined,
          basicSalary: rest.basicSalary || undefined,
        };
        await createEmployee.mutateAsync(createData);
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      const errData = error?.response?.data;
      console.error("💥 Backend says:", JSON.stringify(errData, null, 2));
    }
  };

  const isLoading = createEmployee.isPending || updateEmployee.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("employees.editEmployee") : t("employees.addEmployee")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">{t("employees.tabs.personal")}</TabsTrigger>
                <TabsTrigger value="contact">{t("employees.tabs.contact")}</TabsTrigger>
                <TabsTrigger value="employment">{t("employees.tabs.employment")}</TabsTrigger>
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
