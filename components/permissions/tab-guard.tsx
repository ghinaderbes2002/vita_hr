"use client";

import { usePermissions } from "@/lib/hooks/use-permissions";
import type { PermissionName } from "@/lib/permissions/catalog";

interface TabGuardProps {
  permission?: PermissionName;
  permissions?: PermissionName[];
  requireAll?: boolean;
  children: React.ReactNode;
}

/** يخفي tab كامل من tabs navigation إذا ما عنده صلاحية. */
export function TabGuard({
  permission,
  permissions,
  requireAll = false,
  children,
}: TabGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = usePermissions();

  if (isAdmin()) return <>{children}</>;

  const allowed = permission
    ? hasPermission(permission)
    : permissions
    ? requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
    : true;

  return allowed ? <>{children}</> : null;
}

export type { TabGuardProps };
