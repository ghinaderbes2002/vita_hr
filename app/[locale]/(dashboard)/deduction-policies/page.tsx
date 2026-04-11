"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  nameAr: "", nameEn: "", isDefault: false, isActive: true,
  lateToleranceMinutes: 0, lateDeductionType: "MINUTE_BY_MINUTE", lateDeductionTiers: [],
  earlyLeaveDeductionType: "MINUTE_BY_MINUTE", earlyLeaveTiers: [],
  absenceDeductionDays: 1, repeatLateThreshold: "", repeatLatePenaltyDays: "",
  breakOverLimitDeduction: "MINUTE_BY_MINUTE",
};

function formToData(form: PolicyFormData): CreateDeductionPolicyData {
  return {
    nameAr: form.nameAr, nameEn: form.nameEn, isDefault: form.isDefault, isActive: form.isActive,
    lateToleranceMinutes: form.lateToleranceMinutes, lateDeductionType: form.lateDeductionType,
    lateDeductionTiers: form.lateDeductionType === "TIERED" ? form.lateDeductionTiers : undefined,
    earlyLeaveDeductionType: form.earlyLeaveDeductionType,
    earlyLeaveTiers: form.earlyLeaveDeductionType === "TIERED" ? form.earlyLeaveTiers : undefined,
    absenceDeductionDays: form.absenceDeductionDays,
    repeatLateThreshold: form.repeatLateThreshold ? Number(form.repeatLateThreshold) : undefined,
    repeatLatePenaltyDays: form.repeatLatePenaltyDays ? Number(form.repeatLatePenaltyDays) : undefined,
    breakOverLimitDeduction: form.breakOverLimitDeduction,
  };
}

