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
import { useCreateWarehouseManufacturer, useUpdateWarehouseManufacturer } from "@/lib/hooks/use-warehouse";
import { WarehouseManufacturer } from "@/lib/api/warehouse";
import { nullEmpty, omitEmpty } from "./utils";

interface ManufacturerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manufacturer?: WarehouseManufacturer;
  /** Called with the new manufacturer after a create — lets the item form pick it straight away. */
  onCreated?: (manufacturer: WarehouseManufacturer) => void;
}

export function ManufacturerDialog({ open, onOpenChange, manufacturer, onCreated }: ManufacturerDialogProps) {
  const t = useTranslations();
  const isEdit = !!manufacturer;

  const create = useCreateWarehouseManufacturer();
  const update = useUpdateWarehouseManufacturer();

  const formSchema = z.object({
    name: z.string().trim().min(1, t("warehouse.validation.required")),
    nameAr: z.string(),
  });
  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", nameAr: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ name: manufacturer?.name ?? "", nameAr: manufacturer?.nameAr ?? "" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, manufacturer?.id, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await update.mutateAsync({ id: manufacturer.id, dto: nullEmpty(data) });
      } else {
        const created = await create.mutateAsync(omitEmpty(data));
        if (created?.id) onCreated?.(created);
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const isLoading = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("warehouse.manufacturers.edit") : t("warehouse.manufacturers.add")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          {/* Opened from inside the item form too — its own submit must not reach that form. */}
          <form onSubmit={(e) => { e.stopPropagation(); form.handleSubmit(onSubmit)(e); }} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("warehouse.manufacturers.fields.name")}</FormLabel>
                  <FormControl>
                    <Input {...field} dir="ltr" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nameAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("warehouse.manufacturers.fields.nameAr")}</FormLabel>
                  <FormControl>
                    <Input {...field} dir="rtl" />
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
