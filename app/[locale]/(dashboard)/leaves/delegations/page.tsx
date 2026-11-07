"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { PageGuard } from "@/components/permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { getApiErrorMessage } from "@/lib/utils";
import { Delegation, DelegationStatus, delegationsApi } from "@/lib/api/delegations";

const LIMIT = 20;
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

const TABS: { value: DelegationStatus; label: string }[] = [
  { value: "ACTIVE", label: "نشطة" },
  { value: "UPCOMING", label: "قادمة" },
  { value: "ENDED", label: "منتهية" },
];

const STATUS_BADGE: Record<DelegationStatus, string> = {
  ACTIVE: "border-emerald-300 bg-emerald-50 text-emerald-700",
  UPCOMING: "border-sky-300 bg-sky-50 text-sky-700",
  ENDED: "border-slate-300 bg-slate-50 text-slate-600",
};

/** HR's view of leave delegations: who stands in for whom, and ending one early. */
export default function DelegationsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<DelegationStatus>("ACTIVE");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Delegation | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["delegations", status, page],
    queryFn: () => delegationsApi.list({ status, page, limit: LIMIT }),
    placeholderData: (prev) => prev,
  });
  const rows = data?.items ?? [];

  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => delegationsApi.revoke(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delegations"] });
      toast.success("تم إنهاء التفويض");
      setTarget(null);
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "تعذّر إنهاء التفويض")),
  });

  return (
    <PageGuard permission={PERMISSIONS.DELEGATIONS.MANAGE}>
      <div className="space-y-6">
        <PageHeader
          title="التفويضات"
          description="البدلاء الذين يحملون صلاحيات زملائهم خلال إجازاتهم"
          count={data?.total}
        />

        <div className="inline-flex rounded-lg border bg-muted/40 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setStatus(tab.value); setPage(1); }}
              aria-pressed={status === tab.value}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                status === tab.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-md border">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <EmptyState icon={<UserCheck className="h-8 w-8 text-muted-foreground" />} title="لا توجد تفويضات" />
          ) : (
            <Table dir="rtl">
              <TableHeader>
                <TableRow>
                  <TableHead>البديل</TableHead>
                  <TableHead>نيابة عن</TableHead>
                  <TableHead>من</TableHead>
                  <TableHead>إلى</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.delegateName}</TableCell>
                    <TableCell>
                      <p>{d.delegatorName}</p>
                      {d.delegatorJobTitle && <p className="text-xs text-muted-foreground">{d.delegatorJobTitle}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{fmt(d.from)}</TableCell>
                    <TableCell className="text-sm">{fmt(d.to)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_BADGE[d.status]}>
                        {TABS.find((tab) => tab.value === d.status)?.label ?? d.status}
                      </Badge>
                      {d.revokedAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          أُنهي يدوياً {fmt(d.revokedAt)}{d.revokeReason ? ` — ${d.revokeReason}` : ""}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.status !== "ENDED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => { setTarget(d); setReason(""); }}
                        >
                          إنهاء
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {(data?.totalPages ?? 1) > 1 && (
          <Pagination page={data!.page} totalPages={data!.totalPages} total={data!.total} limit={data!.limit} onPageChange={setPage} />
        )}

        <Dialog open={!!target} onOpenChange={(o) => { if (!o && !revoke.isPending) setTarget(null); }}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>إنهاء التفويض؟</DialogTitle>
            </DialogHeader>
            {target && (
              <p className="text-sm text-muted-foreground">
                سيفقد <b className="text-foreground">{target.delegateName}</b> صلاحيات{" "}
                <b className="text-foreground">{target.delegatorName}</b> فوراً، ويصل إشعار لكليهما.
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="revoke-reason">السبب (اختياري)</Label>
              <Textarea
                id="revoke-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثلاً: عاد الموظف من إجازته مبكراً"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTarget(null)} disabled={revoke.isPending}>إلغاء</Button>
              <Button
                variant="destructive"
                disabled={revoke.isPending}
                onClick={() => target && revoke.mutate({ id: target.id, reason: reason.trim() || undefined })}
              >
                {revoke.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                إنهاء التفويض
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageGuard>
  );
}
