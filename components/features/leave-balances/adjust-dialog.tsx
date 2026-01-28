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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAdjustLeaveBalance } from "@/lib/hooks/use-leave-balances";
import { LeaveBalance } from "@/lib/api/leave-balances";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  adjustmentDays: z.number(),
  reason: z.string().min(1, "السبب مطلوب"),
});

type FormData = z.infer<typeof formSchema>;

interface AdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: LeaveBalance | null;
}

export function AdjustDialog({ open, onOpenChange, balance }: AdjustDialogProps) {
  const t = useTranslations();
  const adjustBalance = useAdjustLeaveBalance();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      adjustmentDays: 0,
      reason: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        adjustmentDays: 0,
        reason: "",
      });
    }
  }, [open, form]);

  const onSubmit = async (data: FormData) => {
    if (!balance) return;
    try {
      await adjustBalance.mutateAsync({
        balanceId: balance.id,
        data,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("leaveBalances.adjustBalance")}</DialogTitle>
        </DialogHeader>
        {balance && (
          <div className="bg-muted p-3 rounded-lg mb-4">
            <p className="text-sm">
              <strong>{t("leaveBalances.fields.employee")}:</strong>{" "}
              {balance.employee?.firstNameAr} {balance.employee?.lastNameAr}
            </p>
            <p className="text-sm">
              <strong>{t("leaveBalances.fields.leaveType")}:</strong>{" "}
              {balance.leaveType?.nameAr}
            </p>
            <p className="text-sm">
              <strong>{t("leaveBalances.fields.remainingDays")}:</strong>{" "}
              {balance.remainingDays} {t("common.days")}
            </p>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="adjustmentDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("leaveBalances.fields.adjustmentDays")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t("leaveBalances.adjustmentHint")}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("leaveBalances.fields.reason")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
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
              <Button type="submit" disabled={adjustBalance.isPending}>
                {adjustBalance.isPending && (
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
