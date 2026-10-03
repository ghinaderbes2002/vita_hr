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
import { useCreateWarehouseSupplier, useUpdateWarehouseSupplier } from "@/lib/hooks/use-warehouse";
import { WarehouseSupplier } from "@/lib/api/warehouse";
import { nullEmpty, omitEmpty } from "./utils";

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: WarehouseSupplier;
}

export function SupplierDialog({ open, onOpenChange, supplier }: SupplierDialogProps) {
  const t = useTranslations();
  const isEdit = !!supplier;

  const createSupplier = useCreateWarehouseSupplier();
  const updateSupplier = useUpdateWarehouseSupplier();

  const formSchema = z.object({
    name: z.string().trim().min(1, t("warehouse.validation.required")),
    phone: z.string(),
    email: z.union([z.literal(""), z.email(t("warehouse.validation.email"))]),
    address: z.string(),
    isActive: z.boolean(),
  });
  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", phone: "", email: "", address: "", isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: supplier?.name ?? "",
      phone: supplier?.phone ?? "",
      email: supplier?.email ?? "",
      address: supplier?.address ?? "",
      isActive: supplier?.isActive ?? true,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplier?.id, form]);

  const onSubmit = async (data: FormData) => {
    const { isActive, ...rest } = data;
    try {
      if (isEdit) {
        await updateSupplier.mutateAsync({ id: supplier.id, dto: { ...nullEmpty(rest), isActive } });
      } else {
        await createSupplier.mutateAsync(omitEmpty(rest));
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const isLoading = createSupplier.isPending || updateSupplier.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("warehouse.suppliers.edit") : t("warehouse.suppliers.add")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("warehouse.suppliers.fields.name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("warehouse.suppliers.fields.phone")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("warehouse.suppliers.fields.email")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("warehouse.suppliers.fields.address")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-wrap gap-2 items-center justify-between rounded-lg border p-3">
                    <FormLabel className="cursor-pointer">{t("warehouse.suppliers.fields.isActive")}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

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
