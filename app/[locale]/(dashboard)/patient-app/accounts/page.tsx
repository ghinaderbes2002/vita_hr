"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Plus, Search, Settings2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { PageGuard } from "@/components/permissions/page-guard";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PatientName, patientFullName } from "@/components/patient-app/patient-picker";
import { CreateAccountDialog } from "@/components/patient-app/create-account-dialog";
import { ACCOUNT_STATUS, ManageAccountDialog } from "@/components/patient-app/manage-account-dialog";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePatientAppAccounts } from "@/lib/hooks/use-patient-app";
import type { PatientAppAccountListItem, PatientAppAccountStatus } from "@/lib/api/patient-app";

const LIMIT = 15;
const ALL = "__all__";

const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short", hour12: true }) : "—";

const accountPatientName = (a: PatientAppAccountListItem) =>
  a.patient ? patientFullName(a.patient) : <PatientName id={a.erpPatientId} />;

export default function PatientAppAccountsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<PatientAppAccountStatus | typeof ALL>(ALL);
  const [createOpen, setCreateOpen] = useState(false);
  const [managing, setManaging] = useState<PatientAppAccountListItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setTerm(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = usePatientAppAccounts({
    page,
    limit: LIMIT,
    search: term || undefined,
    status: status !== ALL ? status : undefined,
  });
  const endpointMissing = (error as any)?.response?.status === 404;
  const accounts = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <PageGuard permission={PERMISSIONS.PATIENT_APP.MANAGE_ACCOUNT}>
      <div className="space-y-4">
        <PageHeader
          title="حسابات التطبيق"
          description="حسابات دخول المرضى إلى تطبيق العلاج الفيزيائي"
          actions={
            <ActionGuard permission={PERMISSIONS.PATIENT_APP.MANAGE_ACCOUNT}>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                إنشاء حساب
              </Button>
            </ActionGuard>
          }
        />

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في المرضى أصحاب الحسابات بالاسم أو الهاتف أو اسم المستخدم..."
              className="pr-9"
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>جميع الحالات</SelectItem>
              {(Object.keys(ACCOUNT_STATUS) as PatientAppAccountStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{ACCOUNT_STATUS[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {endpointMissing ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">قائمة الحسابات غير متاحة بعد</p>
              <p>
                عرض الحسابات والبحث فيها بانتظار إضافة <span dir="ltr" className="font-mono">GET /patient-app/accounts</span> من
                الباك. إنشاء الحسابات يعمل من زر «إنشاء حساب».
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المريض</TableHead>
                    <TableHead>اسم المستخدم</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ الإنشاء</TableHead>
                    <TableHead>آخر دخول</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <EmptyState
                          icon={<Smartphone className="h-8 w-8 text-muted-foreground" />}
                          title={term ? "لا يوجد مريض له حساب بهذا البحث" : "لا توجد حسابات بعد"}
                          description="أنشئ حساباً لمريض من زر «إنشاء حساب»"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((a) => {
                      const style = ACCOUNT_STATUS[a.status] ?? ACCOUNT_STATUS.INACTIVE;
                      return (
                        <TableRow key={a.id}>
                          <TableCell>
                            <p className="font-medium">{accountPatientName(a)}</p>
                            {a.patient?.patientNumber && (
                              <p className="text-xs text-muted-foreground" dir="ltr">#{a.patient.patientNumber}</p>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm" dir="ltr">{a.username}</TableCell>
                          <TableCell className="text-sm" dir="ltr">{a.patient?.phone ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${style.className}`}>{style.label}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground" dir="ltr">
                            {fmtDateTime(a.createdAt)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground" dir="ltr">
                            {fmtDateTime(a.lastLoginAt)}
                          </TableCell>
                          <TableCell>
                            <ActionGuard permission={PERMISSIONS.PATIENT_APP.MANAGE_ACCOUNT}>
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                title="إدارة الحساب"
                                onClick={() => setManaging(a)}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                            </ActionGuard>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
            )}
          </>
        )}

        <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />

        <ManageAccountDialog
          account={managing}
          patientName={managing ? accountPatientName(managing) : undefined}
          onOpenChange={(o) => { if (!o) setManaging(null); }}
        />
      </div>
    </PageGuard>
  );
}
