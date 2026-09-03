"use client";

import { useState } from "react";
import { Plus, Search, Pencil, Trash2, ListOrdered, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ClinicCountChips } from "@/components/clinic/clinic-count-chips";
import { WaitingListDialog, WAITING_STATUSES } from "@/components/clinic/waiting-list-dialog";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import {
  useWaitingList, useCreateWaitingListEntry, useUpdateWaitingListEntry,
  useDeleteWaitingListEntry,
} from "@/lib/hooks/use-clinic-waiting-list";
import { WaitingListEntry, WaitingStatus } from "@/lib/api/clinic-waiting-list";

const LIMIT = 15;

const STATUS_STYLE: Record<WaitingStatus, string> = {
  WAITING:       "bg-amber-100 text-amber-800 border-amber-200",
  SCHEDULED:     "bg-green-100 text-green-800 border-green-200",
  NOT_SCHEDULED: "bg-gray-100 text-gray-700 border-gray-200",
};

const ARRIVAL_LABEL: Record<string, string> = {
  SOCIAL_MEDIA: "مواقع التواصل",
  HOSPITAL: "مشفى",
  DOCTOR: "طبيب",
  ASSOCIATION: "جمعية",
  FRIEND: "صديق",
  STAFF: "موظف",
};

/** 5 is the most urgent, so the strongest colour sits at the top of the scale. */
const priorityStyle = (p: number) =>
  p >= 5 ? "bg-red-100 text-red-800 border-red-200"
  : p === 4 ? "bg-orange-100 text-orange-800 border-orange-200"
  : p === 3 ? "bg-amber-100 text-amber-800 border-amber-200"
  : "bg-slate-100 text-slate-700 border-slate-200";

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export default function WaitingListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WaitingStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WaitingListEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useWaitingList({
    page,
    limit: LIMIT,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const createEntry = useCreateWaitingListEntry();
  const updateEntry = useUpdateWaitingListEntry();
  const deleteEntry = useDeleteWaitingListEntry();

  // The API has no search parameter, so the name/phone filter runs over the
  // page in hand — the same limitation the other clinic lists carry.
  const q = search.trim().toLowerCase();
  const entries = (data?.items ?? []).filter((e) =>
    !q || e.patientName.toLowerCase().includes(q) || e.contactNumber.toLowerCase().includes(q),
  );
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (entry: WaitingListEntry) => { setEditing(entry); setDialogOpen(true); };

  const handleSubmit = async (dto: Record<string, any>) => {
    if (editing) await updateEntry.mutateAsync({ id: editing.id, dto });
    else await createEntry.mutateAsync(dto as any);
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteEntry.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="قائمة الانتظار"
        description="المرضى بانتظار جدولة موعد في العيادة"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ClinicCountChips
              isLoading={isLoading}
              counts={[{ icon: Users, label: "بالانتظار", value: total }]}
            />
            <ActionGuard permission={PERMISSIONS.CLINIC_WAITING_LIST.CREATE}>
              <Button onClick={openAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة مريض
              </Button>
            </ActionGuard>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رقم التواصل..."
            className="pr-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {WAITING_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الأولوية</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>الجنس</TableHead>
              <TableHead>العمر</TableHead>
              <TableHead>الخدمة المطلوبة</TableHead>
              <TableHead>رقم التواصل</TableHead>
              <TableHead>طريقة الوصول</TableHead>
              <TableHead>تاريخ التسجيل</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <EmptyState
                    icon={<ListOrdered className="h-8 w-8 text-muted-foreground" />}
                    title="لا يوجد مرضى في قائمة الانتظار"
                    description="أضف مريضاً لتظهر السجلات هنا"
                  />
                </TableCell>
              </TableRow>
            ) : (
              entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${priorityStyle(e.priority)}`}>
                      {e.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{e.patientName}</TableCell>
                  <TableCell className="text-sm">{e.gender === "FEMALE" ? "أنثى" : "ذكر"}</TableCell>
                  <TableCell className="text-sm">{e.age ?? "—"}</TableCell>
                  <TableCell className="text-sm">{e.serviceType}</TableCell>
                  <TableCell className="text-sm font-mono" dir="ltr">{e.contactNumber}</TableCell>
                  <TableCell className="text-sm">
                    {e.arrivalMethod ? ARRIVAL_LABEL[e.arrivalMethod] ?? e.arrivalMethod : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {fmt(e.registrationDate ?? e.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_STYLE[e.status]}`}>
                      {WAITING_STATUSES.find((s) => s.value === e.status)?.label ?? e.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ActionGuard permission={PERMISSIONS.CLINIC_WAITING_LIST.EDIT}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </ActionGuard>
                      <ActionGuard permission={PERMISSIONS.CLINIC_WAITING_LIST.DELETE}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(e.id)}>
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

      <WaitingListDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editing}
        onSubmit={handleSubmit}
        isPending={createEntry.isPending || updateEntry.isPending}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="حذف من قائمة الانتظار"
        description="هل تريد حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
