"use client";

import { usePermissions } from "@/lib/hooks/use-permissions";

/**
 * مؤقت: قسم التطبيق للأدمن فقط ريثما يُعتمد (القسم مخفي أيضاً من الشريط
 * الجانبي بـ adminOnly). عند فتحه للجميع احذف هذا الملف — كل صفحة محمية
 * أصلاً بصلاحيتها.
 */
export default function PatientAppLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = usePermissions();

  if (!isAdmin()) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-lg text-muted-foreground">ليس لديك صلاحية لرؤية هذا المحتوى</p>
      </div>
    );
  }

  return <>{children}</>;
}
