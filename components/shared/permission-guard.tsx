"use client";

import { ReactNode } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

interface Props {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

export function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
}: Props) {
  const { user } = useAuthStore();
  const userPerms = user?.permissions || [];

  let hasAccess = false;

  if (permission) {
    hasAccess = userPerms.includes(permission);
  } else if (permissions) {
    hasAccess = requireAll
      ? permissions.every((p) => userPerms.includes(p))
      : permissions.some((p) => userPerms.includes(p));
  } else {
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
