"use client";

import { ReactNode } from "react";
import { usePermissions } from "@/lib/hooks/use-permissions";

interface Props {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

/**
 * مكون لحماية العناصر بناءً على الصلاحيات
 *
 * @example
 * ```tsx
 * // إخفاء زر إذا ما عنده صلاحية
 * <PermissionGuard permission="CREATE_EMPLOYEES">
 *   <Button>إضافة موظف</Button>
 * </PermissionGuard>
 *
 * // عرض نص بديل إذا ما عنده صلاحية
 * <PermissionGuard
 *   permission="VIEW_SALARY"
 *   fallback={<span>لا يمكن عرض الراتب</span>}
 * >
 *   <span>{employee.salary}</span>
 * </PermissionGuard>
 *
 * // عدة صلاحيات (يحتاج أي واحدة)
 * <PermissionGuard permissions={["EDIT_EMPLOYEES", "DELETE_EMPLOYEES"]}>
 *   <Button>تعديل أو حذف</Button>
 * </PermissionGuard>
 *
 * // عدة صلاحيات (يحتاج الكل)
 * <PermissionGuard
 *   permissions={["VIEW_EMPLOYEES", "EXPORT_DATA"]}
 *   requireAll={true}
 * >
 *   <Button>تصدير بيانات الموظفين</Button>
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
}: Props) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = usePermissions();

  // Admin يشوف كل شي
  if (isAdmin()) {
    return <>{children}</>;
  }

  let hasAccess = false;

  if (permission) {
    // صلاحية واحدة
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    // عدة صلاحيات
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  } else {
    // إذا ما في صلاحيات محددة، الكل يشوف
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
