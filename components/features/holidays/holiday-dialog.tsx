"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCreateHoliday, useUpdateHoliday } from "@/lib/hooks/use-holidays";
import { Holiday } from "@/types";

const formSchema = z.object({
  nameAr: z.string().min(1, "الاسم بالعربية مطلوب"),
  nameEn: z.string().min(1, "الاسم بالإنجليزية مطلوب"),
  date: z.date(),
  type: z.enum(["PUBLIC", "NATIONAL", "RELIGIOUS", "OTHER"]),
  isRecurring: z.boolean(),
  isActive: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface HolidayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holiday?: Holiday;
}

export function HolidayDialog({ open, onOpenChange, holiday }: HolidayDialogProps) {
  const t = useTranslations();
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nameAr: "",
      nameEn: "",
      date: new Date(),
      type: "PUBLIC",
      isRecurring: false,
      isActive: true,
    },
  });

  useEffect(() => {
    if (holiday) {
      form.reset({
        nameAr: holiday.nameAr,
        nameEn: holiday.nameEn,
        date: new Date(holiday.date),
        type: holiday.type,
        isRecurring: holiday.isRecurring,
        isActive: holiday.isActive !== false,
      });
    } else {
      form.reset({
        nameAr: "",
        nameEn: "",
        date: new Date(),
        type: "PUBLIC",
        isRecurring: false,
        isActive: true,
      });
    }
  }, [holiday, form]);

  const onSubmit = async (data: FormData) => {
    try {
      const formattedData = {
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        date: format(data.date, "yyyy-MM-dd"),
        type: data.type,
        isRecurring: data.isRecurring,
        ...(holiday && { isActive: data.isActive }),
      };

      if (holiday) {
        await updateHoliday.mutateAsync({ id: holiday.id, data: formattedData });
      } else {
        await createHoliday.mutateAsync(formattedData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving holiday:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {holiday ? t("holidays.editHoliday") : t("holidays.addHoliday")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nameAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("holidays.fields.nameAr")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>{t("holidays.fields.nameEn")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("holidays.fields.date")}</FormLabel>
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
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{t("holidays.fields.selectDate")}</span>
                          )}
                          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("holidays.fields.type")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("holidays.fields.selectType")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PUBLIC">{t("holidays.types.public")}</SelectItem>
                      <SelectItem value="NATIONAL">{t("holidays.types.national")}</SelectItem>
                      <SelectItem value="RELIGIOUS">{t("holidays.types.religious")}</SelectItem>
                      <SelectItem value="OTHER">{t("holidays.types.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("holidays.fields.isRecurring")}
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {holiday && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        {t("common.active")}
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createHoliday.isPending || updateHoliday.isPending}
              >
                {holiday ? t("common.save") : t("common.create")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
