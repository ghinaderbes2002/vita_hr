"use client";

// إعدادات تسعير القطعة: قاعدة واحدة تُطبَّق تلقائياً على كل قطع الأطراف الصناعية
// (كل صنف له رمز قطعة) في العروض المالية:
// سعر البيع = آخر أو أعلى سعر شراء للقطعة نفسها + الرقم الثابت + الربح.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  useProstheticsPricingSettings, useSaveProstheticsPricingSettings,
} from "@/lib/hooks/use-warehouse-pricing";
import { computeFinalPrice } from "@/lib/api/warehouse-pricing";
import type { PriceBasis, ProfitType, ProstheticsPricingSettings } from "@/lib/api/warehouse-pricing";
import { useWarehouseFormat } from "@/components/features/warehouse/shared";
import { cn } from "@/lib/utils";

/** Radix rejects an empty option value, so "no profit" needs a sentinel. */
const NO_PROFIT = "NONE";
/** The purchase price the worked example uses. */
const EXAMPLE_BASIS = 100;

/** A profit of 0 reads as none — that is how "no profit" is saved (see below). */
const hasProfit = (s: Pick<ProstheticsPricingSettings, "profitType" | "profitValue">) =>
  !!s.profitType && s.profitValue != null && s.profitValue > 0;

export default function ProstheticsPricingPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_PRICING_PROSTHETICS.VIEW}>
      <ProstheticsPricingContent />
    </PageGuard>
  );
}

function ProstheticsPricingContent() {
  const t = useTranslations("warehouse.prostheticsPricing");
  const { data: settings, isLoading, isError } = useProstheticsPricingSettings();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      {isLoading ? (
        <Skeleton className="h-96 w-full max-w-2xl rounded-xl" />
      ) : isError || !settings ? (
        <p className="text-sm text-destructive">{t("loadFailed")}</p>
      ) : (
        // Keyed on the save time, so a saved change reloads the form from the server.
        <SettingsForm key={settings.updatedAt ?? "new"} settings={settings} />
      )}
    </div>
  );
}

function SettingsForm({ settings }: { settings: ProstheticsPricingSettings }) {
  const t = useTranslations("warehouse.prostheticsPricing");
  const fmt = useWarehouseFormat();
  const { hasPermission, isAdmin } = usePermissions();
  const canManage = isAdmin() || hasPermission(PERMISSIONS.WAREHOUSE_PRICING_PROSTHETICS.MANAGE);
  const save = useSaveProstheticsPricingSettings();

  const [basis, setBasis] = useState<PriceBasis>(settings.priceBasis);
  const [markup, setMarkup] = useState(String(settings.markupAmount));
  // The profit is added on top of the fixed amount — the two are separate.
  const [profitType, setProfitType] = useState<ProfitType | typeof NO_PROFIT>(
    hasProfit(settings) ? settings.profitType! : NO_PROFIT,
  );
  const [profitValue, setProfitValue] = useState(hasProfit(settings) ? String(settings.profitValue) : "");

  const markupNumber = Number(markup);
  const markupValid = markup.trim() !== "" && Number.isFinite(markupNumber) && markupNumber >= 0;
  const profitNumber = Number(profitValue);
  const profitValid = profitType === NO_PROFIT ||
    (profitValue.trim() !== "" && Number.isFinite(profitNumber) && profitNumber >= 0);
  const valid = markupValid && profitValid;
  const example = valid
    ? computeFinalPrice(EXAMPLE_BASIS, markupNumber, profitType === NO_PROFIT ? null : profitType, profitNumber)
    : null;

  const submit = () => {
    if (!valid) return;
    save.mutate({
      markupAmount: markupNumber,
      priceBasis: basis,
      // The API documents no way to clear a profit, so "none" is saved as a fixed
      // profit of 0 — the same prices, and read back as none.
      ...(profitType === NO_PROFIT
        ? (hasProfit(settings) ? { profitType: "FIXED" as const, profitValue: 0 } : {})
        : { profitType, profitValue: profitNumber }),
    });
  };

  const bases: { value: PriceBasis; label: string; hint: string }[] = [
    { value: "LAST_PURCHASE", label: t("basisLast"), hint: t("basisLastHint") },
    { value: "HIGHEST_PURCHASE", label: t("basisHighest"), hint: t("basisHighestHint") },
  ];

  return (
    <Card className="max-w-2xl">
      <CardContent className="space-y-6 pt-6">
        <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{t("appliesToAll")}</p>

        <div className="space-y-2">
          <Label>{t("priceBasis")}</Label>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
            {bases.map((b) => (
              <button
                key={b.value}
                type="button"
                role="radio"
                aria-checked={basis === b.value}
                disabled={!canManage}
                onClick={() => setBasis(b.value)}
                className={cn(
                  "rounded-md border p-3 text-start transition-colors disabled:cursor-default",
                  basis === b.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50",
                )}
              >
                <span className="block text-sm font-medium">{b.label}</span>
                <span className="block text-xs text-muted-foreground">{b.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="markup">{t("markupAmount")}</Label>
            <Input
              id="markup" type="number" min={0} step="any" dir="ltr"
              value={markup} disabled={!canManage}
              onChange={(e) => setMarkup(e.target.value)}
            />
            <p className={cn("text-xs", markupValid ? "text-muted-foreground" : "text-destructive")}>{t("markupHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label>{t("profit")}</Label>
            <div className="flex gap-2">
              <Select
                value={profitType} disabled={!canManage}
                onValueChange={(v) => setProfitType(v as ProfitType | typeof NO_PROFIT)}
              >
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROFIT}>{t("profitNone")}</SelectItem>
                  <SelectItem value="PERCENT">{t("profitPercent")}</SelectItem>
                  <SelectItem value="FIXED">{t("profitFixed")}</SelectItem>
                </SelectContent>
              </Select>
              {profitType !== NO_PROFIT && (
                <div className="relative flex-1">
                  <Input
                    type="number" min={0} step="any" dir="ltr"
                    value={profitValue} disabled={!canManage}
                    onChange={(e) => setProfitValue(e.target.value)}
                    className={profitType === "PERCENT" ? "pe-7" : undefined}
                  />
                  {profitType === "PERCENT" && (
                    <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  )}
                </div>
              )}
            </div>
            <p className={cn("text-xs", profitValid ? "text-muted-foreground" : "text-destructive")}>
              {profitType === "PERCENT" ? t("profitPercentHint") : t("profitHint")}
            </p>
          </div>
        </div>

        {/* A worked example makes the rule concrete before it reaches every quotation. */}
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p className="text-muted-foreground">{t("exampleLabel", { basis: fmt.money(EXAMPLE_BASIS) })}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{fmt.money(example)}</p>
        </div>

        <p className="text-xs text-muted-foreground">{t("notBoughtHint")}</p>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <span className="text-xs text-muted-foreground">
            {settings.id && settings.updatedAt
              ? t("lastUpdated", { date: fmt.dateTime(settings.updatedAt) })
              : t("notSetYet")}
          </span>
          {canManage && (
            <Button onClick={submit} disabled={!valid || save.isPending}>
              {save.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("save")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
