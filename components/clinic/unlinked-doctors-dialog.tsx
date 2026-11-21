"use client";

import { useMemo, useState } from "react";
import { Link2, Plus, Search, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUnlinkedReferralNames } from "@/lib/hooks/use-clinic-referrals";

/**
 * Doctors typed freehand as a patient's referrer ("استخدام … كاسم حر") — they
 * refer patients but aren't contacts yet, so nobody has visited them.
 * Each can be filed as a contact straight from here.
 */
export function UnlinkedDoctorsDialog({
  open, onOpenChange, canManage, onAdd, onLinkExisting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  /** Opens the add-source form prefilled with this doctor's name. */
  onAdd: (name: string) => void;
  /** The name is a spelling of a doctor already in contacts — link the patients to them. */
  onLinkExisting: (name: string) => void;
}) {
  const { data = [], isLoading, isError } = useUnlinkedReferralNames("DOCTOR", open);
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? data.filter((r) => r.name.toLowerCase().includes(q)) : data;
  }, [data, search]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setSearch(""); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-500" />
            أطباء لم تتم زيارتهم
          </DialogTitle>
          <DialogDescription>
            أسماء أطباء كُتبت يدوياً كطريقة وصول للمريض، وغير موجودة في جهات الاتصال بعد.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم..." className="ps-9" />
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-destructive">تعذّر تحميل القائمة</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {data.length === 0 ? "كل الأطباء المُحيلين موجودون في جهات الاتصال" : "لا يوجد اسم مطابق"}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الطبيب</TableHead>
                <TableHead>المرضى المحالون</TableHead>
                <TableHead>آخر إحالة</TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="tabular-nums">{r.patientCount}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {r.lastReferredAt ? r.lastReferredAt.slice(0, 10) : "—"}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => onAdd(r.name)}>
                          <Plus className="h-3.5 w-3.5" />
                          إضافة كجهة اتصال
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => onLinkExisting(r.name)} title="الاسم لطبيب موجود في جهات الاتصال">
                          <Link2 className="h-3.5 w-3.5" />
                          ربط بجهة موجودة
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
