"use client";

import { useMemo } from "react";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { useJobTitles } from "@/lib/hooks/use-job-titles";

/**
 * Who a question belongs to, as one value: everyone, one job title, or one
 * employee. Encoded as a string because that is what Select carries around.
 */
export type CriteriaTarget = string;

export const TARGET_ALL: CriteriaTarget = "all";

export function targetOf(criteria: { jobTitleId?: string | null; targetEmployeeId?: string | null }): CriteriaTarget {
  if (criteria.jobTitleId) return `job:${criteria.jobTitleId}`;
  if (criteria.targetEmployeeId) return `emp:${criteria.targetEmployeeId}`;
  return TARGET_ALL;
}

/** Splits the value back into the two fields the API expects. */
export function targetToPayload(target: CriteriaTarget): {
  jobTitleId: string | null;
  targetEmployeeId: string | null;
} {
  if (target.startsWith("job:")) return { jobTitleId: target.slice(4), targetEmployeeId: null };
  if (target.startsWith("emp:")) return { jobTitleId: null, targetEmployeeId: target.slice(4) };
  return { jobTitleId: null, targetEmployeeId: null };
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

interface CriteriaTargetSelectProps {
  value: CriteriaTarget;
  onChange: (value: CriteriaTarget) => void;
  className?: string;
}

export function CriteriaTargetSelect({ value, onChange, className }: CriteriaTargetSelectProps) {
  const { data: employeesData } = useEmployeesBasicList();
  const employees: { id: string; firstNameAr: string; lastNameAr: string }[] =
    Array.isArray(employeesData) ? employeesData : [];
  const jobTitles = useJobTitleOptions();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={TARGET_ALL}>سؤال عام — لكل الموظفين</SelectItem>
        {jobTitles.length > 0 && (
          <SelectGroup>
            <SelectLabel>مسمى وظيفي — لكل موظفيه</SelectLabel>
            {jobTitles.map((t) => (
              <SelectItem key={t.id} value={`job:${t.id}`}>{jobTitleLabel(t)}</SelectItem>
            ))}
          </SelectGroup>
        )}
        {employees.length > 0 && (
          <SelectGroup>
            <SelectLabel>موظف محدد</SelectLabel>
            {employees.map((e) => (
              <SelectItem key={e.id} value={`emp:${e.id}`}>{e.firstNameAr} {e.lastNameAr}</SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
