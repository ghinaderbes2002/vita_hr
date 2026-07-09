"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Plus, Search, AlertTriangle, Package, Eye, ArrowUpDown, Pencil, Trash2, Upload, Loader2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useInventoryItems, useLowStockAlerts,
  useAddInventoryTransaction, useInventoryTransactions,
  useDeleteInventoryItem, useImportInventoryExcel, useUpdateInventoryItem,
} from "@/lib/hooks/use-clinic-inventory";
import { ImportExcelResult, InventoryItem, ItemRequestStatus, ItemType, TransactionType } from "@/lib/api/clinic-inventory";
import { InventoryItemFormDialog } from "@/components/clinic/inventory-item-form-dialog";

const TYPE_LABEL: Record<ItemType, string> = { COMPONENT: "قطعة", CONSUMABLE: "مستهلك" };
const TX_LABEL: Record<TransactionType, string> = {
  RECEIVE: "استلام", ISSUE: "صرف", ADJUST: "تسوية", RETURN: "إرجاع",
};
const TX_COLOR: Record<TransactionType, string> = {
  RECEIVE: "text-green-600", ISSUE: "text-red-600", ADJUST: "text-blue-600", RETURN: "text-orange-600",
};
const REQUEST_STATUS_LABEL: Record<ItemRequestStatus, string> = {
  PENDING: "معلق", APPROVED: "معتمد", DONE: "تم", NOT_AVAILABLE: "لا يوجد",
};
const REQUEST_STATUS_BADGE: Record<ItemRequestStatus, string> = {
  PENDING: "border-amber-300 bg-amber-50 text-amber-700",
  APPROVED: "border-blue-300 bg-blue-50 text-blue-700",
  DONE: "border-green-300 bg-green-50 text-green-700",
  NOT_AVAILABLE: "border-red-300 bg-red-50 text-red-700",
};

