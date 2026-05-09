"use client";

import { usePermissions } from "@/lib/hooks/use-permissions";
import type { PermissionName } from "@/lib/permissions/catalog";

interface FieldGuardProps {
  permission: PermissionName;
  /** ما يُعرض بدل القيمة لمن ليس له صلاحية. افتراضياً '*****' */
  fallback?: React.ReactNode;
  /** إذا true، يحذف الحقل تماماً بدل عرض fallback */
  hideEntirely?: boolean;
  children: React.ReactNode;
}

/** يخفي قيمة حقل واحد (مثل الراتب أو الرقم الوطني). */
export function FieldGuard({
  permission,
  fallback = "*****",
  hideEntirely = false,
  children,
}: FieldGuardProps) {
  const { hasPermission, isAdmin } = usePermissions();

  if (isAdmin() || hasPermission(permission)) return <>{children}</>;

  if (hideEntirely) return null;
  return <>{fallback}</>;
}
