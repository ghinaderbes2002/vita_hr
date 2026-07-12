"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCreateInventoryItem, useUpdateInventoryItem, useInventoryCategories } from "@/lib/hooks/use-clinic-inventory";
import { CreateItemDto, InventoryItem, ItemType } from "@/lib/api/clinic-inventory";

interface InventoryItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCode?: string;
  initialName?: string;
  item?: InventoryItem | null;
  onCreated?: (item: InventoryItem) => void;
  // True when this create is a technician "part request" (missing-item flow
  // from a case's inventory picker) rather than an admin adding a catalog
  // item directly — sent to the backend so it starts status: PENDING.
  isRequest?: boolean;
}

const emptyForm = (code = "", name = ""): Partial<CreateItemDto> => ({ code, name, unit: "قطعة" });

const formFromItem = (item: InventoryItem): Partial<CreateItemDto> => ({
  code: item.code,
  name: item.name,
  companyName: item.companyName ?? undefined,
  type: item.type ?? undefined,
  currentStock: item.currentStock,
  minStockLevel: item.minStockLevel ?? undefined,
  unit: item.unit ?? undefined,
  categoryId: item.categoryId ?? undefined,
  description: item.description ?? undefined,
});

// Shared "add/edit inventory item" form — used by the main inventory page,
// inline from item pickers (e.g. when a search finds no match), and edit mode.
export function InventoryItemFormDialog({ open, onOpenChange, initialCode, initialName, item, onCreated, isRequest }: InventoryItemFormDialogProps) {
  const { data: categories = [] } = useInventoryCategories();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const isEdit = !!item;
  const [form, setForm] = useState<Partial<CreateItemDto>>(() => item ? formFromItem(item) : emptyForm(initialCode, initialName));

  // Reset the form when the dialog transitions to open — done during render
  // (React's documented pattern for "adjusting state on prop change")
  // rather than in an effect, to avoid an extra render pass.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setForm(item ? formFromItem(item) : emptyForm(initialCode, initialName));
  }

  const isPending = createItem.isPending || updateItem.isPending;

  const handleSave = async () => {
    if (!form.code || !form.name) return;
    if (isEdit && item) {
      await updateItem.mutateAsync({ id: item.id, dto: form });
      onOpenChange(false);
    } else {
      const created = await createItem.mutateAsync({ ...form, isRequest } as CreateItemDto);
      onOpenChange(false);
      onCreated?.(created);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل الصنف" : isRequest ? "طلب صنف جديد" : "إضافة صنف جديد"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>الكود <span className="text-destructive">*</span></Label>
              <Input value={form.code ?? ""} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="PRO-001" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>النوع</Label>
              <Select value={form.type ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, type: v ? v as ItemType : undefined }))}>
                <SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPONENT">قطعة</SelectItem>
                  <SelectItem value="CONSUMABLE">مستهلك</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>الاسم <span className="text-destructive">*</span></Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>اسم الشركة</Label>
            <Input value={form.companyName ?? ""} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="اختياري" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>الكمية الابتدائية</Label>
              <Input type="number" min={0} value={form.currentStock ?? ""} placeholder="0" onChange={(e) => setForm((f) => ({ ...f, currentStock: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>الحد الأدنى</Label>
              <Input type="number" min={0} value={form.minStockLevel ?? ""} placeholder="اختياري" onChange={(e) => setForm((f) => ({ ...f, minStockLevel: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>الوحدة</Label>
              <Input value={form.unit ?? ""} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="قطعة، متر..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>التصنيف</Label>
            <Select value={form.categoryId ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v === "none" ? undefined : v }))}>
              <SelectTrigger><SelectValue placeholder="اختر تصنيفاً" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون تصنيف</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>وصف</Label>
            <Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSave} disabled={!form.code || !form.name || isPending}>
            {isPending ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : isRequest ? "إرسال الطلب" : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
