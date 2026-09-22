"use client";

import { useMemo, useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/shared/multi-select";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { useJobTitles } from "@/lib/hooks/use-job-titles";
import { ProbationCriteria } from "@/lib/api/probation-criteria";

/** Who a question belongs to: everyone, a set of job titles, or one employee. */
export interface CriteriaTarget {
  jobTitleIds: string[];
  targetEmployeeId: string | null;
}

export const EMPTY_TARGET: CriteriaTarget = { jobTitleIds: [], targetEmployeeId: null };

export function targetOf(criteria: ProbationCriteria): CriteriaTarget {
  // jobTitleId is the older single-value field, still sent by older records.
  const ids = criteria.jobTitleIds?.length
    ? criteria.jobTitleIds
    : criteria.jobTitleId
      ? [criteria.jobTitleId]
      : [];
  return { jobTitleIds: ids, targetEmployeeId: criteria.targetEmployeeId ?? null };
}

export function jobTitleIdsOf(criteria: ProbationCriteria): string[] {
  return targetOf(criteria).jobTitleIds;
}

interface JobTitleOption {
  id: string;
  nameAr?: string | null;
  nameEn?: string | null;
}

export function useJobTitleOptions(): JobTitleOption[] {
  const { data } = useJobTitles({ limit: 500 });
  return useMemo(() => {
    const raw = data as JobTitleOption[] | { data?: { items?: JobTitleOption[] } | JobTitleOption[] } | undefined;
    if (Array.isArray(raw)) return raw;
    const inner = raw?.data;
    if (Array.isArray(inner)) return inner;
    return inner?.items ?? [];
  }, [data]);
}

export function jobTitleLabel(t?: JobTitleOption | null) {
  return t?.nameAr || t?.nameEn || "";
}

type Mode = "all" | "job-titles" | "employee";

interface CriteriaTargetSelectProps {
  value: CriteriaTarget;
  onChange: (value: CriteriaTarget) => void;
  /**
   * Changes whenever the form this sits in is swapped for another one (another
   * row being edited, say), which is when the chosen mode stops applying.
   */
  resetKey: string;
  compact?: boolean;
}

export function CriteriaTargetSelect({ value, onChange, resetKey, compact }: CriteriaTargetSelectProps) {
  const { data: employeesData } = useEmployeesBasicList();
  const employees: { id: string; firstNameAr: string; lastNameAr: string }[] =
    Array.isArray(employeesData) ? employeesData : [];
  const jobTitles = useJobTitleOptions();

  // The mode follows the value, except while the user is on a mode they have not
  // filled in yet — an override that lasts until the form itself is swapped out.
  const derivedMode: Mode = value.targetEmployeeId
    ? "employee"
    : value.jobTitleIds.length > 0
      ? "job-titles"
      : "all";
  const [override, setOverride] = useState<{ key: string; mode: Mode } | null>(null);
  const mode = override?.key === resetKey ? override.mode : derivedMode;

  function changeMode(next: Mode) {
    setOverride({ key: resetKey, mode: next });
    onChange(EMPTY_TARGET);
  }

  const size = compact ? "h-8 text-xs" : "h-9 text-sm";

  return (
    <div className="space-y-1.5">
      <Select value={mode} onValueChange={(v) => changeMode(v as Mode)}>
        <SelectTrigger className={`w-full ${size}`}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">سؤال عام — لكل الموظفين</SelectItem>
          <SelectItem value="job-titles">مسميات وظيفية محددة</SelectItem>
          <SelectItem value="employee">موظف محدد</SelectItem>
        </SelectContent>
      </Select>

      {mode === "job-titles" && (
        <MultiSelect
          className={size}
          options={jobTitles.map((t) => ({ value: t.id, label: jobTitleLabel(t) }))}
          value={value.jobTitleIds}
          onChange={(ids) => onChange({ jobTitleIds: ids, targetEmployeeId: null })}
          placeholder="اختر مسمى وظيفياً أو أكثر"
          searchPlaceholder="بحث في المسميات الوظيفية..."
          emptyText="لا توجد مسميات مطابقة"
        />
      )}

      {mode === "employee" && (
        <Select
          value={value.targetEmployeeId ?? ""}
          onValueChange={(v) => onChange({ jobTitleIds: [], targetEmployeeId: v })}
        >
          <SelectTrigger className={`w-full ${size}`}>
            <SelectValue placeholder="اختر الموظف" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Picking a mode without filling it in still saves a general question, so
          say so rather than letting the scope change silently. */}
      {((mode === "job-titles" && value.jobTitleIds.length === 0)
        || (mode === "employee" && !value.targetEmployeeId)) && (
        <p className="text-[11px] text-orange-600">
          {mode === "job-titles" ? "لم تختر أي مسمى وظيفي" : "لم تختر أي موظف"} — سيُحفظ السؤال كسؤال عام.
        </p>
      )}
    </div>
  );
}
