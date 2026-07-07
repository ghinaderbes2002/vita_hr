"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ProbationCriteria } from "@/lib/api/probation-criteria";
import {
  useProbationCriteria,
  useCreateProbationCriteria,
  useUpdateProbationCriteria,
  useDeleteProbationCriteria,
} from "@/lib/hooks/use-probation-criteria";

interface CriteriaSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CriteriaSettingsDialog({ open, onOpenChange }: CriteriaSettingsDialogProps) {
  const { data, isLoading } = useProbationCriteria(open);
  const createCriteria = useCreateProbationCriteria();
  const updateCriteria = useUpdateProbationCriteria();
  const deleteCriteria = useDeleteProbationCriteria();

  const criteria = (Array.isArray(data) ? data : []).slice().sort((a, b) => a.displayOrder - b.displayOrder);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameAr, setEditNameAr] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editOrder, setEditOrder] = useState(0);

  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<ProbationCriteria | null>(null);

  function startEdit(c: ProbationCriteria) {
    setEditingId(c.id);
    setEditNameAr(c.nameAr);
    setEditNameEn(c.nameEn || "");
    setEditOrder(c.displayOrder);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveEdit() {
    if (!editingId || !editNameAr.trim()) return;
    updateCriteria.mutate(
      { id: editingId, data: { nameAr: editNameAr.trim(), nameEn: editNameEn.trim() || undefined, displayOrder: editOrder } },
      { onSuccess: () => setEditingId(null) },
    );
  }

  function handleAdd() {
    if (!newNameAr.trim()) return;
    createCriteria.mutate(
      { nameAr: newNameAr.trim(), nameEn: newNameEn.trim() || undefined, displayOrder: criteria.length + 1 },
      { onSuccess: () => { setNewNameAr(""); setNewNameEn(""); } },
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إعدادات أسئلة تقييم التجربة</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)
            ) : criteria.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد أسئلة بعد</p>
            ) : (
              criteria.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg border p-2">
                  {editingId === c.id ? (
                    <>
                      <Input
                        type="number"
                        className="w-14 h-8 text-center shrink-0"
                        value={editOrder}
                        onChange={(e) => setEditOrder(parseInt(e.target.value) || 0)}
                      />
                      <Input className="flex-1 h-8" value={editNameAr} onChange={(e) => setEditNameAr(e.target.value)} placeholder="النص بالعربية" />
                      <Input className="flex-1 h-8" value={editNameEn} onChange={(e) => setEditNameEn(e.target.value)} placeholder="English" />
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={!editNameAr.trim() || updateCriteria.isPending} onClick={saveEdit}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="w-8 text-xs text-muted-foreground text-center shrink-0">{c.displayOrder}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.nameAr}</p>
                        {c.nameEn && <p className="text-xs text-muted-foreground truncate">{c.nameEn}</p>}
                      </div>
                      {c.isCore && <Badge variant="secondary" className="text-[10px] shrink-0">أساسي</Badge>}
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => startEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!c.isCore && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => setDeleteTarget(c)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t pt-3 space-y-1.5">
            <Label>إضافة سؤال جديد</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input className="flex-1" value={newNameAr} onChange={(e) => setNewNameAr(e.target.value)} placeholder="النص بالعربية *" />
              <Input className="flex-1" value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} placeholder="English (اختياري)" />
              <Button onClick={handleAdd} disabled={!newNameAr.trim() || createCriteria.isPending} className="gap-1.5 shrink-0">
                <Plus className="h-4 w-4" />
                إضافة
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title={`حذف سؤال "${deleteTarget?.nameAr ?? ""}"؟`}
        description="إذا كان هذا السؤال مستخدماً في تقييمات سابقة سيتم تعطيله فقط والاحتفاظ بالبيانات، وإلا سيُحذف نهائياً."
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) deleteCriteria.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
