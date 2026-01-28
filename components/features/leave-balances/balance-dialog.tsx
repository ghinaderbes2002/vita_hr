"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateLeaveBalance } from "@/lib/hooks/use-leave-balances";
import { useEmployees } from "@/lib/hooks/use-employees";
import { useLeaveTypes } from "@/lib/hooks/use-leave-types";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  employeeId: z.string().min(1, "الموظف مطلوب"),
  leaveTypeId: z.string().min(1, "نوع الإجازة مطلوب"),
  year: z.number().min(2020).max(2100),
  totalDays: z.number().min(0, "عدد الأيام يجب أن يكون 0 أو أكثر"),
});

type FormData = z.infer<typeof formSchema>;

interface BalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BalanceDialog({ open, onOpenChange }: BalanceDialogProps) {
  const t = useTranslations();
  const createBalance = useCreateLeaveBalance();
  const { data: employeesData } = useEmployees();
  const { data: leaveTypesData } = useLeaveTypes();

  // Helper function to extract array from various API response formats
  const extractArray = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data?.items)) return data.data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  };

  const employees = extractArray(employeesData);
  const leaveTypes = extractArray(leaveTypesData);

  console.log("employeesData:", employeesData, "=> employees:", employees);
  console.log("leaveTypesData:", leaveTypesData, "=> leaveTypes:", leaveTypes);

  const currentYear = new Date().getFullYear();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: "",
      leaveTypeId: "",
      year: currentYear,
      totalDays: 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        employeeId: "",
        leaveTypeId: "",
        year: currentYear,
        totalDays: 0,
      });
    }
  }, [open, form, currentYear]);

  const onSubmit = async (data: FormData) => {
    try {
      await createBalance.mutateAsync(data);
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("leaveBalances.addBalance")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("leaveBalances.fields.employee")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("leaveBalances.selectEmployee")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((emp: any) => (
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

            <FormField
              control={form.control}
              name="leaveTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("leaveBalances.fields.leaveType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("leaveBalances.selectLeaveType")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leaveTypes.map((type: any) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.nameAr}
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
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("leaveBalances.fields.year")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("leaveBalances.fields.totalDays")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={createBalance.isPending}>
                {createBalance.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                )}
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
