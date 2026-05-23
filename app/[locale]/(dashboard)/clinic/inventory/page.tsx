"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Plus, Search, AlertTriangle, Package, Eye, ArrowUpDown } from "lucide-react";
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
import {
  useInventoryItems, useLowStockAlerts, useInventoryCategories,
  useCreateInventoryItem, useAddInventoryTransaction, useInventoryTransactions,
} from "@/lib/hooks/use-clinic-inventory";
import { InventoryItem, ItemType, TransactionType, CreateItemDto } from "@/lib/api/clinic-inventory";

const TYPE_LABEL: Record<ItemType, string> = { COMPONENT: "قطعة", CONSUMABLE: "مستهلك" };
const TX_LABEL: Record<TransactionType, string> = {
  RECEIVE: "استلام", ISSUE: "صرف", ADJUST: "تسوية", RETURN: "إرجاع",
};
const TX_COLOR: Record<TransactionType, string> = {
  RECEIVE: "text-green-600", ISSUE: "text-red-600", ADJUST: "text-blue-600", RETURN: "text-orange-600",
};

export default function InventoryPage() {
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ItemType | "all">("all");
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [txDialogItem, setTxDialogItem] = useState<InventoryItem | null>(null);
  const [newItemForm, setNewItemForm] = useState<Partial<CreateItemDto>>({
    code: "", name: "", type: "COMPONENT", minStockLevel: 5, unit: "قطعة",
  });
  const [txForm, setTxForm] = useState({ type: "RECEIVE" as TransactionType, quantity: "1", notes: "" });

  const { data: items = [], isLoading } = useInventoryItems({
    search: search || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
  });
  const { data: lowStock = [] } = useLowStockAlerts();
  const { data: categories = [] } = useInventoryCategories();
  const { data: transactions = [] } = useInventoryTransactions();

  const createItem = useCreateInventoryItem();
  const addTx = useAddInventoryTransaction();

  const handleCreateItem = async () => {
    if (!newItemForm.code || !newItemForm.name) return;
    await createItem.mutateAsync(newItemForm as CreateItemDto);
    setNewItemOpen(false);
    setNewItemForm({ code: "", name: "", type: "COMPONENT", minStockLevel: 5, unit: "قطعة" });
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="المخزون الطبي"
        description="إدارة قطع الأطراف الصناعية والمستهلكات"
        actions={
          <ActionGuard permission={PERMISSIONS.CLINIC_INVENTORY.MANAGE}>
            <Button onClick={() => setNewItemOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة صنف
            </Button>
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
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الكود</TableHead>
                    <TableHead className="text-right">الصنف</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">التصنيف</TableHead>
                    <TableHead className="text-right">المخزون</TableHead>
                    <TableHead className="text-right">الحد الأدنى</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <EmptyState icon={Package} title="لا توجد أصناف" description="أضف أول صنف للمخزون" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item: InventoryItem) => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">{item.code}</TableCell>
                        <TableCell className="font-medium">
                          {item.name}
                          {item.description && <p className="text-xs text-muted-foreground truncate max-w-40">{item.description}</p>}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{TYPE_LABEL[item.type]}</Badge></TableCell>
                        <TableCell className="text-sm">{item.category?.name ?? "—"}</TableCell>
                        <TableCell>
                          <span className={item.isLowStock ? "text-orange-600 font-bold" : "font-medium"}>
                            {item.currentStock}
                          </span>
                          {item.unit && <span className="text-xs text-muted-foreground mr-1">{item.unit}</span>}
                          {item.isLowStock && <AlertTriangle className="h-3.5 w-3.5 text-orange-500 inline mr-1" />}
                        </TableCell>
                        <TableCell className="text-sm">{item.minStockLevel}</TableCell>
                        <TableCell className="text-sm">{item.unitPrice ? `${item.unitPrice.toLocaleString("ar")} ل.س` : "—"}</TableCell>
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

        {/* Transactions tab */}
        <TabsContent value="transactions" className="mt-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الصنف</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">ملاحظات</TableHead>
                  <TableHead className="text-right">بواسطة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
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
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>المخزون في مستوى جيد</p>
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
      <Dialog open={newItemOpen} onOpenChange={setNewItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>إضافة صنف جديد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>الكود <span className="text-destructive">*</span></Label>
                <Input value={newItemForm.code ?? ""} onChange={(e) => setNewItemForm((f) => ({ ...f, code: e.target.value }))} placeholder="PRO-001" />
              </div>
              <div className="space-y-1.5">
                <Label>النوع</Label>
                <Select value={newItemForm.type} onValueChange={(v) => setNewItemForm((f) => ({ ...f, type: v as ItemType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPONENT">قطعة</SelectItem>
                    <SelectItem value="CONSUMABLE">مستهلك</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>الاسم <span className="text-destructive">*</span></Label>
              <Input value={newItemForm.name ?? ""} onChange={(e) => setNewItemForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>الحد الأدنى للمخزون</Label>
                <Input type="number" min={0} value={newItemForm.minStockLevel ?? 5} onChange={(e) => setNewItemForm((f) => ({ ...f, minStockLevel: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>الوحدة</Label>
                <Input value={newItemForm.unit ?? ""} onChange={(e) => setNewItemForm((f) => ({ ...f, unit: e.target.value }))} placeholder="قطعة، متر..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>التصنيف</Label>
              <Select value={newItemForm.categoryId ?? ""} onValueChange={(v) => setNewItemForm((f) => ({ ...f, categoryId: v || undefined }))}>
                <SelectTrigger><SelectValue placeholder="اختر تصنيفاً" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">بدون تصنيف</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>وصف</Label>
              <Textarea rows={2} value={newItemForm.description ?? ""} onChange={(e) => setNewItemForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewItemOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateItem} disabled={!newItemForm.code || !newItemForm.name || createItem.isPending}>
              {createItem.isPending ? "جاري الحفظ..." : "إضافة"}
            </Button>
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
