"use client";

import { useLocale, useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { PageGuard } from "@/components/permissions/page-guard";
import { TAXONOMY_KINDS, TaxonomyTab } from "@/components/patient-app/taxonomy-tab";
import { PERMISSIONS } from "@/lib/permissions/catalog";

export default function PatientAppTaxonomyPage() {
  const locale = useLocale();
  const t = useTranslations("patientApp.taxonomy");

  return (
    <PageGuard permission={PERMISSIONS.PATIENT_APP.MANAGE_TAXONOMY}>
      <div className="space-y-4">
        <PageHeader title={t("title")} description={t("description")} />

        {/* Radix Tabs sets dir="ltr" on its root unless told otherwise, which flips the whole tab body. */}
        <Tabs defaultValue={TAXONOMY_KINDS[0].kind} dir={locale === "ar" ? "rtl" : "ltr"}>
          <div className="overflow-x-auto">
            <TabsList>
              {TAXONOMY_KINDS.map((k) => (
                <TabsTrigger key={k.kind} value={k.kind}>{t(`kinds.${k.key}.label`)}</TabsTrigger>
              ))}
            </TabsList>
          </div>
          {TAXONOMY_KINDS.map((k) => (
            <TabsContent key={k.kind} value={k.kind} className="mt-4">
              <TaxonomyTab kind={k.kind} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </PageGuard>
  );
}
