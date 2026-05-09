"use client";

import { usePermissions } from "@/lib/hooks/use-permissions";
import type { PermissionName } from "@/lib/permissions/catalog";

interface PageGuardProps {
  permission?: PermissionName;
  permissions?: PermissionName[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

function NotAuthorizedView() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <p className="text-lg text-muted-foreground">ليس لديك صلاحية لرؤية هذا المحتوى</p>
    </div>
  );
}

/** يخفي محتوى الصفحة ويعرض fallback (مفيد داخل layouts أو modals). */
export function PageGuard({
  permission,
  permissions,
  requireAll = false,
  fallback = <NotAuthorizedView />,
  children,
}: PageGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = usePermissions();

  if (isAdmin()) return <>{children}</>;

  const allowed = permission
    ? hasPermission(permission)
    : permissions
    ? requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
    : true;

  return allowed ? <>{children}</> : <>{fallback}</>;
}
