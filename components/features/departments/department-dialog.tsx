"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateDepartment, useUpdateDepartment, useDepartmentTree } from "@/lib/hooks/use-departments";
import { Department } from "@/types";
import { Loader2 } from "lucide-react";

interface DepartmentWithChildren extends Department {
  children?: DepartmentWithChildren[];
}

const formSchema = z.object({
  code: z.string().min(1, "الكود مطلوب"),
  nameAr: z.string().min(2, "الاسم بالعربية مطلوب"),
  nameEn: z.string().min(2, "الاسم بالإنجليزية مطلوب"),
  nameTr: z.string().min(2, "الاسم بالتركية مطلوب"),
  parentId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department;
}

export function DepartmentDialog({ open, onOpenChange, department }: DepartmentDialogProps) {
  const t = useTranslations();
  const isEdit = !!department;

  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const { data: treeData } = useDepartmentTree();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      nameAr: "",
      nameEn: "",
      nameTr: "",
      parentId: "",
    },
  });

  useEffect(() => {
    if (department) {
      form.reset({
        code: department.code || "",
        nameAr: department.nameAr || "",
        nameEn: department.nameEn || "",
        nameTr: department.nameTr || "",
        parentId: department.parentId || "",
      });
    } else {
      form.reset({
        code: "",
        nameAr: "",
        nameEn: "",
        nameTr: "",
        parentId: "",
      });
    }
  }, [department, form]);

  const onSubmit = async (data: FormData) => {
    try {
      const submitData = {
        code: data.code,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        nameTr: data.nameTr,
        ...(data.parentId && { parentId: data.parentId }),
      };

      if (isEdit) {
        await updateDepartment.mutateAsync({ id: department.id, data: submitData });
      } else {
        await createDepartment.mutateAsync(submitData);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createDepartment.isPending || updateDepartment.isPending;

  // Flatten tree for parent selection
  const flattenTree = (departments: DepartmentWithChildren[] = []): DepartmentWithChildren[] => {
    let result: DepartmentWithChildren[] = [];
    for (const dept of departments) {
      result.push(dept);
      if (dept.children) {
        result = result.concat(flattenTree(dept.children));
      }
    }
    return result;
  };

  const availableParents = flattenTree((treeData as DepartmentWithChildren[]) || []).filter(d => d.id !== department?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("departments.editDepartment") : t("departments.addDepartment")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("departments.fields.code")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isEdit} />
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
                  <FormLabel>{t("departments.fields.nameAr")}</FormLabel>
                  <FormControl>
                    <Input {...field} dir="rtl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nameEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("departments.fields.nameEn")}</FormLabel>
                  <FormControl>
                    <Input {...field} dir="ltr" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nameTr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("departments.fields.nameTr")}</FormLabel>
                  <FormControl>
                    <Input {...field} dir="ltr" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("departments.fields.parent")} ({t("common.optional")})</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value || undefined)}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("departments.noParent")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableParents.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.nameAr} ({dept.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
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
