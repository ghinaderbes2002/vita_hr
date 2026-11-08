"use client";

// تسعير قطع الأطراف الصناعية: لكل قطعة سعر بيع = أساس (آخر سعر شراء أو أعلى
// سعر شراء) + رقم ثابت. القطع والأسعار تأتي من فواتير الشراء المرحَّلة.

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Pencil, Search, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useProstheticsPricing, useSetProstheticPricing } from "@/lib/hooks/use-warehouse-pricing";
import { computeFinalPrice } from "@/lib/api/warehouse-pricing";
import type { PriceBasis, ProfitType, ProstheticPartPricing } from "@/lib/api/warehouse-pricing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWarehouseFormat } from "@/components/features/warehouse/shared";
import { localizedName } from "@/components/features/warehouse/utils";
import { cn } from "@/lib/utils";

const LIMIT = 20;
const COLUMNS = 8;
/** Radix rejects an empty option value, so "no profit" needs a sentinel. */
const NO_PROFIT = "NONE";

/** A profit of 0 reads as none — that is how "no profit" is saved (see PricingForm). */
const hasProfit = (p: Pick<ProstheticPartPricing, "profitType" | "profitValue">) =>
  !!p.profitType && p.profitValue != null && p.profitValue > 0;

export default function ProstheticsPricingPage() {
  return (
    <PageGuard permission={PERMISSIONS.WAREHOUSE_PRICING_PROSTHETICS.VIEW}>
      <ProstheticsPricingContent />
    </PageGuard>
  );
}

