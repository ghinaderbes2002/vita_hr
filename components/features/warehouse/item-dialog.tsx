"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  useCreateWarehouseItem, useUpdateWarehouseItem,
  useWarehouseCategories, useWarehouseUnits,
} from "@/lib/hooks/use-warehouse";
import { WarehouseItem, WAREHOUSE_ITEM_TYPES } from "@/lib/api/warehouse";
import { localizedName, nullEmpty, omitEmpty, NONE } from "./utils";

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: WarehouseItem;
}

export function ItemDialog({ open, onOpenChange, item }: ItemDialogProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isEdit = !!item;

  const createItem = useCreateWarehouseItem();
  const updateItem = useUpdateWarehouseItem();
  const { data: categories = [] } = useWarehouseCategories();
  const { data: units = [] } = useWarehouseUnits();

  const formSchema = z.object({
    sku: z.string().trim().min(1, t("warehouse.validation.required")),
    partCode: z.string(),
    barcode: z.string(),
    name: z.string().trim().min(1, t("warehouse.validation.required")),
    nameAr: z.string(),
    itemType: z.enum(["COMPONENT", "CONSUMABLE", "SERVICE"]),
    categoryId: z.string(),
    unitId: z.string().min(1, t("warehouse.validation.required")),
    manufacturer: z.string(),
    // Kept as text so the field can be left blank; sent as a number.
    minStock: z.string().refine((v) => v.trim() === "" || Number(v) >= 0, t("warehouse.validation.nonNegative")),
    isActive: z.boolean(),
  });
  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sku: "", partCode: "", barcode: "", name: "", nameAr: "", itemType: "COMPONENT",
      categoryId: "", unitId: "", manufacturer: "", minStock: "", isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      sku: item?.sku ?? "",
      partCode: item?.partCode ?? "",
      barcode: item?.barcode ?? "",
      name: item?.name ?? "",
      nameAr: item?.nameAr ?? "",
      itemType: item?.itemType ?? "COMPONENT",
      categoryId: item?.categoryId ?? "",
      unitId: item?.unitId ?? "",
      manufacturer: item?.manufacturer ?? "",
      minStock: item?.minStock != null ? String(Number(item.minStock)) : "",
      isActive: item?.isActive ?? true,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id, form]);

  const onSubmit = async (data: FormData) => {
    const { isActive, minStock, ...rest } = data;
    const min = minStock.trim() !== "" ? Number(minStock) : null;
    try {
      if (isEdit) {
        await updateItem.mutateAsync({ id: item.id, dto: { ...nullEmpty(rest), minStock: min, isActive } });
      } else {
        await createItem.mutateAsync({ ...omitEmpty(rest), ...(min !== null ? { minStock: min } : {}) });
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const isLoading = createItem.isPending || updateItem.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("warehouse.items.edit") : t("warehouse.items.add")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("warehouse.items.fields.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>{t("warehouse.items.fields.nameAr")}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("warehouse.items.fields.sku")}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("warehouse.items.fields.barcode")}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="partCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("warehouse.items.fields.partCode")}</FormLabel>
                  <FormControl>
                    <Input {...field} dir="ltr" />
                  </FormControl>
                  <FormDescription>{t("warehouse.items.partCodeHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="itemType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("warehouse.items.fields.itemType")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WAREHOUSE_ITEM_TYPES.map((v) => (
                          <SelectItem key={v} value={v}>{t(`warehouse.items.types.${v}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("warehouse.items.fields.category")}</FormLabel>
                    <Select
                      value={field.value || NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>{t("warehouse.common.none")}</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{localizedName(c, locale)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("warehouse.items.fields.unit")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t("warehouse.items.selectUnit")} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}{u.symbol ? ` (${u.symbol})` : ""}
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
                name="minStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("warehouse.items.fields.minStock")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} step="any" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="manufacturer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("warehouse.items.fields.manufacturer")}</FormLabel>
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
                    <FormLabel className="cursor-pointer">{t("warehouse.items.fields.isActive")}</FormLabel>
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
