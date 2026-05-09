"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { usePermissions } from "@/lib/hooks/use-permissions";
import type { PermissionName } from "@/lib/permissions/catalog";

interface RouteGuardProps {
  permission?: PermissionName;
  permissions?: PermissionName[];
  requireAll?: boolean;
  redirectTo?: string;
  message?: string;
  children: React.ReactNode;
}

/** يحمي صفحة كاملة ويُحوّل المستخدم إذا ما عنده صلاحية. */
export function RouteGuard({
  permission,
  permissions,
  requireAll = false,
  redirectTo,
  message = "ليس لديك صلاحية للوصول إلى هذه الصفحة",
  children,
}: RouteGuardProps) {
  const router = useRouter();
  const locale = useLocale();
  const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = usePermissions();

  const allowed = (() => {
    if (isAdmin()) return true;
    if (permission) return hasPermission(permission);
    if (permissions && permissions.length > 0) {
      return requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
    }
    return true;
  })();

  useEffect(() => {
    if (!allowed) {
      toast.error(message);
      router.replace(redirectTo ?? `/${locale}/dashboard`);
    }
  }, [allowed, message, redirectTo, router, locale]);

  if (!allowed) return null;
  return <>{children}</>;
}
