"use client";

import { Lock } from "lucide-react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import type { PermissionName } from "@/lib/permissions/catalog";

interface ActionGuardProps {
  permission?: PermissionName;
  permissions?: PermissionName[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  /** إذا true، يعرض المحتوى معطّل بدل إخفائه */
  showDisabled?: boolean;
  /** نص يظهر على hover عند الإخفاء/التعطيل */
  disabledReason?: string;
  children: React.ReactNode;
}

/** يحمي زراً أو إجراءً واحداً بناءً على الصلاحية. */
export function ActionGuard({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  showDisabled = false,
  disabledReason = "ليس لديك صلاحية لهذا الإجراء",
  children,
}: ActionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = usePermissions();

  if (isAdmin()) return <>{children}</>;

  const allowed = permission
    ? hasPermission(permission)
    : permissions
    ? requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
    : true;

  if (allowed) return <>{children}</>;

  if (showDisabled) {
    return (
      <span
        className="inline-flex items-center gap-1 opacity-50 cursor-not-allowed pointer-events-none"
        title={disabledReason}
      >
        {children}
        <Lock className="h-3 w-3" />
      </span>
    );
  }

  return <>{fallback}</>;
}

export type { ActionGuardProps };