function TiersEditor({ tiers, onChange, t }: { tiers: DeductionTier[]; onChange: (tiers: DeductionTier[]) => void; t: any }) {
  function addTier() {
    const last = tiers[tiers.length - 1];
    const from = last ? (last.toMinute ?? 0) + 1 : 1;
    onChange([...tiers, { fromMinute: from, toMinute: null, deductionDays: 0.5 }]);
  }
  function updateTier(i: number, field: keyof DeductionTier, value: any) {
    onChange(tiers.map((tr, idx) => (idx === i ? { ...tr, [field]: value === "" ? null : Number(value) } : tr)));
  }
  function removeTier(i: number) {
    onChange(tiers.filter((_, idx) => idx !== i));
  }
  return (
    <div className="space-y-2">
      {tiers.map((tier, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <Input type="number" value={tier.fromMinute} onChange={(e) => updateTier(i, "fromMinute", e.target.value)} className="w-16 h-8" placeholder="0" />
          <span className="text-muted-foreground">–</span>
          <Input type="number" value={tier.toMinute ?? ""} onChange={(e) => updateTier(i, "toMinute", e.target.value)} className="w-16 h-8" placeholder="∞" />
          <span className="text-muted-foreground text-xs">{t("form.minuteLabel")}</span>
          <Input type="number" step="0.25" value={tier.deductionDays} onChange={(e) => updateTier(i, "deductionDays", e.target.value)} className="w-20 h-8" />
          <span className="text-muted-foreground text-xs">{t("form.dayLabel")}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeTier(i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={addTier}>
        <Plus className="h-3 w-3" />{t("form.addTier")}
      </Button>
    </div>
  );
}

export default function DeductionPoliciesPage() {
  const t = useTranslations("deductionPolicies");
  const tCommon = useTranslations("common");

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
      nameAr: policy.nameAr, nameEn: policy.nameEn, isDefault: policy.isDefault, isActive: policy.isActive,
      lateToleranceMinutes: policy.lateToleranceMinutes, lateDeductionType: policy.lateDeductionType,
      lateDeductionTiers: policy.lateDeductionTiers || [], earlyLeaveDeductionType: policy.earlyLeaveDeductionType,
      earlyLeaveTiers: policy.earlyLeaveTiers || [], absenceDeductionDays: policy.absenceDeductionDays,
      repeatLateThreshold: policy.repeatLateThreshold?.toString() || "",
      repeatLatePenaltyDays: policy.repeatLatePenaltyDays?.toString() || "",
      breakOverLimitDeduction: policy.breakOverLimitDeduction,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.nameAr.trim()) return;
    const payload = formToData(form);
    if (selectedPolicy) {
      updatePolicy.mutate({ id: selectedPolicy.id, data: payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createPolicy.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        count={policies.length}
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />{t("createPolicy")}
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
          title={t("empty.title")}
          description={t("empty.description")}
          action={
            <Button onClick={openCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />{t("createPolicy")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {policies.map((policy) => (
            <Card key={policy.id} className={`relative ${policy.isDefault ? "ring-2 ring-primary" : ""} ${!policy.isActive ? "opacity-60" : ""}`}>
              {policy.isDefault && (
                <div className="absolute top-3 end-3">
                  <Badge className="gap-1 bg-primary text-xs">
                    <Star className="h-3 w-3 fill-current" />{t("default")}
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{policy.nameAr}</CardTitle>
                <p className="text-xs text-muted-foreground">{policy.nameEn}</p>
                {!policy.isActive && <Badge variant="secondary" className="w-fit text-xs">{t("disabled")}</Badge>}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("card.lateTolerance")}</span>
                  <span className="font-medium">{t("card.minutesUnit", { count: policy.lateToleranceMinutes })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("card.lateDeduction")}</span>
                  <span className="font-medium">{t(`deductionType.${policy.lateDeductionType}`)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("card.absenceDeduction")}</span>
                  <span className="font-medium">{t("card.dayPerDay", { days: policy.absenceDeductionDays })}</span>
                </div>
                {policy.repeatLateThreshold && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("card.repeatPenalty")}</span>
                    <span className="font-medium text-xs">
                      {t("card.repeatPenaltyValue", { threshold: policy.repeatLateThreshold, days: policy.repeatLatePenaltyDays })}
                    </span>
                  </div>
                )}
                {policy.lateDeductionType === "TIERED" && policy.lateDeductionTiers?.length ? (
                  <div className="pt-1 border-t">
                    <p className="text-xs text-muted-foreground mb-1">{t("card.lateTiers")}</p>
                    {policy.lateDeductionTiers.map((tier, i) => (
                      <div key={i} className="text-xs flex gap-1">
                        <span>{tier.fromMinute}–{tier.toMinute ?? "∞"} د</span>
                        <span className="text-muted-foreground">←</span>
                        <span className="font-medium">{tier.deductionDays} {t("form.dayLabel")}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" className="gap-1 flex-1 h-8 text-xs" onClick={() => openEdit(policy)}>
                    <Pencil className="h-3 w-3" />{t("card.edit")}
                  </Button>
                  {!policy.isDefault && (
                    <>
                      <Button variant="outline" size="sm" className="gap-1 h-8 text-xs text-primary border-primary/30"
                        onClick={() => updatePolicy.mutate({ id: policy.id, data: { isDefault: true } })}
                        disabled={updatePolicy.isPending}>
                        <CheckCircle2 className="h-3 w-3" />{t("card.setDefault")}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { setSelectedPolicy(policy); setDeleteDialogOpen(true); }}>
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
            <DialogTitle>{selectedPolicy ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("form.nameAr")} *</Label>
                <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.nameEn")}</Label>
                <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center justify-between flex-1 rounded-lg border p-3">
                <Label className="cursor-pointer">{t("form.activate")}</Label>
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              </div>
              <div className="flex items-center justify-between flex-1 rounded-lg border p-3">
                <Label className="cursor-pointer">{t("form.default")}</Label>
                <Switch checked={form.isDefault} onCheckedChange={(v) => setForm({ ...form, isDefault: v })} />
              </div>
            </div>

            {/* Late settings */}
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">{t("form.lateSettings")}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("form.tolerance")}</Label>
                  <Input type="number" value={form.lateToleranceMinutes} onChange={(e) => setForm({ ...form, lateToleranceMinutes: Number(e.target.value) })} min={0} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("form.deductionType")}</Label>
                  <Select value={form.lateDeductionType} onValueChange={(v) => setForm({ ...form, lateDeductionType: v as DeductionType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MINUTE_BY_MINUTE">{t("deductionType.MINUTE_BY_MINUTE")}</SelectItem>
                      <SelectItem value="TIERED">{t("deductionType.TIERED")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.lateDeductionType === "TIERED" && (
                <div className="space-y-1.5">
                  <Label>{t("form.lateTiers")}</Label>
                  <TiersEditor tiers={form.lateDeductionTiers} onChange={(tiers) => setForm({ ...form, lateDeductionTiers: tiers })} t={t} />
                </div>
              )}
            </div>

            {/* Early leave */}
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">{t("form.earlyLeave")}</p>
              <div className="space-y-1.5">
                <Label>{t("form.deductionType")}</Label>
                <Select value={form.earlyLeaveDeductionType} onValueChange={(v) => setForm({ ...form, earlyLeaveDeductionType: v as DeductionType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MINUTE_BY_MINUTE">{t("deductionType.MINUTE_BY_MINUTE")}</SelectItem>
                    <SelectItem value="TIERED">{t("deductionType.TIERED")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.earlyLeaveDeductionType === "TIERED" && (
                <div className="space-y-1.5">
                  <Label>{t("form.earlyLeaveTiers")}</Label>
                  <TiersEditor tiers={form.earlyLeaveTiers} onChange={(tiers) => setForm({ ...form, earlyLeaveTiers: tiers })} t={t} />
                </div>
              )}
            </div>

            {/* Absence + break */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("form.absenceDeduction")}</Label>
                <Input type="number" step="0.25" value={form.absenceDeductionDays} onChange={(e) => setForm({ ...form, absenceDeductionDays: Number(e.target.value) })} min={0} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.breakDeduction")}</Label>
                <Select value={form.breakOverLimitDeduction} onValueChange={(v) => setForm({ ...form, breakOverLimitDeduction: v as DeductionType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MINUTE_BY_MINUTE">{t("deductionType.MINUTE_BY_MINUTE")}</SelectItem>
                    <SelectItem value="TIERED">{t("deductionType.TIERED")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Repeat penalty */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("form.repeatThreshold")}</Label>
                <Input type="number" value={form.repeatLateThreshold} onChange={(e) => setForm({ ...form, repeatLateThreshold: e.target.value })} placeholder={t("form.repeatThresholdPlaceholder")} min={0} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.repeatPenaltyDays")}</Label>
                <Input type="number" step="0.25" value={form.repeatLatePenaltyDays} onChange={(e) => setForm({ ...form, repeatLatePenaltyDays: e.target.value })} placeholder="0.5" min={0} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tCommon("cancel")}</Button>
            <Button onClick={handleSubmit} disabled={!form.nameAr.trim() || createPolicy.isPending || updatePolicy.isPending}>
              {selectedPolicy ? t("form.save") : t("form.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("delete.title")}
        description={t("delete.description", { name: selectedPolicy?.nameAr ?? "" })}
        onConfirm={() => { if (selectedPolicy) deletePolicy.mutate(selectedPolicy.id, { onSuccess: () => setDeleteDialogOpen(false) }); }}
        variant="destructive"
      />
    </div>
  );
}
