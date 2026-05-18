"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCancelSalaryAdvance } from "@/lib/hooks/use-salary-advances";

const schema = z.object({
  reason: z.string().min(3, "يجب ذكر سبب الإلغاء"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advanceId: string;
}

export function CancelSalaryAdvanceDialog({ open, onOpenChange, advanceId }: Props) {
  const cancel = useCancelSalaryAdvance();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (open) form.reset({ reason: "" });
  }, [open]);

  const onSubmit = async (data: FormData) => {
    try {
      await cancel.mutateAsync({ id: advanceId, reason: data.reason });
      onOpenChange(false);
    } catch {
      // handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>إلغاء السلفة</DialogTitle>
          <DialogDescription>
            سيتم إيقاف خصم هذه السلفة من الرواتب القادمة.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>سبب الإلغاء</FormLabel>
                <FormControl><Textarea rows={3} placeholder="اذكر سبب الإلغاء..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                تراجع
              </Button>
              <Button type="submit" variant="destructive" disabled={cancel.isPending}>
                {cancel.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                إلغاء السلفة
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
