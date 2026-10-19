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
import { WarehouseItem, WarehouseUnit } from "@/lib/api/warehouse";
import { localizedName, nullEmpty, omitEmpty, NONE } from "./utils";

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: WarehouseItem;
  /** Called with the new item after a create — lets a document form pick it straight away. */
  onCreated?: (item: WarehouseItem) => void;
  /** Starting name for a new item, e.g. what was typed into a search that found nothing. */
  defaultName?: string;
}

/**
 * The item code is no longer asked for, but the API still requires a unique
 * one: until it generates its own, a time-based code is sent — base36 of the
 * millisecond plus a random tail, so two saves can't collide. Existing items
 * keep theirs (an edit never sends it).
 */
const newSku = () =>
  `ITM-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

const DEFAULT_MIN_STOCK = "2";

/** The "piece" unit — a new item's default — by its name or symbol, Arabic or English. */
const defaultUnitId = (units: WarehouseUnit[]) =>
  units.find((u) =>
    /^(قطعة|قطعه|piece|pieces|pcs|pc)$/i.test(u.name.trim()) || /^(pcs|pc)$/i.test(u.symbol?.trim() ?? ""),
  )?.id ?? "";

export function ItemDialog({ open, onOpenChange, item, onCreated, defaultName }: ItemDialogProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isEdit = !!item;

  const createItem = useCreateWarehouseItem();
  const updateItem = useUpdateWarehouseItem();
  const { data: categories = [] } = useWarehouseCategories();
  const { data: units = [] } = useWarehouseUnits();

  const formSchema = z.object({
    partCode: z.string(),
    // Either name will do, but one is needed (checked below).
    name: z.string(),
    nameAr: z.string(),
    categoryId: z.string(),
    unitId: z.string().min(1, t("warehouse.validation.required")),
    manufacturer: z.string(),
    // Kept as text so the field can be left blank; sent as a number.
    minStock: z.string().refine((v) => v.trim() === "" || Number(v) >= 0, t("warehouse.validation.nonNegative")),
    isActive: z.boolean(),
  }).refine((d) => d.name.trim() !== "" || d.nameAr.trim() !== "", {
    message: t("warehouse.validation.nameRequired"),
    path: ["nameAr"],
  });
  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partCode: "", name: "", nameAr: "",
      categoryId: "", unitId: "", manufacturer: "", minStock: "", isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      partCode: item?.partCode ?? "",
      name: item?.name ?? defaultName ?? "",
      nameAr: item?.nameAr ?? "",
      categoryId: item?.categoryId ?? "",
      unitId: item?.unitId ?? defaultUnitId(units),
      manufacturer: item?.manufacturer ?? "",
      // A new item starts at the clinic's usual minimum of 2; an existing one keeps its own.
      minStock: item ? (item.minStock != null ? String(Number(item.minStock)) : "") : DEFAULT_MIN_STOCK,
      isActive: item?.isActive ?? true,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id, form]);

  // A new item defaults to "piece". The units can land after the dialog opens,
  // so the default is filled in then, unless a unit was already picked.
  useEffect(() => {
    if (!open || isEdit || form.getValues("unitId")) return;
    const piece = defaultUnitId(units);
    if (piece) form.setValue("unitId", piece);
  }, [open, isEdit, units, form]);

  const onSubmit = async (data: FormData) => {
    const { isActive, minStock, ...fields } = data;
    // The API still requires "name"; with only an Arabic name, that stands in.
    const rest = { ...fields, name: fields.name.trim() || fields.nameAr.trim() };
    const min = minStock.trim() !== "" ? Number(minStock) : null;
    try {
      if (isEdit) {
        await updateItem.mutateAsync({ id: item.id, dto: { ...nullEmpty(rest), minStock: min, isActive } });
      } else {
        const created = await createItem.mutateAsync({
          sku: newSku(), ...omitEmpty(rest), ...(min !== null ? { minStock: min } : {}),
        });
        if (created?.id) onCreated?.(created);
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
