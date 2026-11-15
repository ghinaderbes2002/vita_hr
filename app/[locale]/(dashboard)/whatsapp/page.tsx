"use client";

// ربط رقم الشركة بواتساب لإرسال الإشعارات. الإرسال كله من الباك؛ هنا الحالة
// ورمز QR للمسح وإعادة الربط فقط.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2, LogOut, MessageCircle, QrCode, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { whatsappApi } from "@/lib/api/whatsapp";
import { apiErrorMessage } from "@/lib/api/api-errors";

const KEY = "whatsapp";

export default function WhatsappPage() {
  return (
    <PageGuard permission={PERMISSIONS.WHATSAPP.MANAGE}>
      <WhatsappContent />
    </PageGuard>
  );
}

function WhatsappContent() {
  const t = useTranslations("whatsapp");
  const qc = useQueryClient();
  const [confirmLogout, setConfirmLogout] = useState(false);

  // While unlinked, both are polled so the page flips to "connected" by itself after the scan.
  const status = useQuery({
    queryKey: [KEY, "status"],
    queryFn: whatsappApi.status,
    refetchInterval: (q) => (q.state.data?.connected ? 30_000 : 3_000),
  });
  const connected = !!status.data?.connected;
  const qr = useQuery({
    queryKey: [KEY, "qr"],
    queryFn: whatsappApi.qr,
    enabled: status.isSuccess && !connected,
    refetchInterval: 5_000,
  });

  const logout = useMutation({
    mutationFn: whatsappApi.logout,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(t("loggedOut"));
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, t("error"))),
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              {t("statusTitle")}
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("refresh")}
              onClick={() => qc.invalidateQueries({ queryKey: [KEY] })}>
              <RefreshCw className={`h-4 w-4 ${status.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {status.isLoading ? (
              <Skeleton className="h-10 w-40" />
            ) : status.isError ? (
              <p className="text-sm text-destructive">{apiErrorMessage(status.error, t("loadFailed"))}</p>
            ) : (
              <Badge
                variant="outline"
                className={connected
                  ? "gap-1.5 border-emerald-300 bg-emerald-50 px-3 py-1 text-sm text-emerald-700"
                  : "gap-1.5 border-amber-300 bg-amber-50 px-3 py-1 text-sm text-amber-800"}
              >
                <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
                {connected ? t("connected") : t("notConnected")}
              </Badge>
            )}
            <p className="text-sm text-muted-foreground">{connected ? t("connectedHint") : t("notConnectedHint")}</p>
            <p className="text-xs text-muted-foreground">{t("onlyNew")}</p>
            {connected && (
              <Button variant="outline" className="gap-2 text-destructive hover:text-destructive"
                disabled={logout.isPending} onClick={() => setConfirmLogout(true)}>
                {logout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                {t("logout")}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="h-5 w-5" />
              {t("qrTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connected ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-emerald-700">
                <CheckCircle2 className="h-12 w-12" />
                <p className="font-medium">{t("linked")}</p>
              </div>
            ) : (
              <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
                <div className="flex h-64 w-64 items-center justify-center rounded-xl border bg-white p-2">
                  {qr.isLoading || status.isLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : qr.data ? (
                    <img src={qr.data} alt="WhatsApp QR" className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 px-4 text-center text-sm text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      {t("waitingQr")}
                    </div>
                  )}
                </div>
                <ol className="list-decimal space-y-2 ps-5 text-sm">
                  <li className="flex-wrap"><Smartphone className="me-1 inline h-4 w-4" />{t("step1")}</li>
                  <li>{t("step2")}</li>
                  <li>{t("step3")}</li>
                  <li>{t("step4")}</li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title={t("logoutTitle")}
        description={t("logoutDescription")}
        onConfirm={() => { setConfirmLogout(false); logout.mutate(); }}
      />
    </div>
  );
}
