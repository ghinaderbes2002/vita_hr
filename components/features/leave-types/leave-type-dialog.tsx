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
import { useCreateLeaveType, useUpdateLeaveType } from "@/lib/hooks/use-leave-types";
import { LeaveType } from "@/types";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  code: z.string().min(1, "الكود مطلوب"),
  nameAr: z.string().min(1, "الاسم بالعربي مطلوب"),
  nameEn: z.string().min(1, "الاسم بالإنجليزي مطلوب"),
  defaultDays: z.number().min(0, "عدد الأيام يجب أن يكون 0 أو أكثر"),
  isPaid: z.boolean(),
  requiresApproval: z.boolean(),
  allowHalfDay: z.boolean(),
  color: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface LeaveTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveType?: LeaveType;
}

export function LeaveTypeDialog({ open, onOpenChange, leaveType }: LeaveTypeDialogProps) {
  const t = useTranslations();
  const isEdit = !!leaveType;

  const createLeaveType = useCreateLeaveType();
  const updateLeaveType = useUpdateLeaveType();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      nameAr: "",
      nameEn: "",
      defaultDays: 0,
      isPaid: true,
      requiresApproval: true,
      allowHalfDay: false,
      color: "#3B82F6",
    },
  });

  useEffect(() => {
    if (leaveType) {
      form.reset({
        code: leaveType.code,
        nameAr: leaveType.nameAr,
        nameEn: leaveType.nameEn,
        defaultDays: leaveType.defaultDays,
        isPaid: leaveType.isPaid,
        requiresApproval: leaveType.requiresApproval,
        allowHalfDay: leaveType.allowHalfDay,
        color: leaveType.color || "#3B82F6",
      });
    } else {
      form.reset({
        code: "",
        nameAr: "",
        nameEn: "",
        defaultDays: 0,
        isPaid: true,
        requiresApproval: true,
        allowHalfDay: false,
        color: "#3B82F6",
      });
    }
  }, [leaveType, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await updateLeaveType.mutateAsync({ id: leaveType.id, data });
      } else {
        await createLeaveType.mutateAsync(data);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createLeaveType.isPending || updateLeaveType.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("leaveTypes.editLeaveType") : t("leaveTypes.addLeaveType")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("leaveTypes.fields.code")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isEdit} placeholder="ANNUAL" />
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
                    <FormLabel>{t("leaveTypes.fields.nameAr")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="إجازة سنوية" />
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
                    <FormLabel>{t("leaveTypes.fields.nameEn")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Annual Leave" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="defaultDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("leaveTypes.fields.defaultDays")}</FormLabel>
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
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("leaveTypes.fields.color")}</FormLabel>
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
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="isPaid"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="cursor-pointer">{t("leaveTypes.fields.isPaid")}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresApproval"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="cursor-pointer">{t("leaveTypes.fields.requiresApproval")}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowHalfDay"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="cursor-pointer">{t("leaveTypes.fields.allowHalfDay")}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
