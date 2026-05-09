import { useAuthStore } from "@/lib/stores/auth-store";
import type { PermissionName } from "@/lib/permissions/catalog";
import type { RoleName } from "@/lib/permissions/roles";

/**
 * نوع مرن: يقترح أسماء PERMISSIONS في الـ IDE،
 * لكنه يسمح بالـ strings للتوافق مع الكود القديم.
 */
type Permission = PermissionName | (string & {});
type Role = RoleName | (string & {});

interface AccessConfig {
  permissions?: Permission[];
  roles?: Role[];
  /** 'any' = OR (default), 'all' = AND للصلاحيات */
  mode?: "any" | "all";
}

/**
 * Hook موحد للتحقق من الصلاحيات والأدوار.
 *
 * الأمثلة:
 * - `hasPermission(PERMISSIONS.USERS.READ)` — صلاحية واحدة type-safe
 * - `hasAnyPermission([...])` — أي صلاحية من قائمة (OR)
 * - `hasAllPermissions([...])` — كل الصلاحيات (AND)
 * - `canAccess({ permissions, roles, mode })` — تركيب صلاحيات + أدوار
 * - `canManageUsers()` — helpers على مستوى الـ module
 */
export function usePermissions() {
  const permissions = useAuthStore((s) => s.permissions);
  const hasPermissionRaw = useAuthStore((s) => s.hasPermission);
  const hasAnyPermissionRaw = useAuthStore((s) => s.hasAnyPermission);
  const hasAllPermissionsRaw = useAuthStore((s) => s.hasAllPermissions);
  const hasRoleRaw = useAuthStore((s) => s.hasRole);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const hasPermission = (permission: Permission) => hasPermissionRaw(permission);
  const hasAnyPermission = (perms: Permission[]) => hasAnyPermissionRaw(perms);
  const hasAllPermissions = (perms: Permission[]) => hasAllPermissionsRaw(perms);
  const hasRole = (role: Role) => hasRoleRaw(role);

  const canAccess = (config: AccessConfig): boolean => {
    if (isAdmin()) return true;

    const permsOk = !config.permissions
      ? true
      : config.mode === "all"
      ? hasAllPermissionsRaw(config.permissions)
      : hasAnyPermissionRaw(config.permissions);

    const rolesOk = !config.roles
      ? true
      : config.roles.some((r) => hasRoleRaw(r));

    return permsOk && rolesOk;
  };

  // Module-level helpers
  const canManageUsers = () =>
    hasAnyPermissionRaw(["users:read", "users:create", "users:update", "users:delete"]);
  const canManageLeaves = () =>
    hasAnyPermissionRaw(["leave_requests:read_all", "leave_requests:approve_hr"]);
  const canManagePayroll = () =>
    hasAnyPermissionRaw(["attendance.payroll.generate", "attendance.payroll.confirm"]);

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isAdmin,
    canAccess,
    canManageUsers,
    canManageLeaves,
    canManagePayroll,
  };
}
