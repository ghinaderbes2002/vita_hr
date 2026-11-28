import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";

/**
 * Whether the user may export clinic case PDFs (case, full physio, gait,
 * pledge, orthotics and podiatry forms). The PDFs are built in the browser, so
 * this only hides the buttons; no API is behind it.
 */
export function useCanExportClinicPdf(): boolean {
  const { hasPermission, isAdmin } = usePermissions();
  return isAdmin() || hasPermission(PERMISSIONS.CLINIC_CASES.EXPORT_PDF);
}