export default function InventoryPage() {
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ItemType | "all">("all");
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [importResult, setImportResult] = useState<ImportExcelResult | null>(null);
  const [txDialogItem, setTxDialogItem] = useState<InventoryItem | null>(null);
  const [txForm, setTxForm] = useState({ type: "RECEIVE" as TransactionType, quantity: "1", notes: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: items = [], isLoading } = useInventoryItems({
    search: search || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
  });
  const { data: lowStock = [] } = useLowStockAlerts();
  const { data: transactions = [] } = useInventoryTransactions();

  const addTx = useAddInventoryTransaction();
  const deleteItem = useDeleteInventoryItem();
  const importExcel = useImportInventoryExcel();
  const updateItem = useUpdateInventoryItem();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  // Normal catalog items (status: null, admin-added) vs. technician part
  // requests (status set — PENDING/APPROVED/DONE/NOT_AVAILABLE) are two
  // permanently separate lists, shown in separate tabs.
  const catalogItems = items.filter((i) => i.status == null);
  const requestedItems = items.filter((i) => i.status != null);
  const pendingRequests = requestedItems.filter((i) => i.status === "PENDING");

  const displayedItems = incompleteOnly
    ? catalogItems.filter((i) => !i.categoryId)
    : catalogItems;

  const handleReviewStatus = (item: InventoryItem, status: ItemRequestStatus) => {
    updateItem.mutate({ id: item.id, dto: { status, notes: reviewNotes[item.id] ?? item.notes ?? undefined } });
  };

  const handleAddTx = async () => {
    if (!txDialogItem || !txForm.quantity) return;
    await addTx.mutateAsync({
      id: txDialogItem.id,
      type: txForm.type,
      quantity: parseInt(txForm.quantity),
      notes: txForm.notes || undefined,
    });
    setTxDialogItem(null);
    setTxForm({ type: "RECEIVE", quantity: "1", notes: "" });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    importExcel.mutate(file, {
      onSuccess: (result) => { if (result.errors.length > 0) setImportResult(result); },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="المخزون الطبي"
        description="إدارة قطع الأطراف الصناعية والمستهلكات"
        actions={
          <ActionGuard permission={PERMISSIONS.CLINIC_INVENTORY.MANAGE}>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFile} />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importExcel.isPending} className="gap-2">
                {importExcel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                استيراد Excel
              </Button>
              <Button onClick={() => setNewItemOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة صنف
              </Button>
            </div>
          </ActionGuard>
        }
      />

      {/* Low stock alert banner */}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            {lowStock.length} صنف تحت الحد الأدنى للمخزون
          </p>
          <div className="flex gap-1 flex-wrap">
            {lowStock.slice(0, 5).map((i) => (
              <Badge key={i.id} variant="outline" className="text-xs border-orange-300 bg-orange-100">
                {i.name} ({i.currentStock})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground mb-1">إجمالي الأصناف</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground mb-1">قطع أطراف</p>
            <p className="text-2xl font-bold">{items.filter((i) => i.type === "COMPONENT").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground mb-1">مستهلكات</p>
            <p className="text-2xl font-bold">{items.filter((i) => i.type === "CONSUMABLE").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">مخزون منخفض</p>
              <p className="text-2xl font-bold text-orange-600">{lowStock.length}</p>
            </div>
            {lowStock.length > 0 && <AlertTriangle className="h-5 w-5 text-orange-500 mr-auto" />}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">الأصناف</TabsTrigger>
          <TabsTrigger value="requests">
            طلبات القطع
            {pendingRequests.length > 0 && <Badge className="mr-1.5 h-4 text-xs">{pendingRequests.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="transactions">حركات المخزون</TabsTrigger>
          <TabsTrigger value="low-stock">
            تنبيهات المخزون
            {lowStock.length > 0 && <Badge className="mr-1.5 h-4 text-xs">{lowStock.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Items tab */}
        <TabsContent value="items" className="mt-4">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الكود..." className="pr-9" />
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger className="w-36"><SelectValue placeholder="النوع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="COMPONENT">قطع</SelectItem>
                  <SelectItem value="CONSUMABLE">مستهلكات</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={incompleteOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setIncompleteOnly((v) => !v)}
                className="gap-1.5"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                بيانات ناقصة
                {!incompleteOnly && items.filter((i) => !i.categoryId).length > 0 && (
                  <Badge variant="secondary" className="h-4 text-xs px-1">{items.filter((i) => !i.categoryId).length}</Badge>
                )}
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الكود</TableHead>
                    <TableHead>الصنف</TableHead>
                    <TableHead>الشركة</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>التصنيف</TableHead>
                    <TableHead>المخزون</TableHead>
                    <TableHead>الحد الأدنى</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                      </TableRow>
                    ))
                  ) : displayedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <EmptyState icon={<Package className="h-8 w-8 text-muted-foreground" />}
                          title={incompleteOnly ? "لا توجد أصناف بيانات ناقصة" : "لا توجد أصناف"}
                          description={incompleteOnly ? "جميع الأصناف مكتملة البيانات" : "أضف أول صنف للمخزون"} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedItems.map((item: InventoryItem) => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">{item.code}</TableCell>
                        <TableCell className="font-medium">
                          {item.name}
                          {item.description && <p className="text-xs text-muted-foreground truncate max-w-40">{item.description}</p>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.companyName ?? "—"}</TableCell>
                        <TableCell>
                          {item.type ? <Badge variant="outline" className="text-xs">{TYPE_LABEL[item.type]}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">{item.category?.name ?? "—"}</TableCell>
                        <TableCell>
                          <span className={item.isLowStock ? "text-orange-600 font-bold" : "font-medium"}>
                            {item.currentStock}
                          </span>
                          {item.unit && <span className="text-xs text-muted-foreground mr-1">{item.unit}</span>}
                          {item.isLowStock && <AlertTriangle className="h-3.5 w-3.5 text-orange-500 inline mr-1" />}
                        </TableCell>
                        <TableCell className="text-sm">{item.minStockLevel}</TableCell>
                        <TableCell className="text-sm">{item.unitPrice != null && item.unitPrice > 0 ? `$${item.unitPrice.toLocaleString("en-US")}` : "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => router.push(`/${locale}/clinic/inventory/${item.id}`)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <ActionGuard permission={PERMISSIONS.CLINIC_INVENTORY.ISSUE}>
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => setTxDialogItem(item)}>
                                <ArrowUpDown className="h-3.5 w-3.5" />
                              </Button>
                            </ActionGuard>
                            <ActionGuard permission={PERMISSIONS.CLINIC_INVENTORY.MANAGE}>
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => setEditingItem(item)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(item)}>
                                <Trash2 className="h-3.5 w-3.5" />
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
          </div>
        </TabsContent>

        {/* Part requests tab */}
        <TabsContent value="requests" className="mt-4">
          {requestedItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <ClipboardList className="h-8 w-8 mx-auto opacity-40" />
              <p className="font-medium">لا توجد طلبات قطع حالياً</p>
              <p className="text-sm max-w-sm mx-auto">تظهر هنا طلبات القطع التي يرسلها الفنيون عند عدم توفر صنف بالمخزون</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...requestedItems]
                .sort((a, b) => (a.status === "PENDING" ? 0 : 1) - (b.status === "PENDING" ? 0 : 1))
                .map((item) => (
                  <Card key={item.id}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(item.createdAt).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        </div>
                        {item.status && (
                          <Badge variant="outline" className={`text-xs ${REQUEST_STATUS_BADGE[item.status]}`}>
                            {REQUEST_STATUS_LABEL[item.status]}
                          </Badge>
                        )}
                      </div>
                      <ActionGuard permission={PERMISSIONS.CLINIC_INVENTORY.MANAGE}>
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-start">
                          <Textarea
                            rows={2}
                            placeholder="ملاحظة للفني (اختياري)..."
                            value={reviewNotes[item.id] ?? item.notes ?? ""}
                            onChange={(e) => setReviewNotes((s) => ({ ...s, [item.id]: e.target.value }))}
                          />
                          <div className="flex sm:flex-col gap-1.5">
                            <Button size="sm" disabled={updateItem.isPending} onClick={() => handleReviewStatus(item, "APPROVED")}>اعتماد</Button>
                            <Button size="sm" variant="outline" disabled={updateItem.isPending} onClick={() => handleReviewStatus(item, "DONE")}>تم</Button>
                            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={updateItem.isPending} onClick={() => handleReviewStatus(item, "NOT_AVAILABLE")}>لا يوجد</Button>
                          </div>
                        </div>
                      </ActionGuard>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Transactions tab */}
        <TabsContent value="transactions" className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>ملاحظات</TableHead>
                  <TableHead>بواسطة</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد حركات</TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.item?.name ?? tx.itemId}</TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium ${TX_COLOR[tx.type]}`}>{TX_LABEL[tx.type]}</span>
                      </TableCell>
                      <TableCell className={`font-mono font-bold ${tx.type === "RECEIVE" || tx.type === "RETURN" ? "text-green-600" : "text-red-600"}`}>
                        {tx.type === "RECEIVE" || tx.type === "RETURN" ? "+" : "-"}{tx.quantity}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.notes ?? "—"}</TableCell>
                      <TableCell className="text-sm">{tx.performedByName ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("ar")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Low stock tab */}
        <TabsContent value="low-stock" className="mt-4">
          {lowStock.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <Package className="h-8 w-8 mx-auto opacity-40" />
              <p className="font-medium">لا توجد تنبيهات نقص حالياً</p>
              <p className="text-sm max-w-sm mx-auto">ستظهر التنبيهات فقط بعد تحديد الحد الأدنى للأصناف — استخدم فلتر "بيانات ناقصة" لتعبئة البيانات الناقصة</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {lowStock.map((item) => (
                <Card key={item.id} className="border-orange-200">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-orange-600">{item.currentStock}</p>
                        <p className="text-xs text-muted-foreground">الحد: {item.minStockLevel}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-3 gap-2"
                      onClick={() => setTxDialogItem(item)}>
                      <Plus className="h-3.5 w-3.5" /> إضافة مخزون
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New item dialog */}
      <InventoryItemFormDialog open={newItemOpen} onOpenChange={setNewItemOpen} />

      {/* Edit item dialog */}
      <InventoryItemFormDialog open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)} item={editingItem} />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`حذف "${deleteTarget?.name ?? ""}"؟`}
        description="سيتم إخفاء الصنف من المخزون، ويمكن استرجاعه لاحقاً عبر استيراد نفس الكود من ملف Excel."
        variant="destructive"
        onConfirm={() => { if (deleteTarget) deleteItem.mutate(deleteTarget.id); setDeleteTarget(null); }}
      />

      {/* Excel import errors */}
      <Dialog open={!!importResult} onOpenChange={(o) => !o && setImportResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>نتيجة الاستيراد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              تم استيراد <span className="font-bold text-green-600">{importResult?.created}</span> صنف،
              وتخطي <span className="font-bold text-destructive">{importResult?.skipped}</span>.
            </p>
            {importResult?.errors && importResult.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1 max-h-60 overflow-y-auto">
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">{err}</p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setImportResult(null)}>حسناً</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction dialog */}
      <Dialog open={!!txDialogItem} onOpenChange={(o) => !o && setTxDialogItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حركة مخزون — {txDialogItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-sm text-muted-foreground">المخزون الحالي</p>
              <p className="text-3xl font-bold">{txDialogItem?.currentStock}</p>
              <p className="text-xs text-muted-foreground">{txDialogItem?.unit}</p>
            </div>
            <div className="space-y-1.5">
              <Label>نوع الحركة</Label>
              <Select value={txForm.type} onValueChange={(v) => setTxForm((f) => ({ ...f, type: v as TransactionType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TX_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>الكمية <span className="text-destructive">*</span></Label>
              <Input type="number" min={1} value={txForm.quantity} onChange={(e) => setTxForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Input value={txForm.notes} onChange={(e) => setTxForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDialogItem(null)}>إلغاء</Button>
            <Button onClick={handleAddTx} disabled={!txForm.quantity || addTx.isPending}>
              {addTx.isPending ? "جاري الحفظ..." : "تسجيل الحركة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
