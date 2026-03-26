"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useReturnCustody } from "@/lib/hooks/use-custodies";
import { Custody } from "@/types";

const RETURN_STATUSES = ["RETURNED", "DAMAGED", "LOST"] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  custody: Custody | null;
}

export function ReturnCustodyDialog({ open, onOpenChange, custody }: Props) {
  const t = useTranslations();

  const formSchema = z.object({
    status: z.enum(RETURN_STATUSES),
    returnedDate: z.string().optional(),
    notes: z.string().optional(),
  });

  type FormData = {
    status: "RETURNED" | "DAMAGED" | "LOST";
    returnedDate?: string;
    notes?: string;
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "RETURNED",
      returnedDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const returnCustody = useReturnCustody();

  useEffect(() => {
    if (open) {
      form.reset({
        status: "RETURNED",
        returnedDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
    }
  }, [open]);

  const onSubmit = async (data: FormData) => {
    if (!custody) return;
    try {
      await returnCustody.mutateAsync({ id: custody.id, data });
      onOpenChange(false);
    } catch {
      // handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("custodies.return.title")}</DialogTitle>
          {custody && (
            <DialogDescription className="font-medium text-foreground">
              {custody.name}
            </DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("custodies.return.status")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {RETURN_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`custodies.statuses.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="returnedDate" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("custodies.return.returnedDate")} ({t("common.optional")})</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("custodies.return.notes")} ({t("common.optional")})</FormLabel>
                <FormControl><Textarea rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={returnCustody.isPending}>
                {returnCustody.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
