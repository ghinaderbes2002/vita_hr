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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateRole, useUpdateRolePermissions, usePermissions, useRole } from "@/lib/hooks/use-roles";
import { Role } from "@/types";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  displayNameAr: z.string().min(2, "الاسم بالعربية مطلوب"),
  displayNameEn: z.string().min(2, "الاسم بالإنجليزية مطلوب"),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role;
}

export function RoleDialog({ open, onOpenChange, role }: RoleDialogProps) {
  const t = useTranslations();
  const isEdit = !!role;

  const createRole = useCreateRole();
  const updateRolePermissions = useUpdateRolePermissions();
  const { data: permissionsData } = usePermissions();

  // Fetch full role data with permissions when editing
  const { data: fullRoleData } = useRole(role?.id || "");
  const roleToUse = isEdit ? fullRoleData : role;

  const permissions = permissionsData || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      displayNameAr: "",
      displayNameEn: "",
      description: "",
      permissionIds: [],
    },
  });

  useEffect(() => {
    if (roleToUse) {
      form.reset({
        name: roleToUse.name || "",
        displayNameAr: roleToUse.displayNameAr || "",
        displayNameEn: roleToUse.displayNameEn || "",
        description: roleToUse.description || "",
        permissionIds: roleToUse.permissions?.map((p) => p.id) || [],
      });
    } else {
      form.reset({
        name: "",
        displayNameAr: "",
        displayNameEn: "",
        description: "",
        permissionIds: [],
      });
    }
  }, [roleToUse, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        // For edit, only update permissions
        await updateRolePermissions.mutateAsync({
          id: role.id,
          data: { permissionIds: data.permissionIds || [] },
        });
      } else {
        // For create, send all data
        await createRole.mutateAsync(data);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createRole.isPending || updateRolePermissions.isPending;

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc: any, permission) => {
    const module = permission.module || "other";
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("roles.editRole") : t("roles.addRole")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 px-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("roles.fields.name")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isEdit} dir="ltr" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayNameAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("roles.fields.displayNameAr")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isEdit} dir="rtl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayNameEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("roles.fields.displayNameEn")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isEdit} dir="ltr" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("roles.fields.description")} ({t("common.optional")})</FormLabel>
                  <FormControl>
                    <Textarea {...field} disabled={isEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissionIds"
              render={() => {
                const allPermissionIds = permissions.map(p => p.id);

                const handleSelectAll = () => {
                  form.setValue("permissionIds", allPermissionIds);
                };

                const handleDeselectAll = () => {
                  form.setValue("permissionIds", []);
                };

                return (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{t("roles.fields.permissions")}</FormLabel>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAll}
                        >
                          {t("roles.selectAll")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDeselectAll}
                        >
                          {t("roles.deselectAll")}
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-[200px] rounded-md border p-4">
                      {Object.entries(groupedPermissions).map(([module, perms]: [string, any]) => (
                        <div key={module} className="mb-4">
                          <h4 className="font-semibold mb-2 text-sm capitalize">{module}</h4>
                          <div className="space-y-2 mr-4">
                            {perms.map((permission: any) => (
                              <FormField
                                key={permission.id}
                                control={form.control}
                                name="permissionIds"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={permission.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(permission.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), permission.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== permission.id
                                                  )
                                                );
                                          }}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          {permission.displayName}
                                        </FormLabel>
                                      </div>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                );
              }}
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
