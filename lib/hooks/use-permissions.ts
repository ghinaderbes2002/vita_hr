import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Hook للتحقق من الصلاحيات بسهولة في المكونات
 */
export function usePermissions() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasAllPermissions = useAuthStore((state) => state.hasAllPermissions);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const permissions = useAuthStore((state) => state.permissions);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    permissions,
  };
}
