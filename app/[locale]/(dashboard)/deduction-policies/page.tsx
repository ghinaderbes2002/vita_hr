"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Star, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeductionPolicies,
  useCreateDeductionPolicy,
  useUpdateDeductionPolicy,
  useDeleteDeductionPolicy,
} from "@/lib/hooks/use-deduction-policies";
import {
  DeductionPolicy,
  CreateDeductionPolicyData,
  DeductionTier,
  DeductionType,
} from "@/lib/api/deduction-policies";

const DEDUCTION_TYPE_LABELS: Record<DeductionType, string> = {
  MINUTE_BY_MINUTE: "دقيقة بدقيقة",
  TIERED: "متدرج (شرائح)",
};

interface PolicyFormData {
  nameAr: string;
  nameEn: string;
  isDefault: boolean;
  isActive: boolean;
  lateToleranceMinutes: number;
  lateDeductionType: DeductionType;
  lateDeductionTiers: DeductionTier[];
  earlyLeaveDeductionType: DeductionType;
  earlyLeaveTiers: DeductionTier[];
  absenceDeductionDays: number;
  repeatLateThreshold: string;
  repeatLatePenaltyDays: string;
  breakOverLimitDeduction: DeductionType;
}

const EMPTY_FORM: PolicyFormData = {
  nameAr: "",
  nameEn: "",
  isDefault: false,
  isActive: true,
  lateToleranceMinutes: 0,
  lateDeductionType: "MINUTE_BY_MINUTE",
  lateDeductionTiers: [],
  earlyLeaveDeductionType: "MINUTE_BY_MINUTE",
  earlyLeaveTiers: [],
  absenceDeductionDays: 1,
  repeatLateThreshold: "",
  repeatLatePenaltyDays: "",
  breakOverLimitDeduction: "MINUTE_BY_MINUTE",
};

function formToData(form: PolicyFormData): CreateDeductionPolicyData {
  return {
    nameAr: form.nameAr,
    nameEn: form.nameEn,
    isDefault: form.isDefault,
    isActive: form.isActive,
    lateToleranceMinutes: form.lateToleranceMinutes,
    lateDeductionType: form.lateDeductionType,
    lateDeductionTiers: form.lateDeductionType === "TIERED" ? form.lateDeductionTiers : undefined,
    earlyLeaveDeductionType: form.earlyLeaveDeductionType,
    earlyLeaveTiers: form.earlyLeaveDeductionType === "TIERED" ? form.earlyLeaveTiers : undefined,
    absenceDeductionDays: form.absenceDeductionDays,
    repeatLateThreshold: form.repeatLateThreshold ? Number(form.repeatLateThreshold) : undefined,
    repeatLatePenaltyDays: form.repeatLatePenaltyDays ? Number(form.repeatLatePenaltyDays) : undefined,
    breakOverLimitDeduction: form.breakOverLimitDeduction,
  };
}

