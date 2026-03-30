"use client";

import { useEffect, useRef, useState } from "react";
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
import { Loader2, Paperclip, X, ImageIcon } from "lucide-react";
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

type FormData = {
  name: string;
  description?: string;
  serialNumber?: string;
  category?: string;
  employeeId: string;
  assignedDate: string;
  notes?: string;
};

export function CustodyDialog({ open, onOpenChange, custody, defaultEmployeeId }: Props) {
  const t = useTranslations();
  const isEdit = !!custody;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<{ fileName: string; fileUrl: string }[]>([]);

  const formSchema = z.object({
    name: z.string().min(1, t("validation.required")),
    description: z.string().optional(),
    serialNumber: z.string().optional(),
    category: z.string().optional(),
    employeeId: z.string().min(1, t("validation.required")),
    assignedDate: z.string().min(1, t("validation.required")),
    notes: z.string().optional(),
  });

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

  const resetForm = (keepEmployee = false) => {
    const currentEmployee = form.getValues("employeeId");
    form.reset({
      name: "",
      description: "",
      serialNumber: "",
      category: "OTHER",
      employeeId: keepEmployee ? currentEmployee : (defaultEmployeeId || ""),
      assignedDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setAttachments([]);
  };

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
        setAttachments((custody as any).attachments || []);
      } else {
        resetForm(false);
      }
    }
  }, [open, custody, defaultEmployeeId]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          { fileName: file.name, fileUrl: reader.result as string },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const submitData = async (data: FormData) => {
    const payload: any = { ...data };
    if (attachments.length > 0) {
      payload.attachments = attachments.map((a) => ({ fileUrl: a.fileUrl, fileName: a.fileName }));
    }
    if (isEdit) {
      await updateCustody.mutateAsync({ id: custody.id, data: payload });
    } else {
      await createCustody.mutateAsync(payload);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      await submitData(data);
      onOpenChange(false);
    } catch {
      // handled by mutation
    }
  };

  const onSubmitAndAddAnother = async (data: FormData) => {
    try {
      await submitData(data);
      resetForm(true);
    } catch {
      // handled by mutation
    }
  };

  const isLoading = createCustody.isPending || updateCustody.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("custodies.editCustody") : t("custodies.addCustody")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4">
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

            {/* Attachments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">المرفقات ({t("common.optional")})</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  إضافة صور
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFiles}
                />
              </div>

              {attachments.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="relative group rounded-lg border overflow-hidden bg-muted aspect-square">
                      {att.fileUrl.startsWith("data:image") || att.fileUrl.startsWith("http") ? (
                        <img src={att.fileUrl} alt={att.fileName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate w-full text-center">{att.fileName}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="absolute top-1 left-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              {!isEdit && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isLoading}
                  onClick={form.handleSubmit(onSubmitAndAddAnother)}
                >
                  {isLoading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                  حفظ وإضافة أخرى
                </Button>
              )}
              <Button type="button" disabled={isLoading} onClick={form.handleSubmit(onSubmit)}>
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
