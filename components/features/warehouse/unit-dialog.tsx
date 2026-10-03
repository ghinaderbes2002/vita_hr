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
import { useCreateWarehouseUnit, useUpdateWarehouseUnit } from "@/lib/hooks/use-warehouse";
import { WarehouseUnit } from "@/lib/api/warehouse";
import { nullEmpty, omitEmpty } from "./utils";

interface UnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit?: WarehouseUnit;
}

export function UnitDialog({ open, onOpenChange, unit }: UnitDialogProps) {
  const t = useTranslations();
  const isEdit = !!unit;

  const createUnit = useCreateWarehouseUnit();
  const updateUnit = useUpdateWarehouseUnit();

  const formSchema = z.object({
    name: z.string().trim().min(1, t("warehouse.validation.required")),
    symbol: z.string(),
  });
  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", symbol: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ name: unit?.name ?? "", symbol: unit?.symbol ?? "" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit?.id, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await updateUnit.mutateAsync({ id: unit.id, dto: nullEmpty(data) });
      } else {
        await createUnit.mutateAsync(omitEmpty(data));
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const isLoading = createUnit.isPending || updateUnit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("warehouse.units.edit") : t("warehouse.units.add")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("warehouse.units.fields.name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("warehouse.units.fields.symbol")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
