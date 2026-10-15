"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
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
import { useCreateRole, useUpdateRolePermissions, usePermissions, useRole, useUpdateRole } from "@/lib/hooks/use-roles";
import { Role } from "@/types";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  displayNameAr: z.string().min(2, "الاسم بالعربية مطلوب"),
  displayNameEn: z.string().min(2, "الاسم بالإنجليزية مطلوب"),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value);

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role;
}

export function RoleDialog({ open, onOpenChange, role }: RoleDialogProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isEdit = !!role;

  const getPermissionLabel = (permission: any) => {
    if (locale === "ar" && permission.displayNameAr) return permission.displayNameAr;
    if (locale !== "ar" && permission.displayNameEn) return permission.displayNameEn;
    return permission.displayName || permission.name;
  };

  const getModuleLabel = (module: string) => {
    const key = `roles.modules.${module}`;
    try { return t(key as any); } catch { return module; }
  };

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const updateRolePermissions = useUpdateRolePermissions();
  const { data: permissionsData } = usePermissions();

  // Fetch full role data with permissions when editing
  const { data: fullRoleData } = useRole(role?.id || "");
  const roleToUse = isEdit ? fullRoleData : role;

  const permissions = useMemo(() => permissionsData ?? [], [permissionsData]);

  // الباك يرجّع صلاحيات الدور أحياناً كـ objects وأحياناً كأسماء نصية (نفس الحالة
  // المعالَجة في auth-store). بدون التطبيع كان `p.id` يساوي undefined فتتحول إلى
  // null داخل الـ payload ويرفضها التحقق كـ UUID.
  const idByName = useMemo(() => {
    const map = new Map<string, string>();
    permissions.forEach((p) => {
      if (p?.name && isUuid(p.id)) map.set(p.name, p.id);
    });
    return map;
  }, [permissions]);

  const toPermissionIds = (rolePermissions: any[] | undefined): string[] => {
    if (!rolePermissions) return [];
    return rolePermissions
      .map((p: any) => {
        if (isUuid(p)) return p;
        if (typeof p === "string") return idByName.get(p);
        if (isUuid(p?.id)) return p.id;
        if (isUuid(p?.permissionId)) return p.permissionId;
        return p?.name ? idByName.get(p.name) : undefined;
      })
      .filter(isUuid);
  };

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

  // Keyed on the record, not the object: the list behind this dialog refetches
  // in the background, and reset() was firing over half-typed input.
  useEffect(() => {
    if (roleToUse) {
      form.reset({
        name: roleToUse.name || "",
        displayNameAr: roleToUse.displayNameAr || "",
        displayNameEn: roleToUse.displayNameEn || "",
        description: roleToUse.description || "",
        permissionIds: toPermissionIds(roleToUse.permissions),
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
    // idByName لازم ضمن الاعتماديات: بذرة الصلاحيات تُحلّ عبره عند وصول القائمة
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleToUse?.id, form, idByName]);

  const onSubmit = async (data: FormData) => {
    // حارس: الباك يتحقق من permissionIds كـ UUIDs. أي قيمة غير صالحة تُسقط هنا
    // وتُطبع بدل أن ترجع 400 بلا معلومة عن القيمة المخالفة.
    const rawIds = data.permissionIds || [];
    const permissionIds = rawIds.filter(isUuid);
    if (permissionIds.length !== rawIds.length) {
      console.warn(
        "[role-dialog] تم إسقاط قيم غير صالحة من permissionIds:",
        rawIds.filter((id) => !isUuid(id))
      );
    }

    try {
      if (isEdit) {
        await Promise.all([
          updateRole.mutateAsync({
            id: role.id,
            data: {
              displayNameAr: data.displayNameAr,
              displayNameEn: data.displayNameEn,
              description: data.description,
            },
          }),
          updateRolePermissions.mutateAsync({
            id: role.id,
            data: { permissionIds },
          })
        ]);
      } else {
        // For create, send all data
        await createRole.mutateAsync({ ...data, permissionIds });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createRole.isPending || updateRolePermissions.isPending || updateRole.isPending;

  const [permSearch, setPermSearch] = useState("");

  // Group permissions by module (with search filter)
  const filteredPermissions = permSearch.trim()
    ? permissions.filter((p) => {
        const q = permSearch.toLowerCase();
        const label = getPermissionLabel(p).toLowerCase();
        const module = getModuleLabel(p.module || "other").toLowerCase();
        const name = p.name?.toLowerCase() ?? "";
        return label.includes(q) || module.includes(q) || name.includes(q);
      })
    : permissions;

  const groupedPermissions = filteredPermissions.reduce((acc: any, permission) => {
    const module = permission.module || "other";
    if (!acc[module]) acc[module] = [];
    acc[module].push(permission);
    return acc;
  }, {});
  // Modules as collapsible sections sorted by their label. With hundreds of
  // permissions in one flat list, a module far down (المواعيد) was only
  // reachable by searching for it.
  const moduleEntries = (Object.entries(groupedPermissions) as [string, any[]][])
    .sort(([a], [b]) => getModuleLabel(a).localeCompare(getModuleLabel(b), locale));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleModule = (module: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module); else next.add(module);
      return next;
    });
  // A search opens every section it matched, so the hits are visible at once.
  const isSearching = !!permSearch.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90dvh] overflow-hidden flex flex-col">
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
                    <Input {...field} dir="rtl" />
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
                    <Input {...field} dir="ltr" />
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
                    <Textarea {...field} />
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
                    <div className="flex flex-wrap gap-2 items-center justify-between">
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
                    <div className="relative mb-2">
                      <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="بحث في الصلاحيات..."
                        value={permSearch}
                        onChange={(e) => setPermSearch(e.target.value)}
                        className="pr-8"
                        dir="rtl"
                      />
                    </div>
                    <ScrollArea className="h-[360px] rounded-md border">
                      {moduleEntries.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">لا توجد صلاحيات مطابقة</p>
                      )}
                      {moduleEntries.map(([module, perms]) => {
                        const selected: string[] = form.watch("permissionIds") ?? [];
                        const ids = perms.map((p: any) => p.id);
                        const selectedCount = ids.filter((id: string) => selected.includes(id)).length;
                        const allOn = selectedCount === ids.length;
                        const open = isSearching || expanded.has(module);
                        return (
                        <div key={module} className="border-b last:border-b-0">
                          <div className="flex items-center gap-2 bg-muted/40 px-3 py-2">
                            <Checkbox
                              aria-label={`تحديد كل صلاحيات ${getModuleLabel(module)}`}
                              checked={allOn ? true : selectedCount > 0 ? "indeterminate" : false}
                              onCheckedChange={() =>
                                form.setValue(
                                  "permissionIds",
                                  allOn
                                    ? selected.filter((id) => !ids.includes(id))
                                    : Array.from(new Set([...selected, ...ids])),
                                  { shouldDirty: true },
                                )
                              }
                            />
                            <button
                              type="button"
                              onClick={() => toggleModule(module)}
                              className="flex flex-1 items-center justify-between gap-2 text-start"
                            >
                              <span className="text-sm font-semibold">{getModuleLabel(module)}</span>
                              <span className="flex items-center gap-2">
                                <span className={`text-xs tabular-nums ${selectedCount ? "text-primary font-medium" : "text-muted-foreground"}`}>
                                  {selectedCount}/{ids.length}
                                </span>
                                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                              </span>
                            </button>
                          </div>
                          {open && (
                          <div className="space-y-2 px-4 py-3 mr-4">
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
                                          {getPermissionLabel(permission)}
                                        </FormLabel>
                                      </div>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                          )}
                        </div>
                        );
                      })}
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
