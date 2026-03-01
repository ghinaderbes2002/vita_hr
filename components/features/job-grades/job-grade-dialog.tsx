"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCreateJobGrade, useUpdateJobGrade } from "@/lib/hooks/use-job-grades";
import { JobGrade } from "@/lib/api/job-grades";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  code: z.string().min(1, "الكود مطلوب"),
  nameAr: z.string().min(1, "الاسم بالعربي مطلوب"),
  nameEn: z.string().min(1, "الاسم بالإنجليزي مطلوب"),
  description: z.string().optional(),
  color: z.string().optional(),
  minSalary: z.number().min(0, "الراتب الأدنى يجب أن يكون 0 أو أكثر"),
  maxSalary: z.number().min(0, "الراتب الأقصى يجب أن يكون 0 أو أكثر"),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface JobGradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobGrade?: JobGrade;
}

export function JobGradeDialog({ open, onOpenChange, jobGrade }: JobGradeDialogProps) {
  const t = useTranslations();
  const isEdit = !!jobGrade;

  const createJobGrade = useCreateJobGrade();
  const updateJobGrade = useUpdateJobGrade();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      nameAr: "",
      nameEn: "",
      description: "",
      color: "#3B82F6",
      minSalary: 0,
      maxSalary: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (jobGrade) {
      form.reset({
        code: jobGrade.code,
        nameAr: jobGrade.nameAr,
        nameEn: jobGrade.nameEn,
        description: jobGrade.description || "",
        color: jobGrade.color || "#3B82F6",
        minSalary: Number(jobGrade.minSalary),
        maxSalary: Number(jobGrade.maxSalary),
        isActive: jobGrade.isActive,
      });
    } else {
      form.reset({
        code: "",
        nameAr: "",
        nameEn: "",
        description: "",
        color: "#3B82F6",
        minSalary: 0,
        maxSalary: 0,
        isActive: true,
      });
    }
  }, [jobGrade, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await updateJobGrade.mutateAsync({ id: jobGrade.id, data });
      } else {
        await createJobGrade.mutateAsync(data);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createJobGrade.isPending || updateJobGrade.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("jobGrades.editGrade") : t("jobGrades.addGrade")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("jobGrades.editDescription") : t("jobGrades.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("jobGrades.fields.code")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isEdit} placeholder={t("jobGrades.placeholders.code")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nameAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("jobGrades.fields.nameAr")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("jobGrades.placeholders.nameAr")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("jobGrades.fields.nameEn")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("jobGrades.placeholders.nameEn")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("jobGrades.fields.description")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t("jobGrades.placeholders.description")} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("jobGrades.fields.minSalary")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min={0}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("jobGrades.fields.maxSalary")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min={0}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("jobGrades.fields.color")}</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input {...field} type="color" className="w-14 h-10 p-1 cursor-pointer" />
                      <Input {...field} placeholder="#3B82F6" className="flex-1" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">{t("jobGrades.fields.isActive")}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
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
