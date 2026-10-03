"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCreateWarehouseCurrency } from "@/lib/hooks/use-warehouse";

interface CurrencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Create only — the API has no endpoint for editing a currency.
export function CurrencyDialog({ open, onOpenChange }: CurrencyDialogProps) {
  const t = useTranslations();
  const createCurrency = useCreateWarehouseCurrency();

  const formSchema = z.object({
    code: z.string().trim().min(1, t("warehouse.validation.required")),
    name: z.string().trim().min(1, t("warehouse.validation.required")),
    isBaseCurrency: z.boolean(),
  });
  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: "", name: "", isBaseCurrency: false },
  });

  useEffect(() => {
    if (open) form.reset({ code: "", name: "", isBaseCurrency: false });
  }, [open, form]);

  const onSubmit = async (data: FormData) => {
    try {
      await createCurrency.mutateAsync({ ...data, code: data.code.toUpperCase() });
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t("warehouse.currencies.add")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("warehouse.currencies.fields.code")}</FormLabel>
                  <FormControl>
                    <Input {...field} dir="ltr" placeholder="USD" className="uppercase" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("warehouse.currencies.fields.name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isBaseCurrency"
              render={({ field }) => (
                <FormItem className="flex flex-wrap gap-2 items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">{t("warehouse.currencies.fields.isBaseCurrency")}</FormLabel>
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
              <Button type="submit" disabled={createCurrency.isPending}>
                {createCurrency.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