function TiersEditor({
  tiers,
  onChange,
}: {
  tiers: DeductionTier[];
  onChange: (tiers: DeductionTier[]) => void;
}) {
  function addTier() {
    const last = tiers[tiers.length - 1];
    const from = last ? (last.toMinute ?? 0) + 1 : 1;
    onChange([...tiers, { fromMinute: from, toMinute: null, deductionDays: 0.5 }]);
  }

  function updateTier(i: number, field: keyof DeductionTier, value: any) {
    const next = tiers.map((t, idx) => (idx === i ? { ...t, [field]: value === "" ? null : Number(value) } : t));
    onChange(next);
  }

  function removeTier(i: number) {
    onChange(tiers.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {tiers.map((tier, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <Input
            type="number"
            value={tier.fromMinute}
            onChange={(e) => updateTier(i, "fromMinute", e.target.value)}
            className="w-16 h-8"
            placeholder="من"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            value={tier.toMinute ?? ""}
            onChange={(e) => updateTier(i, "toMinute", e.target.value)}
            className="w-16 h-8"
            placeholder="∞"
          />
          <span className="text-muted-foreground text-xs">دقيقة ←</span>
          <Input
            type="number"
            step="0.25"
            value={tier.deductionDays}
            onChange={(e) => updateTier(i, "deductionDays", e.target.value)}
            className="w-20 h-8"
          />
          <span className="text-muted-foreground text-xs">يوم</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeTier(i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={addTier}>
        <Plus className="h-3 w-3" />
        إضافة شريحة
      </Button>
    </div>
  );
}

export default function DeductionPoliciesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<DeductionPolicy | null>(null);
  const [form, setForm] = useState<PolicyFormData>(EMPTY_FORM);

  const { data, isLoading } = useDeductionPolicies(true);
  const createPolicy = useCreateDeductionPolicy();
  const updatePolicy = useUpdateDeductionPolicy();
  const deletePolicy = useDeleteDeductionPolicy();

  const policies: DeductionPolicy[] = (data as any) || [];

  function openCreate() {
    setSelectedPolicy(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(policy: DeductionPolicy) {
    setSelectedPolicy(policy);
    setForm({
      nameAr: policy.nameAr,
      nameEn: policy.nameEn,
      isDefault: policy.isDefault,
      isActive: policy.isActive,
      lateToleranceMinutes: policy.lateToleranceMinutes,
      lateDeductionType: policy.lateDeductionType,
      lateDeductionTiers: policy.lateDeductionTiers || [],
      earlyLeaveDeductionType: policy.earlyLeaveDeductionType,
      earlyLeaveTiers: policy.earlyLeaveTiers || [],
      absenceDeductionDays: policy.absenceDeductionDays,
      repeatLateThreshold: policy.repeatLateThreshold?.toString() || "",
      repeatLatePenaltyDays: policy.repeatLatePenaltyDays?.toString() || "",
      breakOverLimitDeduction: policy.breakOverLimitDeduction,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.nameAr.trim()) return;
    const data = formToData(form);
    if (selectedPolicy) {
      updatePolicy.mutate({ id: selectedPolicy.id, data }, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createPolicy.mutate(data, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  }

  function handleSetDefault(policy: DeductionPolicy) {
    updatePolicy.mutate({ id: policy.id, data: { isDefault: true } });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="سياسات الحسم"
        description="تحديد قواعد خصم التأخر والغياب والاستراحة على الرواتب"
        count={policies.length}
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            إنشاء سياسة
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : policies.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-10 w-10" />}
          title="لا توجد سياسات حسم"
          description="أنشئ سياسة حسم لتطبيق قواعد الخصم على الرواتب"
          action={
            <Button onClick={openCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء سياسة
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {policies.map((policy) => (
            <Card
              key={policy.id}
              className={`relative ${policy.isDefault ? "ring-2 ring-primary" : ""} ${!policy.isActive ? "opacity-60" : ""}`}
            >
              {policy.isDefault && (
                <div className="absolute top-3 end-3">
                  <Badge className="gap-1 bg-primary text-xs">
                    <Star className="h-3 w-3 fill-current" />
                    افتراضي
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{policy.nameAr}</CardTitle>
                <p className="text-xs text-muted-foreground">{policy.nameEn}</p>
                {!policy.isActive && (
                  <Badge variant="secondary" className="w-fit text-xs">معطل</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">هامش التأخر</span>
                  <span className="font-medium">{policy.lateToleranceMinutes} د</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">خصم التأخر</span>
                  <span className="font-medium">{DEDUCTION_TYPE_LABELS[policy.lateDeductionType]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">خصم الغياب</span>
                  <span className="font-medium">{policy.absenceDeductionDays} يوم/يوم</span>
                </div>
                {policy.repeatLateThreshold && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">عقوبة التكرار</span>
                    <span className="font-medium text-xs">
                      بعد {policy.repeatLateThreshold} مرة ← +{policy.repeatLatePenaltyDays} يوم
                    </span>
                  </div>
                )}

                {/* Tiers if any */}
                {policy.lateDeductionType === "TIERED" && policy.lateDeductionTiers?.length ? (
                  <div className="pt-1 border-t">
                    <p className="text-xs text-muted-foreground mb-1">شرائح التأخر:</p>
                    {policy.lateDeductionTiers.map((t, i) => (
                      <div key={i} className="text-xs flex gap-1">
                        <span>{t.fromMinute}–{t.toMinute ?? "∞"} د</span>
                        <span className="text-muted-foreground">←</span>
                        <span className="font-medium">{t.deductionDays} يوم</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" className="gap-1 flex-1 h-8 text-xs" onClick={() => openEdit(policy)}>
                    <Pencil className="h-3 w-3" />
                    تعديل
                  </Button>
                  {!policy.isDefault && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 h-8 text-xs text-primary border-primary/30"
                        onClick={() => handleSetDefault(policy)}
                        disabled={updatePolicy.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        تعيين افتراضي
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { setSelectedPolicy(policy); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPolicy ? "تعديل السياسة" : "إنشاء سياسة حسم"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Names */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>الاسم بالعربي *</Label>
                <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الاسم بالإنجليزي</Label>
                <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex gap-4">
              <div className="flex items-center justify-between flex-1 rounded-lg border p-3">
                <Label className="cursor-pointer">تفعيل</Label>
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              </div>
              <div className="flex items-center justify-between flex-1 rounded-lg border p-3">
                <Label className="cursor-pointer">افتراضي</Label>
                <Switch checked={form.isDefault} onCheckedChange={(v) => setForm({ ...form, isDefault: v })} />
              </div>
            </div>

            {/* Late settings */}
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">إعدادات التأخر</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>هامش السماح (دقيقة)</Label>
                  <Input
                    type="number"
                    value={form.lateToleranceMinutes}
                    onChange={(e) => setForm({ ...form, lateToleranceMinutes: Number(e.target.value) })}
                    min={0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>نوع الخصم</Label>
                  <Select
                    value={form.lateDeductionType}
                    onValueChange={(v) => setForm({ ...form, lateDeductionType: v as DeductionType })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MINUTE_BY_MINUTE">دقيقة بدقيقة</SelectItem>
                      <SelectItem value="TIERED">متدرج (شرائح)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.lateDeductionType === "TIERED" && (
                <div className="space-y-1.5">
                  <Label>شرائح التأخر (من – إلى دقيقة ← أيام خصم)</Label>
                  <TiersEditor
                    tiers={form.lateDeductionTiers}
                    onChange={(tiers) => setForm({ ...form, lateDeductionTiers: tiers })}
                  />
                </div>
              )}
            </div>

            {/* Early leave */}
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">إعدادات الخروج المبكر</p>
              <div className="space-y-1.5">
                <Label>نوع الخصم</Label>
                <Select
                  value={form.earlyLeaveDeductionType}
                  onValueChange={(v) => setForm({ ...form, earlyLeaveDeductionType: v as DeductionType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MINUTE_BY_MINUTE">دقيقة بدقيقة</SelectItem>
                    <SelectItem value="TIERED">متدرج (شرائح)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.earlyLeaveDeductionType === "TIERED" && (
                <div className="space-y-1.5">
                  <Label>شرائح الخروج المبكر</Label>
                  <TiersEditor
                    tiers={form.earlyLeaveTiers}
                    onChange={(tiers) => setForm({ ...form, earlyLeaveTiers: tiers })}
                  />
                </div>
              )}
            </div>

            {/* Absence + repeat penalty */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>خصم الغياب (أيام/يوم)</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={form.absenceDeductionDays}
                  onChange={(e) => setForm({ ...form, absenceDeductionDays: Number(e.target.value) })}
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>خصم تجاوز الاستراحة</Label>
                <Select
                  value={form.breakOverLimitDeduction}
                  onValueChange={(v) => setForm({ ...form, breakOverLimitDeduction: v as DeductionType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MINUTE_BY_MINUTE">دقيقة بدقيقة</SelectItem>
                    <SelectItem value="TIERED">متدرج</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Repeat penalty */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>عقوبة التكرار (بعد كم مرة)</Label>
                <Input
                  type="number"
                  value={form.repeatLateThreshold}
                  onChange={(e) => setForm({ ...form, repeatLateThreshold: e.target.value })}
                  placeholder="فارغ = لا عقوبة"
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>أيام العقوبة الإضافية</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={form.repeatLatePenaltyDays}
                  onChange={(e) => setForm({ ...form, repeatLatePenaltyDays: e.target.value })}
                  placeholder="0.5"
                  min={0}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.nameAr.trim() || createPolicy.isPending || updatePolicy.isPending}
            >
              {selectedPolicy ? "حفظ التعديلات" : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="حذف السياسة"
        description={`هل أنت متأكد من حذف سياسة "${selectedPolicy?.nameAr}"؟`}
        onConfirm={() => {
          if (selectedPolicy) deletePolicy.mutate(selectedPolicy.id, { onSuccess: () => setDeleteDialogOpen(false) });
        }}
        variant="destructive"
      />
    </div>
  );
}
