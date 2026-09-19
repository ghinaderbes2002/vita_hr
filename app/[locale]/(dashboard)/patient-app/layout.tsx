"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePermissions } from "@/lib/hooks/use-permissions";

/** المسارات المفتوحة لمن يملك صلاحيتها رغم قفل القسم على الأدمن. */
const OPEN_PATHS = ["/patient-app/chat"];

/**
 * مؤقت: قسم التطبيق للأدمن فقط ريثما يُعتمد (القسم مخفي أيضاً من الشريط
 * الجانبي بـ adminOnly) — ما عدا المسارات أعلاه. عند فتحه للجميع احذف هذا
 * الملف — كل صفحة محمية أصلاً بصلاحيتها.
 */
export default function PatientAppLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("patientApp.common");
  const { isAdmin } = usePermissions();
  const pathname = usePathname();
  const isOpenPath = OPEN_PATHS.some((p) => pathname?.includes(p));

  if (!isAdmin() && !isOpenPath) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-lg text-muted-foreground">{t("notAuthorized")}</p>
      </div>
    );
  }

  return <>{children}</>;
}
