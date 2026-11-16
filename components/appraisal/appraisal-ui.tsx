"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  AppraisalCycleStatus,
  AppraisalSubmissionStatus,
  AppraisalTaskStatus,
  BonusTier,
} from "@/lib/api/appraisal";

const CYCLE_STATUS_CLASS: Record<AppraisalCycleStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  OPEN: "bg-green-100 text-green-700 border-green-200",
  CLOSED: "bg-amber-100 text-amber-700 border-amber-200",
  FINALIZED: "bg-blue-100 text-blue-700 border-blue-200",
};

export function CycleStatusBadge({ status }: { status: AppraisalCycleStatus }) {
  const t = useTranslations("appraisal.cycleStatus");
  return (
    <Badge variant="outline" className={CYCLE_STATUS_CLASS[status]}>
      {t(status)}
    </Badge>
  );
}

const TASK_STATUS_CLASS: Record<AppraisalTaskStatus, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700 border-slate-200",
  DRAFT: "bg-amber-100 text-amber-700 border-amber-200",
  SUBMITTED: "bg-green-100 text-green-700 border-green-200",
};

export function TaskStatusBadge({ status }: { status: AppraisalTaskStatus | AppraisalSubmissionStatus }) {
  const t = useTranslations("appraisal.taskStatus");
  return (
    <Badge variant="outline" className={TASK_STATUS_CLASS[status]}>
      {t(status)}
    </Badge>
  );
}

const TIER_CLASS: Record<BonusTier, string> = {
  EXCEPTIONAL: "bg-emerald-100 text-emerald-700 border-emerald-200",
  HIGH: "bg-blue-100 text-blue-700 border-blue-200",
  BASIC: "bg-amber-100 text-amber-700 border-amber-200",
  PIP: "bg-red-100 text-red-700 border-red-200",
};

export function BonusTierBadge({ tier }: { tier: BonusTier | null | undefined }) {
  const t = useTranslations("appraisal.bonusTier");
  if (!tier) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={TIER_CLASS[tier]}>
      {t(tier)}
    </Badge>
  );
}

/** يعرض النسبة أو «لا ينطبق» حين يكون المحور غير منطبق (null). */
export function PercentCell({ value, className }: { value: number | null | undefined; className?: string }) {
  const t = useTranslations("appraisal");
  if (value === null || value === undefined) {
    return <span className={cn("text-xs text-muted-foreground", className)}>{t("notApplicable")}</span>;
  }
  return <span className={cn("tabular-nums", className)}>{formatNumber(value)}%</span>;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return "—";
  return Number(value.toFixed(digits)).toString();
}

/** اختيار درجة من 1 إلى maxScore — أزرار مرقّمة. */
export function ScorePicker({
  maxScore,
  value,
  onChange,
  disabled,
}: {
  maxScore: number;
  value: number | undefined;
  onChange: (score: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: maxScore }, (_, i) => i + 1).map((score) => {
        const selected = value === score;
        return (
          <button
            key={score}
            type="button"
            disabled={disabled}
            onClick={() => onChange(score)}
            className={cn(
              "h-9 min-w-9 rounded-md border px-2 text-sm font-medium tabular-nums transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-accent",
              disabled && !selected && "opacity-50",
              disabled ? "cursor-not-allowed" : "cursor-pointer",
            )}
          >
            {score}
          </button>
        );
      })}
    </div>
  );
}