function ProstheticsPricingContent() {
  const t = useTranslations("warehouse.prostheticsPricing");
  const locale = useLocale();
  const fmt = useWarehouseFormat();
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search.trim());
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ProstheticPartPricing | null>(null);

  const { data, isLoading, isError } = useProstheticsPricing({ page, limit: LIMIT, search: term || undefined });
  const parts = data?.items ?? [];

  const profitLabel = (p: ProstheticPartPricing) =>
    !hasProfit(p) ? "—" : p.profitType === "PERCENT" ? `${fmt.qty(p.profitValue)}%` : fmt.money(p.profitValue);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} count={data?.total} />

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t("searchPlaceholder")}
          className="ps-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("part")}</TableHead>
              <TableHead>{t("lastPurchasePrice")}</TableHead>
              <TableHead>{t("highestPurchasePrice")}</TableHead>
              <TableHead>{t("priceBasis")}</TableHead>
              <TableHead>{t("markupAmount")}</TableHead>
              <TableHead>{t("profit")}</TableHead>
              <TableHead>{t("finalPrice")}</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: COLUMNS }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={COLUMNS} className="py-10 text-center text-sm text-destructive">
                  {t("loadFailed")}
                </TableCell>
              </TableRow>
            ) : parts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS}>
                  <EmptyState
                    icon={<Tags className="h-8 w-8 text-muted-foreground" />}
                    title={term ? t("noResults") : t("empty")}
                    description={term ? undefined : t("emptyHint")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              parts.map((p) => (
                <TableRow key={p.itemId}>
                  <TableCell>
                    <p className="font-medium">{localizedName(p, locale) || "—"}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {[p.partCode, p.sku].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </TableCell>
                  {/* The price the basis points at is the one that counts — set apart. */}
                  <TableCell className={cn("tabular-nums", p.priceBasis === "LAST_PURCHASE" && "font-semibold")}>
                    {fmt.money(p.lastPurchasePrice)}
                  </TableCell>
                  <TableCell className={cn("tabular-nums", p.priceBasis === "HIGHEST_PURCHASE" && "font-semibold")}>
                    {fmt.money(p.highestPurchasePrice)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {p.priceBasis === "HIGHEST_PURCHASE" ? t("basisHighest") : t("basisLast")}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">+ {fmt.money(p.markupAmount)}</TableCell>
                  <TableCell className="tabular-nums">{hasProfit(p) ? <>+ {profitLabel(p)}</> : "—"}</TableCell>
                  <TableCell className="font-semibold tabular-nums text-primary">
                    {/* No basis yet means a part never bought: nothing to price from. */}
                    {p.finalPrice != null
                      ? fmt.money(p.finalPrice)
                      : <span className="text-xs font-normal text-muted-foreground">{t("notBoughtYet")}</span>}
                  </TableCell>
                  <TableCell>
                    <ActionGuard permission={PERMISSIONS.WAREHOUSE_PRICING_PROSTHETICS.MANAGE}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("edit")} onClick={() => setEditing(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </ActionGuard>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(data?.totalPages ?? 1) > 1 && (
        <Pagination
          page={page}
          totalPages={data!.totalPages}
          total={data!.total}
          limit={data!.limit || LIMIT}
          onPageChange={setPage}
        />
      )}

      <PricingDialog part={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function PricingDialog({ part, onClose }: { part: ProstheticPartPricing | null; onClose: () => void }) {
  const save = useSetProstheticPricing();
  return (
    <Dialog open={!!part} onOpenChange={(o) => { if (!o && !save.isPending) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        {/* Keyed on the part so each opening starts from its saved values. */}
        {part && <PricingForm key={part.itemId} part={part} onClose={onClose} save={save} />}
      </DialogContent>
    </Dialog>
  );
}

function PricingForm({ part, onClose, save }: {
  part: ProstheticPartPricing;
  onClose: () => void;
  /** Owned by the dialog, which must not close while a save is in flight. */
  save: ReturnType<typeof useSetProstheticPricing>;
}) {
  const t = useTranslations("warehouse.prostheticsPricing");
  const locale = useLocale();
  const fmt = useWarehouseFormat();
  const [basis, setBasis] = useState<PriceBasis>(part.priceBasis);
  const [markup, setMarkup] = useState(String(part.markupAmount ?? 0));
  // The profit is added on top of the fixed amount — the two are separate.
  const [profitType, setProfitType] = useState<ProfitType | typeof NO_PROFIT>(
    hasProfit(part) ? part.profitType! : NO_PROFIT,
  );
  const [profitValue, setProfitValue] = useState(hasProfit(part) ? String(part.profitValue) : "");

  const markupNumber = Number(markup);
  const markupValid = markup.trim() !== "" && Number.isFinite(markupNumber) && markupNumber >= 0;
  const profitNumber = Number(profitValue);
  const profitValid = profitType === NO_PROFIT ||
    (profitValue.trim() !== "" && Number.isFinite(profitNumber) && profitNumber >= 0);
  const valid = markupValid && profitValid;
  const basisValue = basis === "HIGHEST_PURCHASE" ? part.highestPurchasePrice : part.lastPurchasePrice;
  const preview = valid
    ? computeFinalPrice(basisValue, markupNumber, profitType === NO_PROFIT ? null : profitType, profitNumber)
    : null;

  const submit = async () => {
    if (!valid) return;
    try {
      await save.mutateAsync({
        itemId: part.itemId,
        dto: {
          markupAmount: markupNumber,
          priceBasis: basis,
          // The API documents no way to clear a profit, so "none" is saved as a
          // fixed profit of 0 — the same price, and read back as none.
          ...(profitType === NO_PROFIT
            ? (hasProfit(part) ? { profitType: "FIXED" as const, profitValue: 0 } : {})
            : { profitType, profitValue: profitNumber }),
        },
      });
      onClose();
    } catch {
      // Toasted by the hook; the dialog stays open to fix it.
    }
  };

  const options: { value: PriceBasis; label: string; price: number | null }[] = [
    { value: "LAST_PURCHASE", label: t("basisLast"), price: part.lastPurchasePrice },
    { value: "HIGHEST_PURCHASE", label: t("basisHighest"), price: part.highestPurchasePrice },
  ];

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("editTitle")}</DialogTitle>
      </DialogHeader>
      <p className="text-sm">
        <span className="font-medium">{localizedName(part, locale) || "—"}</span>
        {part.partCode && <span className="ms-2 font-mono text-xs text-muted-foreground">{part.partCode}</span>}
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t("priceBasis")}</Label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={basis === o.value}
                onClick={() => setBasis(o.value)}
                className={cn(
                  "rounded-md border p-3 text-start transition-colors",
                  basis === o.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50",
                )}
              >
                <span className="block text-xs text-muted-foreground">{o.label}</span>
                <span className="block text-base font-semibold tabular-nums">{fmt.money(o.price)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="markup">{t("markupAmount")}</Label>
          <Input
            id="markup"
            type="number"
            min={0}
            step="any"
            dir="ltr"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
          />
          <p className={cn("text-xs", markupValid ? "text-muted-foreground" : "text-destructive")}>{t("markupHint")}</p>
        </div>

        <div className="space-y-1.5">
          <Label>{t("profit")}</Label>
          <div className="flex gap-2">
            <Select value={profitType} onValueChange={(v) => setProfitType(v as ProfitType | typeof NO_PROFIT)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROFIT}>{t("profitNone")}</SelectItem>
                <SelectItem value="PERCENT">{t("profitPercent")}</SelectItem>
                <SelectItem value="FIXED">{t("profitFixed")}</SelectItem>
              </SelectContent>
            </Select>
            {profitType !== NO_PROFIT && (
              <div className="relative flex-1">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  dir="ltr"
                  value={profitValue}
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

        <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t("finalPrice")}</span>
          <span className="text-base font-semibold tabular-nums">
            {basisValue == null ? <span className="text-xs font-normal text-muted-foreground">{t("notBoughtYet")}</span> : fmt.money(preview)}
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={save.isPending}>{t("cancel")}</Button>
        <Button onClick={submit} disabled={!valid || save.isPending}>
          {save.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t("save")}
        </Button>
      </DialogFooter>
    </>
  );
}
