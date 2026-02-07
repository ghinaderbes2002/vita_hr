"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { toast } from "sonner";

/**
 * Higher Order Component لحماية الصفحات بناءً على الصلاحيات
 *
 * @param Component - المكون المراد حمايته
 * @param requiredPermission - الصلاحية المطلوبة (string أو string[])
 * @param options - خيارات إضافية
 *
 * @example
 * ```tsx
 * // حماية بصلاحية واحدة
 * export default withPermission(EmployeesPage, "VIEW_EMPLOYEES");
 *
 * // حماية بعدة صلاحيات (يحتاج أي واحدة منها)
 * export default withPermission(
 *   AttendancePage,
 *   ["VIEW_MY_ATTENDANCE", "VIEW_ALL_ATTENDANCE"]
 * );
 *
 * // حماية مع رسالة مخصصة
 * export default withPermission(
 *   EmployeesPage,
 *   "VIEW_EMPLOYEES",
 *   { message: "ليس لديك صلاحية لعرض الموظفين" }
 * );
 * ```
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: string | string[],
  options?: {
    message?: string;
    redirectTo?: string;
    requireAll?: boolean; // إذا كان true، يحتاج كل الصلاحيات. default: false (يحتاج أي واحدة)
  }
) {
  return function ProtectedComponent(props: P) {
    const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = usePermissions();
    const router = useRouter();

    useEffect(() => {
      // Admin يقدر يوصل لكل شي
      if (isAdmin()) return;

      let hasAccess = false;

      if (Array.isArray(requiredPermission)) {
        // إذا في عدة صلاحيات
        if (options?.requireAll) {
          // يحتاج كل الصلاحيات
          hasAccess = hasAllPermissions(requiredPermission);
        } else {
          // يحتاج أي صلاحية من القائمة
          hasAccess = hasAnyPermission(requiredPermission);
        }
      } else {
        // صلاحية واحدة فقط
        hasAccess = hasPermission(requiredPermission);
      }

      if (!hasAccess) {
        // عرض رسالة خطأ
        const message = options?.message || "ليس لديك صلاحية للوصول لهذه الصفحة";
        toast.error(message);

        // إعادة التوجيه
        const redirectTo = options?.redirectTo || "/dashboard";
        router.push(redirectTo);
      }
    }, [hasPermission, hasAnyPermission, hasAllPermissions, isAdmin, router]);

    // Admin يعرض المكون مباشرة
    if (isAdmin()) {
      return <Component {...props} />;
    }

    // التحقق من الصلاحية
    let hasAccess = false;

    if (Array.isArray(requiredPermission)) {
      if (options?.requireAll) {
        hasAccess = hasAllPermissions(requiredPermission);
      } else {
        hasAccess = hasAnyPermission(requiredPermission);
      }
    } else {
      hasAccess = hasPermission(requiredPermission);
    }

    // إذا ما عنده صلاحية، ما نعرض شي
    if (!hasAccess) {
      return null;
    }

    // عرض المكون
    return <Component {...props} />;
  };
}
