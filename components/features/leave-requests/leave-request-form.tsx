"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useLeaveTypes } from "@/lib/hooks/use-leave-types";
import { useEmployees } from "@/lib/hooks/use-employees";
import { CreateLeaveRequestData, LeaveRequest } from "@/lib/api/leave-requests";

const formSchema = z.object({
  leaveTypeId: z.string().min(1, "نوع الإجازة مطلوب"),
  startDate: z.date(),
  endDate: z.date(),
  reason: z.string().min(5, "السبب يجب أن يكون 5 أحرف على الأقل"),
  isHalfDay: z.boolean(),
  halfDayPeriod: z.enum(["MORNING", "AFTERNOON"]).optional(),
  substituteId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface LeaveRequestFormProps {
  onSubmit: (data: CreateLeaveRequestData) => Promise<void>;
  initialData?: LeaveRequest;
  isLoading?: boolean;
}

export function LeaveRequestForm({ onSubmit, initialData, isLoading }: LeaveRequestFormProps) {
  const t = useTranslations();
  const { data: leaveTypesData } = useLeaveTypes();
  const { data: employeesData } = useEmployees();

  // Helper function to extract array
  const extractArray = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data?.items)) return data.data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  };

  const leaveTypes = extractArray(leaveTypesData);
  const employees = extractArray(employeesData);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leaveTypeId: initialData?.leaveTypeId || "",
      startDate: initialData?.startDate ? new Date(initialData.startDate) : undefined,
      endDate: initialData?.endDate ? new Date(initialData.endDate) : undefined,
      reason: initialData?.reason || "",
      isHalfDay: initialData?.isHalfDay || false,
      halfDayPeriod: initialData?.halfDayPeriod || undefined,
      substituteId: initialData?.substituteId || "",
    },
  });

  const isHalfDay = form.watch("isHalfDay");

  const handleSubmit = async (data: FormData) => {
    const submitData: CreateLeaveRequestData = {
      leaveTypeId: data.leaveTypeId,
      startDate: format(data.startDate, "yyyy-MM-dd"),
      endDate: format(data.endDate, "yyyy-MM-dd"),
      reason: data.reason,
      isHalfDay: data.isHalfDay,
      halfDayPeriod: data.isHalfDay ? data.halfDayPeriod : undefined,
      substituteId: data.substituteId || undefined,
    };

    await onSubmit(submitData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="leaveTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("leaves.fields.leaveType")}</FormLabel>
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("leaves.fields.startDate")}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-right font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>اختر التاريخ</span>}
                        <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("leaves.fields.endDate")}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-right font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>اختر التاريخ</span>}
                        <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isHalfDay"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>نصف يوم</FormLabel>
                <FormDescription>هل تريد طلب نصف يوم فقط؟</FormDescription>
              </div>
            </FormItem>
          )}
        />

        {isHalfDay && (
          <FormField
            control={form.control}
            name="halfDayPeriod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>فترة نصف اليوم</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفترة" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MORNING">صباحي</SelectItem>
                    <SelectItem value="AFTERNOON">مسائي</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="substituteId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("leaves.fields.substitute")} {t("common.optional")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر البديل" />
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
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("leaves.fields.reason")}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} placeholder="اكتب سبب الإجازة..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
