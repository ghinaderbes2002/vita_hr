"use client";

import { Lock } from "lucide-react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import type { PermissionName } from "@/lib/permissions/catalog";

interface SectionGuardProps {
  permission?: PermissionName;
  permissions?: PermissionName[];
  requireAll?: boolean;
  hideHeader?: boolean;
  showLockIcon?: boolean;
  lockedMessage?: string;
  children: React.ReactNode;
}

/** يخفي قسم داخل صفحة (accordion، modal section). */
export function SectionGuard({
  permission,
  permissions,
  requireAll = false,
  hideHeader: _hideHeader = false,
  showLockIcon = false,
  lockedMessage = "هذا القسم محظور",
  children,
}: SectionGuardProps) {
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

  if (showLockIcon) {
    return (
      <div className="flex items-center justify-center gap-2 p-6 text-muted-foreground border border-dashed rounded-lg">
        <Lock className="h-4 w-4" />
        <span className="text-sm">{lockedMessage}</span>
      </div>
    );
  }

  return null;
}
