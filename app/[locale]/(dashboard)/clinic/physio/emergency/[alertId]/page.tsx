"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { clinicPhysioApi } from "@/lib/api/clinic-physio";
import { Loader2 } from "lucide-react";

export default function EmergencyAlertRedirectPage() {
  const router = useRouter();
  const locale = useLocale();
  const params = useParams();
  const alertId = params.alertId as string;

  const { data: alert, isError } = useQuery({
    queryKey: ["physio-alert", alertId],
    queryFn: () => clinicPhysioApi.getAlertById(alertId),
    enabled: !!alertId,
    retry: 1,
  });

  useEffect(() => {
    if (alert?.caseId) {
      router.replace(`/${locale}/clinic/physio/${alert.caseId}`);
    } else if (isError) {
      router.replace(`/${locale}/clinic/physio`);
    }
  }, [alert, isError, locale, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
