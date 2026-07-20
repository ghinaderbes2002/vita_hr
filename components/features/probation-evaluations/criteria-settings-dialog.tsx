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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
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
  // "" → a general question shown to every employee.
  const [newTargetEmployeeId, setNewTargetEmployeeId] = useState("");
  const [editTargetEmployeeId, setEditTargetEmployeeId] = useState("");

  const { data: employeesData } = useEmployeesBasicList();
  const employees: { id: string; firstNameAr: string; lastNameAr: string }[] =
    Array.isArray(employeesData) ? employeesData : [];
  const employeeName = (empId?: string | null) => {
    const e = employees.find((x) => x.id === empId);
    return e ? `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim() : null;
  };

  const [deleteTarget, setDeleteTarget] = useState<ProbationCriteria | null>(null);

  function startEdit(c: ProbationCriteria) {
    setEditingId(c.id);
    setEditNameAr(c.nameAr);
    setEditNameEn(c.nameEn || "");
    setEditOrder(c.displayOrder);
    setEditTargetEmployeeId(c.targetEmployeeId ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveEdit() {
    if (!editingId || !editNameAr.trim()) return;
    updateCriteria.mutate(
      { id: editingId, data: {
        nameAr: editNameAr.trim(),
        nameEn: editNameEn.trim() || undefined,
        displayOrder: editOrder,
        targetEmployeeId: editTargetEmployeeId || null,
      } },
      { onSuccess: () => setEditingId(null) },
    );
  }

  function handleAdd() {
    if (!newNameAr.trim()) return;
    createCriteria.mutate(
      {
        nameAr: newNameAr.trim(),
        nameEn: newNameEn.trim() || undefined,
        displayOrder: criteria.length + 1,
        ...(newTargetEmployeeId ? { targetEmployeeId: newTargetEmployeeId } : {}),
      },
      { onSuccess: () => { setNewNameAr(""); setNewNameEn(""); setNewTargetEmployeeId(""); } },
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
                <div key={c.id} className={`gap-2 rounded-lg border p-2 ${editingId === c.id ? "space-y-2" : "flex items-center"}`}>
                  {editingId === c.id ? (
                    <>
                      <div className="flex items-center gap-2">
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
                      </div>
                      <Select value={editTargetEmployeeId || "all"} onValueChange={(v) => setEditTargetEmployeeId(v === "all" ? "" : v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">سؤال عام — لكل الموظفين</SelectItem>
                          {employees.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : (
                    <>
                      <span className="w-8 text-xs text-muted-foreground text-center shrink-0">{c.displayOrder}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.nameAr}</p>
                        {c.nameEn && <p className="text-xs text-muted-foreground truncate">{c.nameEn}</p>}
                      </div>
                      {c.targetEmployeeId && (
                        <Badge variant="outline" className="text-[10px] shrink-0 border-orange-300 bg-orange-50 text-orange-700">
                          {employeeName(c.targetEmployeeId)
                            ?? (`${c.targetEmployee?.firstNameAr ?? ""} ${c.targetEmployee?.lastNameAr ?? ""}`.trim()
                              || "مخصص لموظف")}
                        </Badge>
                      )}
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
            {/* A targeted question only shows up in that employee's evaluation. */}
            <Select value={newTargetEmployeeId || "all"} onValueChange={(v) => setNewTargetEmployeeId(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">سؤال عام — لكل الموظفين</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              السؤال المخصص يظهر فقط في تقييم الموظف المحدد، ولا يؤثر على التقييمات المنشأة سابقاً.
            </p>
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
