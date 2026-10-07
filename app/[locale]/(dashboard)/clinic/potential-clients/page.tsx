"use client";

// العملاء المحتملون: من سأل عن خدمة ولم يصبح مريضاً ولا دخل قائمة الانتظار بعد.
// سجل مستقل عن قائمة الانتظار — بلا أولوية ولا حالة.

import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, UserSearch, Users, Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { ClinicCountChips } from "@/components/clinic/clinic-count-chips";
import {
  PotentialClientDialog, POTENTIAL_CLIENT_ARRIVAL_METHODS,
} from "@/components/clinic/potential-client-dialog";
import { PotentialClientDetailsDialog } from "@/components/clinic/potential-client-details-dialog";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import {
  usePotentialClients, useCreatePotentialClient, useUpdatePotentialClient,
  useDeletePotentialClient, useExportPotentialClients, usePotentialClientServices,
} from "@/lib/hooks/use-clinic-potential-clients";
import { CreatePotentialClientDto, PotentialClient } from "@/lib/api/clinic-potential-clients";

const LIMIT = 15;

/** Radix rejects an empty option value, so "all services" needs a sentinel. */
const ALL_SERVICES = "__all__";

const arrivalLabel = (v?: string | null) =>
  v ? POTENTIAL_CLIENT_ARRIVAL_METHODS.find((m) => m.value === v)?.label ?? v : "—";

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

function PotentialClientsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [service, setService] = useState(ALL_SERVICES);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PotentialClient | null>(null);
  const [viewing, setViewing] = useState<PotentialClient | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // The search hits the server, so wait for the typing to pause.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: services = [] } = usePotentialClientServices();
  // A service whose last record was edited or deleted no longer filters.
  const activeService = services.includes(service) ? service : ALL_SERVICES;

  // The filters run on the server, so they cover every page and `total`.
  const filters = {
    interestedService: activeService !== ALL_SERVICES ? activeService : undefined,
    search: debouncedSearch || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };
  const isFiltered = Object.values(filters).some(Boolean);

  const { data, isLoading } = usePotentialClients({ ...filters, page, limit: LIMIT });

  const createClient = useCreatePotentialClient();
  const updateClient = useUpdatePotentialClient();
  const deleteClient = useDeletePotentialClient();
  const exportXlsx = useExportPotentialClients();

  const clients = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (c: PotentialClient) => { setEditing(c); setDialogOpen(true); };

  const handleSubmit = async (dto: Record<string, unknown>) => {
    if (editing) {
      // Nothing changed — close without a request.
      if (Object.keys(dto).length > 0) await updateClient.mutateAsync({ id: editing.id, dto });
    } else {
      await createClient.mutateAsync(dto as unknown as CreatePotentialClientDto);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteClient.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="العملاء المحتملون"
        description="من استفسر عن خدمة ولم يُسجَّل مريضاً بعد"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ClinicCountChips
              isLoading={isLoading}
              counts={[{ icon: Users, label: "العملاء", value: total }]}
            />
            <Button
              variant="outline" className="gap-2" disabled={exportXlsx.isPending}
              onClick={() => exportXlsx.mutate(filters)}
            >
              {exportXlsx.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              تصدير Excel
            </Button>
            <ActionGuard permission={PERMISSIONS.CLINIC_POTENTIAL_CLIENTS.CREATE}>
              <Button onClick={openAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة عميل
              </Button>
            </ActionGuard>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رقم التواصل أو الخدمة..."
            className="pr-9"
          />
        </div>
        <Select value={activeService} onValueChange={(v) => { setService(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SERVICES}>كل الخدمات</SelectItem>
            {services.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Registration date range; either end may be left open. */}
        <span className="text-sm text-muted-foreground">من</span>
        <Input
          type="date" value={dateFrom} max={dateTo || undefined} className="w-38"
          title="تاريخ التسجيل من"
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
        />
        <span className="text-sm text-muted-foreground">إلى</span>
        <Input
          type="date" value={dateTo} min={dateFrom || undefined} className="w-38"
          title="تاريخ التسجيل إلى"
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
        />
        {(dateFrom || dateTo) && (
          <Button
            variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" title="مسح التاريخ"
            onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الجنس</TableHead>
              <TableHead>العمر</TableHead>
              <TableHead>خدمة مهتم بها</TableHead>
              <TableHead>رقم التواصل</TableHead>
              <TableHead>طريقة الوصول</TableHead>
              <TableHead>تاريخ التسجيل</TableHead>
              <TableHead>ملاحظات</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState
                    icon={<UserSearch className="h-8 w-8 text-muted-foreground" />}
                    title={isFiltered ? "لا توجد نتائج مطابقة" : "لا يوجد عملاء محتملون"}
                    description={isFiltered ? "جرّب تغيير البحث أو الخدمة" : "أضف عميلاً لتظهر السجلات هنا"}
                  />
                </TableCell>
              </TableRow>
            ) : (
              clients.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setViewing(c)}>
                  <TableCell className="font-medium">{c.patientName}</TableCell>
                  <TableCell className="text-sm">{c.gender === "FEMALE" ? "أنثى" : "ذكر"}</TableCell>
                  <TableCell className="text-sm">{c.age ?? "—"}</TableCell>
                  <TableCell className="text-sm">{c.interestedService}</TableCell>
                  <TableCell className="text-sm font-mono" dir="ltr">{c.contactNumber}</TableCell>
                  <TableCell className="text-sm">{arrivalLabel(c.arrivalMethod)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {fmt(c.registrationDate ?? c.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-sm text-muted-foreground" title={c.notes ?? undefined}>
                    {c.notes || "—"}
                  </TableCell>
                  {/* The row opens the details; its own buttons must not. */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <ActionGuard permission={PERMISSIONS.CLINIC_POTENTIAL_CLIENTS.EDIT}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </ActionGuard>
                      <ActionGuard permission={PERMISSIONS.CLINIC_POTENTIAL_CLIENTS.DELETE}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ActionGuard>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
      )}

      <PotentialClientDetailsDialog
        client={viewing}
        onOpenChange={(o) => { if (!o) setViewing(null); }}
        onEdit={(c) => { setViewing(null); openEdit(c); }}
      />

      <PotentialClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={editing}
        onSubmit={handleSubmit}
        isPending={createClient.isPending || updateClient.isPending}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="حذف عميل محتمل"
        description="هل تريد حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default function PotentialClientsPage() {
  return (
    <PageGuard permission={PERMISSIONS.CLINIC_POTENTIAL_CLIENTS.VIEW}>
      <PotentialClientsList />
    </PageGuard>
  );
}
