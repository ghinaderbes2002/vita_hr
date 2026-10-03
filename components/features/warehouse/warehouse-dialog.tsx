"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCreateWarehouse, useUpdateWarehouse } from "@/lib/hooks/use-warehouse";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { Warehouse, WAREHOUSE_TYPES } from "@/lib/api/warehouse";
import { nullEmpty, omitEmpty } from "./utils";

interface WarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse;
}

export function WarehouseDialog({ open, onOpenChange, warehouse }: WarehouseDialogProps) {
  const t = useTranslations();
  const isEdit = !!warehouse;
  const [managerOpen, setManagerOpen] = useState(false);

  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const { data: employees = [] } = useEmployeesBasicList();

  const formSchema = z.object({
    code: z.string().trim().min(1, t("warehouse.validation.required")),
    name: z.string().trim().min(1, t("warehouse.validation.required")),
    type: z.enum(["MAIN", "QUARANTINE", "OTHER"]),
    location: z.string(),
    managerEmployeeId: z.string(),
    isActive: z.boolean(),
  });
  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: "", name: "", type: "MAIN", location: "", managerEmployeeId: "", isActive: true },
  });

  // Keyed on the record, not the object: the list behind this dialog refetches
  // in the background, and reset() would fire over half-typed input.
  useEffect(() => {
    if (!open) return;
    form.reset({
      code: warehouse?.code ?? "",
      name: warehouse?.name ?? "",
      type: warehouse?.type ?? "MAIN",
      location: warehouse?.location ?? "",
      managerEmployeeId: warehouse?.managerEmployeeId ?? "",
      isActive: warehouse?.isActive ?? true,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, warehouse?.id, form]);

  const onSubmit = async (data: FormData) => {
    const { isActive, ...rest } = data;
    try {
      if (isEdit) {
        await updateWarehouse.mutateAsync({ id: warehouse.id, dto: { ...nullEmpty(rest), isActive } });
      } else {
        await createWarehouse.mutateAsync(omitEmpty(rest));
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const isLoading = createWarehouse.isPending || updateWarehouse.isPending;
  const type = form.watch("type");
  const employeeLabel = (e: (typeof employees)[number]) =>
    `${e.firstNameAr} ${e.lastNameAr}${e.employeeNumber ? ` — ${e.employeeNumber}` : ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("warehouse.warehouses.edit") : t("warehouse.warehouses.add")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("warehouse.warehouses.fields.code")}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="ltr" />
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
                    <FormLabel>{t("warehouse.warehouses.fields.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("warehouse.warehouses.fields.type")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WAREHOUSE_TYPES.map((v) => (
                        <SelectItem key={v} value={v}>{t(`warehouse.warehouses.types.${v}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {type === "QUARANTINE" && (
                    <FormDescription>{t("warehouse.warehouses.quarantineHint")}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("warehouse.warehouses.fields.location")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="managerEmployeeId"
              render={({ field }) => {
                const selected = employees.find((e) => e.id === field.value);
                return (
                  <FormItem>
                    <FormLabel>{t("warehouse.warehouses.fields.manager")}</FormLabel>
                    <Popover open={managerOpen} onOpenChange={setManagerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={managerOpen}
                            className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground")}
                          >
                            <span className="truncate">
                              {selected ? employeeLabel(selected) : t("warehouse.warehouses.selectManager")}
                            </span>
                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t("warehouse.warehouses.searchManager")} />
                          <CommandList>
                            <CommandEmpty>{t("warehouse.warehouses.noEmployees")}</CommandEmpty>
                            <CommandGroup>
                              {employees.map((e) => (
                                <CommandItem
                                  key={e.id}
                                  value={employeeLabel(e)}
                                  onSelect={() => {
                                    // Picking the selected keeper again clears it.
                                    field.onChange(e.id === field.value ? "" : e.id);
                                    setManagerOpen(false);
                                  }}
                                >
                                  <Check className={cn("h-4 w-4", e.id === field.value ? "opacity-100" : "opacity-0")} />
                                  {employeeLabel(e)}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {isEdit && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-wrap gap-2 items-center justify-between rounded-lg border p-3">
                    <FormLabel className="cursor-pointer">{t("warehouse.warehouses.fields.isActive")}</FormLabel>
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
