"use client";

import { useTranslations } from "next-intl";
import { EyeOff } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dec, DISCOUNT_TYPES, DiscountType } from "@/lib/api/warehouse-operations";
import { OptionSelect, useWarehouseFormat } from "./shared";
import { NONE } from "./utils";

interface DiscountFieldsProps {
  type: DiscountType | "";
  value: string;
  onChange: (type: DiscountType | "", value: string) => void;
}

/** Discount type + amount; "none" clears both. */
export function DiscountFields({ type, value, onChange }: DiscountFieldsProps) {
  const t = useTranslations("warehouse.shared");
  return (
    <div className="flex gap-2">
      <OptionSelect
        value={type || NONE}
        onChange={(v) => (v === NONE ? onChange("", "") : onChange(v as DiscountType, value))}
        options={[
          { value: NONE, label: t("noDiscount") },
          ...DISCOUNT_TYPES.map((d) => ({ value: d, label: t(`discountTypes.${d}`) })),
        ]}
        className="flex-1"
      />
      <Input
        type="number" min={0} step="any" className="w-28"
        disabled={!type}
        value={value}
        onChange={(e) => onChange(type, e.target.value)}
        aria-label={t("discountValue")}
      />
    </div>
  );
}

/** `{ discountType, discountValue }` for a request body, or nothing. */
export function discountDto(type: DiscountType | "", value: string) {
  const n = Number(value);
  return type && value.trim() !== "" && n > 0 ? { discountType: type, discountValue: n } : {};
}

/** Amount after a discount — for the live preview while filling a form. */
export function applyDiscount(amount: number, type: DiscountType | "" | null | undefined, value: unknown): number {
  const v = Number(value);
  if (!type || !Number.isFinite(v) || v <= 0) return amount;
  return Math.max(0, type === "PERCENT" ? amount * (1 - v / 100) : amount - v);
}

export interface PricedLine {
  key: string;
  name: string;
  sub?: string;
  qty: Dec;
  unitPrice?: Dec;
  discountType?: DiscountType | null;
  discountValue?: Dec | null;
  lineTotal?: Dec;
}

interface PricedLinesTableProps {
  lines: PricedLine[];
  currencyCode?: string | null;
  subtotal?: Dec;
  discountType?: DiscountType | null;
  discountValue?: Dec | null;
  total?: Dec;
}

/**
 * Lines of a purchase invoice, quotation or sales invoice.
 *
 * The backend strips every price field for users without the matching
 * view-prices permission, so the price columns are driven by what actually
 * arrived rather than by a permission check here.
 */
export function PricedLinesTable({
  lines, currencyCode, subtotal, discountType, discountValue, total,
}: PricedLinesTableProps) {
  const t = useTranslations("warehouse.shared");
  const fmt = useWarehouseFormat();
  const hasPrices = lines.some((l) => l.unitPrice !== undefined) || total !== undefined;
  const hasLineDiscount = lines.some((l) => l.discountType && Number(l.discountValue) > 0);

  const discountLabel = (type?: DiscountType | null, value?: Dec | null) =>
    type && Number(value) > 0 ? (type === "PERCENT" ? `${fmt.qty(value)}%` : fmt.money(value, currencyCode)) : "—";

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("item")}</TableHead>
              <TableHead>{t("quantity")}</TableHead>
              {hasPrices && <TableHead>{t("unitPrice")}</TableHead>}
              {hasPrices && hasLineDiscount && <TableHead>{t("discount")}</TableHead>}
              {hasPrices && <TableHead>{t("lineTotal")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l.key}>
                <TableCell className="font-medium">
                  {l.name}
                  {l.sub && <p className="text-xs font-normal text-muted-foreground">{l.sub}</p>}
                </TableCell>
                <TableCell>{fmt.qty(l.qty)}</TableCell>
                {hasPrices && <TableCell>{fmt.money(l.unitPrice)}</TableCell>}
                {hasPrices && hasLineDiscount && (
                  <TableCell>{discountLabel(l.discountType, l.discountValue)}</TableCell>
                )}
                {hasPrices && (
                  <TableCell className="font-medium">
                    {fmt.money(l.lineTotal ?? (l.unitPrice !== undefined ? Number(l.qty) * Number(l.unitPrice) : undefined))}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {hasPrices ? (
        <div className="ms-auto w-full max-w-xs space-y-1 text-sm">
          {subtotal !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("subtotal")}</span>
              <span>{fmt.money(subtotal, currencyCode)}</span>
            </div>
          )}
          {discountType && Number(discountValue) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("discount")}</span>
              <span>{discountLabel(discountType, discountValue)}</span>
            </div>
          )}
          {total !== undefined && (
            <div className="flex justify-between border-t pt-1 text-base font-bold">
              <span>{t("total")}</span>
              <span>{fmt.money(total, currencyCode)}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <EyeOff className="h-3.5 w-3.5" />
          {t("pricesHidden")}
        </p>
      )}
    </div>
  );
}
