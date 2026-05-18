"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useUpdateOtherDeduction } from "@/lib/hooks/use-payroll";

const schema = z.object({
  amount: z.coerce.number().min(0, "يجب أن يكون المبلغ 0 أو أكبر"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payrollId: string;
  currentAmount?: number;
  currentNotes?: string;
}

export function AddOtherDeductionDialog({
  open,
  onOpenChange,
  payrollId,
  currentAmount = 0,
  currentNotes = "",
}: Props) {
  const update = useUpdateOtherDeduction();

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      amount: currentAmount,
      notes: currentNotes,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ amount: currentAmount, notes: currentNotes });
    }
  }, [open, currentAmount, currentNotes]);

  const onSubmit = async (data: FormData) => {
    try {
      await update.mutateAsync({
        payrollId,
        amount: data.amount,
        notes: data.notes || undefined,
      });
      onOpenChange(false);
    } catch {
      // handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>خصم إضافي</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>المبلغ ($)</FormLabel>
                <FormControl><Input type="number" min={0} step={0.01} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>الملاحظات (اختياري)</FormLabel>
                <FormControl><Textarea rows={2} placeholder="سبب الخصم..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                حفظ
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
