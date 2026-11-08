import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";

/**
 * Whether the signed-in user may see (and set) an employee's pay: basic salary,
 * daily wage, allowances, salary changes, advances and commissions. Tied to the
 * payroll read permission — the same one that already guards the salary on the
 * employee profile — so a role can manage employees without seeing what they earn.
 */
export function useCanSeeSalary(): boolean {
  const { hasPermission, isAdmin } = usePermissions();
  return isAdmin() || hasPermission(PERMISSIONS.ATTENDANCE_PAYROLL.READ);
}
