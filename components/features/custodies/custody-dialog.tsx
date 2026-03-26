"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
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
import { useCreateCustody, useUpdateCustody } from "@/lib/hooks/use-custodies";
import { useEmployees } from "@/lib/hooks/use-employees";
import { Custody } from "@/types";

const CATEGORIES = ["ELECTRONICS", "FURNITURE", "VEHICLE", "TOOLS", "KEYS", "UNIFORM", "OTHER"] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  custody?: Custody;
  defaultEmployeeId?: string;
}

export function CustodyDialog({ open, onOpenChange, custody, defaultEmployeeId }: Props) {
  const t = useTranslations();
  const isEdit = !!custody;

  const formSchema = z.object({
    name: z.string().min(1, t("validation.required")),
    description: z.string().optional(),
    serialNumber: z.string().optional(),
    category: z.string().optional(),
    employeeId: z.string().min(1, t("validation.required")),
    assignedDate: z.string().min(1, t("validation.required")),
    notes: z.string().optional(),
  });

  type FormData = {
    name: string;
    description?: string;
    serialNumber?: string;
    category?: string;
    employeeId: string;
    assignedDate: string;
    notes?: string;
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      serialNumber: "",
      category: "OTHER",
      employeeId: defaultEmployeeId || "",
      assignedDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const { data: empData } = useEmployees({ limit: 100 });
  const employees: any[] = (empData as any)?.data?.items || (empData as any)?.items || [];

  const createCustody = useCreateCustody();
  const updateCustody = useUpdateCustody();

  useEffect(() => {
    if (open) {
      if (custody) {
        form.reset({
          name: custody.name,
          description: custody.description || "",
          serialNumber: custody.serialNumber || "",
          category: custody.category,
          employeeId: custody.employeeId,
          assignedDate: custody.assignedDate.split("T")[0],
          notes: custody.notes || "",
        });
      } else {
        form.reset({
          name: "",
          description: "",
          serialNumber: "",
          category: "OTHER",
          employeeId: defaultEmployeeId || "",
          assignedDate: new Date().toISOString().split("T")[0],
          notes: "",
        });
      }
    }
  }, [open, custody, defaultEmployeeId]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await updateCustody.mutateAsync({ id: custody.id, data });
      } else {
        await createCustody.mutateAsync(data);
      }
      onOpenChange(false);
    } catch {
      // handled by mutation
    }
  };

  const isLoading = createCustody.isPending || updateCustody.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("custodies.editCustody") : t("custodies.addCustody")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("custodies.fields.name")}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("custodies.fields.category")}</FormLabel>
                  <Select value={field.value || "OTHER"} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{t(`custodies.categories.${c}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="serialNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("custodies.fields.serialNumber")} ({t("common.optional")})</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {!defaultEmployeeId && (
              <FormField control={form.control} name="employeeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("custodies.fields.employee")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                    <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {employees.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstNameAr} {emp.lastNameAr}
                          {emp.employeeNumber && (
                            <span className="text-muted-foreground mr-2">— {emp.employeeNumber}</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="assignedDate" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("custodies.fields.assignedDate")}</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("custodies.fields.description")} ({t("common.optional")})</FormLabel>
                <FormControl><Textarea rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("custodies.fields.notes")} ({t("common.optional")})</FormLabel>
                <FormControl><Textarea rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
