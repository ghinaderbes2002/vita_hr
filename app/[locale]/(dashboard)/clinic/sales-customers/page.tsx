"use client";

// عملاء المبيعات: سجل مستقل لقسم المبيعات (/referrals/customers)، منفصل عن
// المرضى وعن العملاء المحتملين.

import { useState } from "react";
import { Contact, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { ClinicCountChips } from "@/components/clinic/clinic-count-chips";
import {
  SalesCustomerDialog, SALES_CUSTOMER_ARRIVAL_METHODS, salesArrivalLabel,
} from "@/components/clinic/sales-customer-dialog";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  useCreateSalesCustomer, useDeleteSalesCustomer, useSalesCustomers, useUpdateSalesCustomer,
} from "@/lib/hooks/use-sales-customers";
import type {
  CreateSalesCustomerDto, SalesCustomer, SalesCustomerArrivalMethod, SalesCustomerGender,
} from "@/lib/api/sales-customers";

const LIMIT = 20;
/** Radix rejects an empty option value, so "all" needs a sentinel. */
const ALL = "__all__";
const COLUMNS = 9;

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

function SalesCustomersList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search.trim());
  const [gender, setGender] = useState(ALL);
  const [arrival, setArrival] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SalesCustomer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filtered on the server, so they cover every page and the total.
  const filters = {
    search: term || undefined,
    gender: gender !== ALL ? (gender as SalesCustomerGender) : undefined,
    arrivalMethod: arrival !== ALL ? (arrival as SalesCustomerArrivalMethod) : undefined,
  };
  const isFiltered = Object.values(filters).some((v) => v !== undefined);
  const { data, isLoading } = useSalesCustomers({ ...filters, page, limit: LIMIT });

  const createCustomer = useCreateSalesCustomer();
  const updateCustomer = useUpdateSalesCustomer();
  const deleteCustomer = useDeleteSalesCustomer();

  const customers = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (c: SalesCustomer) => { setEditing(c); setDialogOpen(true); };

  const handleSubmit = async (dto: Record<string, unknown>) => {
    try {
      if (editing) {
        // Nothing changed — close without a request.
        if (Object.keys(dto).length > 0) await updateCustomer.mutateAsync({ id: editing.id, dto });
      } else {
        await createCustomer.mutateAsync(dto as unknown as CreateSalesCustomerDto);
      }
      setDialogOpen(false);
    } catch {
      // The hook shows the server's message; the dialog stays open to fix it.
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteCustomer.mutateAsync(deleteId); } catch { /* toasted by the hook */ }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="العملاء"
        description="عملاء قسم المبيعات"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ClinicCountChips isLoading={isLoading} counts={[{ icon: Users, label: "العملاء", value: total }]} />
            <ActionGuard permission={PERMISSIONS.SALES_CUSTOMERS.MANAGE}>
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
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="ابحث بالاسم أو رقم التواصل..."
            className="pr-9"
          />
        </div>
        <Select value={gender} onValueChange={(v) => { setGender(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>الجنس: الكل</SelectItem>
            <SelectItem value="MALE">ذكر</SelectItem>
            <SelectItem value="FEMALE">أنثى</SelectItem>
          </SelectContent>
        </Select>
        <Select value={arrival} onValueChange={(v) => { setArrival(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>طريقة الوصول: الكل</SelectItem>
            {SALES_CUSTOMER_ARRIVAL_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الجنس</TableHead>
              <TableHead>العمر</TableHead>
              <TableHead>رقم التواصل</TableHead>
              <TableHead>طريقة الوصول</TableHead>
              <TableHead>مكان الإقامة</TableHead>
              <TableHead>ملاحظات</TableHead>
              <TableHead>تاريخ الإضافة</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: COLUMNS }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS}>
                  <EmptyState
                    icon={<Contact className="h-8 w-8 text-muted-foreground" />}
                    title={isFiltered ? "لا توجد نتائج مطابقة" : "لا يوجد عملاء بعد"}
                    description={isFiltered ? "جرّب تغيير البحث أو الفلاتر" : "أضف عميلاً لتظهر السجلات هنا"}
                  />
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm">{c.gender === "FEMALE" ? "أنثى" : "ذكر"}</TableCell>
                  <TableCell className="text-sm">{c.age ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm" dir="ltr">{c.contactNumber}</TableCell>
                  <TableCell className="text-sm">{salesArrivalLabel(c.arrivalMethod)}</TableCell>
                  <TableCell className="text-sm">{c.residence || "—"}</TableCell>
                  <TableCell className="max-w-56 truncate text-sm text-muted-foreground" title={c.notes ?? undefined}>
                    {c.notes || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmt(c.createdAt)}</TableCell>
                  <TableCell>
                    <ActionGuard permission={PERMISSIONS.SALES_CUSTOMERS.MANAGE}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="تعديل" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="حذف"
                          onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </ActionGuard>
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

      <SalesCustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={editing}
        onSubmit={handleSubmit}
        isPending={createCustomer.isPending || updateCustomer.isPending}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="حذف عميل"
        description="هل تريد حذف هذا العميل؟ سيختفي من القائمة."
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default function SalesCustomersPage() {
  return (
    <PageGuard permission={PERMISSIONS.SALES_CUSTOMERS.VIEW}>
      <SalesCustomersList />
    </PageGuard>
  );
}
