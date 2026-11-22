"use client";

// العرض الفني للمقوّمات — قطع ومكوّنات المقوّم، على نمط العرض الفني في الأطراف
// الصناعية: موقع القطع، الشركة، جدول قطع من أصناف المستودع (أو قطعة حرّة)،
// والقطع المضافة مع حالة طلب المواد الذي يفتحه الخادم لكل قطعة من المستودع.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Package, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InventoryItemCombobox } from "@/components/clinic/inventory-item-combobox";
import { useWarehouseItems, useWarehouses } from "@/lib/hooks/use-warehouse";
import {
  useAddOrthoticsComponent, useDeleteOrthoticsComponent, useOrthoticsComponents,
} from "@/lib/hooks/use-clinic-orthotics";
import type { OrthoticsComponent, OrthoticsReception } from "@/lib/api/clinic-orthotics";

const ROWS = 10;
const emptyRows = () => Array.from({ length: ROWS }, () => ({ warehouseItemId: "" }));
const SOURCE_LABEL: Record<string, string> = { WAREHOUSE: "المستودع", EXTERNAL: "خارجي" };

export function OrthoticsFittingTab({ reception, canEdit }: { reception: OrthoticsReception; canEdit: boolean }) {
  const tWhStatus = useTranslations("warehouse.statuses");
  const { data: components = [], isLoading, error } = useOrthoticsComponents(reception.id);
  const add = useAddOrthoticsComponent(reception.id);
  const remove = useDeleteOrthoticsComponent(reception.id);

  // The picker's catalog: active warehouse items, labelled by their part code
  // (or SKU) the way the technician knows them. Needs warehouse.items.read.
  const { data: warehouseItems = [] } = useWarehouseItems();
  const { data: warehouses = [] } = useWarehouses();
  const catalog = warehouseItems
    .filter((it) => it.isActive !== false)
    .map((it) => ({ id: it.id, name: it.name || it.nameAr || it.sku, code: it.partCode || it.sku }));

  const [sourceLocation, setSourceLocation] = useState<"WAREHOUSE" | "EXTERNAL">("WAREHOUSE");
  const [supplier, setSupplier] = useState<"OTTOBOCK" | "OTHER">("OTTOBOCK");
  const [supplierOther, setSupplierOther] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [rows, setRows] = useState(emptyRows);
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState({ open: false, name: "", code: "" });
  const [toDelete, setToDelete] = useState<OrthoticsComponent | null>(null);

  const supplierValue = () => (supplier === "OTTOBOCK" ? "OTTOBOCK" : supplierOther.trim() || undefined);
  const supplierOk = supplier === "OTTOBOCK" || !!supplierOther.trim();

  // Scenario 1 — parts picked from the warehouse catalog; the API takes the code
  // and name from the item and opens a material request, so only the link goes.
  const saveRows = async () => {
    const picked = rows.filter((r) => r.warehouseItemId);
    if (!picked.length) return;
    setSaving(true);
    try {
      for (const r of picked) {
        await add.mutateAsync({
          warehouseItemId: r.warehouseItemId,
          ...(warehouseId ? { warehouseId } : {}),
          supplier: supplierValue(),
          sourceLocation,
        });
      }
      setRows(emptyRows());
    } catch {
      // the mutation hook already toasted the reason — keep the rows for a retry
    } finally {
      setSaving(false);
    }
  };

  // Scenario 2 — a free-text part from the "add new item" dialog.
  const saveCustom = async () => {
    const name = custom.name.trim();
    const code = custom.code.trim();
    if (!name || !code) return;
    try {
      await add.mutateAsync({ partCode: code, partName: name, supplier: supplierValue(), sourceLocation });
      setCustom({ open: false, name: "", code: "" });
    } catch {
      // toasted by the hook
    }
  };

  // The API may not carry orthotics components yet — say so instead of failing quietly.
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === 404) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          العرض الفني غير مفعّل بعد على الخادم.
        </CardContent>
      </Card>
    );
  }

  const radio = "flex cursor-pointer items-center gap-2 text-sm";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">أجزاء ومكوّنات المقوّم</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {canEdit && (
          <>
            <div className="space-y-2">
              <p className="text-sm font-semibold">موقع أجزاء المقوّم</p>
              <div className="flex gap-6">
                {(["WAREHOUSE", "EXTERNAL"] as const).map((v) => (
                  <label key={v} className={radio}>
                    <input
                      type="radio"
                      name="ortho-source"
                      className="accent-primary"
                      checked={sourceLocation === v}
                      onChange={() => setSourceLocation(v)}
                    />
                    {SOURCE_LABEL[v]}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">الشركة</p>
              <div className="flex flex-wrap items-center gap-5">
                <label className={radio}>
                  <input type="radio" name="ortho-supplier" className="accent-primary" checked={supplier === "OTTOBOCK"} onChange={() => setSupplier("OTTOBOCK")} />
                  OTTOBOCK
                </label>
                <label className={radio}>
                  <input type="radio" name="ortho-supplier" className="accent-primary" checked={supplier === "OTHER"} onChange={() => setSupplier("OTHER")} />
                  أخرى
                </label>
                {supplier === "OTHER" && (
                  <Input
                    className="h-7 w-44 text-sm"
                    placeholder="اسم الشركة"
                    value={supplierOther}
                    onChange={(e) => setSupplierOther(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">أجزاء ومكوّنات المقوّم مع الكود</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="w-9 border border-border px-2 py-1.5 text-center font-medium">#</th>
                      <th className="border border-border px-3 py-1.5 text-start font-medium">الاسم</th>
                      <th className="border border-border px-3 py-1.5 text-start font-medium">الكود</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const item = catalog.find((it) => it.id === row.warehouseItemId);
                      return (
                        <tr key={i}>
                          <td className="border border-border px-2 py-0.5 text-center text-xs text-muted-foreground">{i + 1}</td>
                          <td className="border border-border p-0.5">
                            <InventoryItemCombobox
                              items={catalog}
                              value={row.warehouseItemId}
                              placeholder="اختر من أصناف المستودع..."
                              onChange={(v) => setRows((prev) => prev.map((r, j) => (j === i ? { warehouseItemId: v } : r)))}
                              onAddCustom={(search) => setCustom({ open: true, name: "", code: search })}
                              className="h-7 border-0 bg-transparent text-sm shadow-none"
                            />
                          </td>
                          <td className="border border-border px-3 py-1.5 font-mono text-sm text-muted-foreground">{item?.code ?? ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* The warehouse the material request is raised against — the main one by default. */}
            {warehouses.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">المستودع الذي يُطلب منه</p>
                <Select value={warehouseId || "__main__"} onValueChange={(v) => setWarehouseId(v === "__main__" ? "" : v)}>
                  <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__main__">المستودع الرئيسي (افتراضي)</SelectItem>
                    {warehouses.filter((w) => w.isActive !== false).map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={saveRows}
              disabled={saving || !rows.some((r) => r.warehouseItemId) || !supplierOk}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              حفظ القطع
            </Button>
          </>
        )}

        {/* Parts already added */}
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : components.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">لم تُضف قطع بعد.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">القطع المضافة</p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-start font-medium">الكود</th>
                    <th className="p-2 text-start font-medium">القطعة</th>
                    <th className="p-2 text-start font-medium">الشركة</th>
                    <th className="p-2 text-start font-medium">المصدر</th>
                    <th className="p-2 text-start font-medium">تاريخ الإضافة</th>
                    <th className="p-2 text-start font-medium">حالة الطلب</th>
                    {canEdit && <th className="p-2" />}
                  </tr>
                </thead>
                <tbody>
                  {components.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-2 font-mono text-xs">{c.partCode ?? c.warehouseItem?.partCode ?? "—"}</td>
                      <td className="p-2">
                        {c.partName ?? c.warehouseItem?.name ?? c.warehouseItem?.nameAr ?? "—"}
                        {c.warehouseItemId && (
                          <span className="ms-1.5 inline-flex items-center text-[10px] text-blue-600" title="مرتبطة بالمستودع">
                            <Package className="h-3 w-3" />
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground">{c.supplier ?? "—"}</td>
                      <td className="p-2 text-muted-foreground">{c.sourceLocation ? SOURCE_LABEL[c.sourceLocation] ?? c.sourceLocation : "—"}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {(c.addedAt ?? c.createdAt) ? new Date((c.addedAt ?? c.createdAt) as string).toLocaleDateString("en-GB") : "—"}
                        {c.addedByName && <span className="block">{c.addedByName}</span>}
                      </td>
                      <td className="p-2">
                        {c.materialRequest
                          ? <Badge variant="outline" className="text-xs">{tWhStatus(c.materialRequest.status)}</Badge>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      {canEdit && (
                        <td className="p-2 text-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            aria-label="حذف القطعة"
                            onClick={() => setToDelete(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={custom.open} onOpenChange={(open) => setCustom((s) => ({ ...s, open }))}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة قطعة جديدة</DialogTitle>
            <DialogDescription>قطعة غير موجودة بأصناف المستودع — تُحفظ بالاسم والكود.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>اسم القطعة</Label>
              <Input value={custom.name} onChange={(e) => setCustom((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>الكود *</Label>
              <Input className="font-mono" value={custom.code} onChange={(e) => setCustom((s) => ({ ...s, code: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setCustom({ open: false, name: "", code: "" })}>إلغاء</Button>
            <Button onClick={saveCustom} disabled={add.isPending || !custom.name.trim() || !custom.code.trim() || !supplierOk}>
              {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="حذف القطعة؟"
        description={toDelete ? `${toDelete.partName ?? toDelete.warehouseItem?.name ?? ""} ${toDelete.partCode ?? ""}`.trim() : undefined}
        variant="destructive"
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </Card>
  );
}
