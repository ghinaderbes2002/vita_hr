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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateJobTitle, useUpdateJobTitle } from "@/lib/hooks/use-job-titles";
import { useJobGrades } from "@/lib/hooks/use-job-grades";
import { JobTitle } from "@/types";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  code: z.string().min(1),
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
  nameTr: z.string().optional(),
  description: z.string().optional(),
  gradeId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface JobTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle?: JobTitle;
}

export function JobTitleDialog({ open, onOpenChange, jobTitle }: JobTitleDialogProps) {
  const t = useTranslations();
  const isEdit = !!jobTitle;

  const createJobTitle = useCreateJobTitle();
  const updateJobTitle = useUpdateJobTitle();
  const { data: gradesData } = useJobGrades();

  const allGrades: any[] = Array.isArray(gradesData)
    ? gradesData
    : (gradesData as any)?.data?.items || (gradesData as any)?.data || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      nameAr: "",
      nameEn: "",
      nameTr: "",
      description: "",
      gradeId: undefined,
    },
  });

  useEffect(() => {
    if (jobTitle) {
      form.reset({
        code: jobTitle.code,
        nameAr: jobTitle.nameAr,
        nameEn: jobTitle.nameEn,
        nameTr: jobTitle.nameTr || "",
        description: jobTitle.description || "",
        gradeId: jobTitle.gradeId || undefined,
      });
    } else {
      form.reset({
        code: "",
        nameAr: "",
        nameEn: "",
        nameTr: "",
        description: "",
        gradeId: undefined,
      });
    }
  }, [jobTitle, form]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload: any = {
        code: data.code,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        ...(data.nameTr && { nameTr: data.nameTr }),
        ...(data.description && { description: data.description }),
        ...(data.gradeId && { gradeId: data.gradeId }),
      };
      if (isEdit) {
        await updateJobTitle.mutateAsync({ id: jobTitle.id, data: payload });
      } else {
        await createJobTitle.mutateAsync(payload);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createJobTitle.isPending || updateJobTitle.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("jobTitles.editTitle") : t("jobTitles.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("jobTitles.editDescription") : t("jobTitles.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("jobTitles.fields.code")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isEdit} placeholder="DEV" />
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
                    <FormLabel>{t("jobTitles.fields.nameAr")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("jobTitles.fields.nameAr")} />
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
                    <FormLabel>{t("jobTitles.fields.nameEn")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("jobTitles.fields.nameEn")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nameTr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("jobTitles.fields.nameTr")} ({t("common.optional")})</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("jobTitles.fields.nameTr")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gradeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("jobTitles.fields.grade")} ({t("common.optional")})</FormLabel>
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("jobTitles.selectGrade")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">{t("jobTitles.noGrade")}</SelectItem>
                      {allGrades.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.nameAr} ({g.code})
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("jobTitles.fields.description")} ({t("common.optional")})</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t("jobTitles.fields.description")} rows={3} />
                  </FormControl>
                  <FormMessage />
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
