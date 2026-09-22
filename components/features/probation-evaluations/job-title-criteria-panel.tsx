"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProbationCriteria } from "@/lib/api/probation-criteria";
import {
  useProbationCriteria,
  useProbationCriteriaByJobTitle,
  useSetCriteriaEnabledForJobTitle,
} from "@/lib/hooks/use-probation-criteria";
import { jobTitleLabel, useJobTitleOptions } from "./criteria-target-select";

interface JobTitleCriteriaPanelProps {
  /** The panel is mounted with the dialog, so queries only run while it is open. */
  active: boolean;
}

export function JobTitleCriteriaPanel({ active }: JobTitleCriteriaPanelProps) {
  const [jobTitleId, setJobTitleId] = useState("");
  const qc = useQueryClient();

  const jobTitles = useJobTitleOptions();
  const { data: allData, isLoading: allLoading } = useProbationCriteria(active);
  const { data: titleData, isLoading: titleLoading } =
    useProbationCriteriaByJobTitle(active ? jobTitleId : "");
  const setEnabled = useSetCriteriaEnabledForJobTitle();

  const allCriteria: ProbationCriteria[] = useMemo(
    () => (Array.isArray(allData) ? allData : []),
    [allData],
  );

  // A question aimed at one employee is not a job-title matter, and one attached
  // to another job title never reaches this one.
  const relevant = useMemo(
    () => allCriteria
      .filter((c) => c.isActive !== false && !c.targetEmployeeId)
      .filter((c) => !c.jobTitleId || c.jobTitleId === jobTitleId)
      .slice().sort((a, b) => a.displayOrder - b.displayOrder),
    [allCriteria, jobTitleId],
  );

  // Whatever the backend says this title's evaluations actually contain.
  const enabledIds = useMemo(() => {
    const list: ProbationCriteria[] = Array.isArray(titleData) ? titleData : [];
    return new Set(list.map((c) => c.id));
  }, [titleData]);

  const loading = allLoading || (!!jobTitleId && titleLoading);
  const excludedCount = relevant.filter((c) => !c.isCore && !enabledIds.has(c.id)).length;

  function toggle(criteria: ProbationCriteria, isEnabled: boolean) {
    if (!jobTitleId) return;
    // Move the switch straight away; the mutation re-syncs from the server when
    // it settles, so a rejected call snaps back on its own.
    qc.setQueryData<ProbationCriteria[]>(
      ["probation-criteria", "by-job-title", jobTitleId],
      (prev) => {
        const list = prev ?? [];
        if (isEnabled) return list.some((c) => c.id === criteria.id) ? list : [...list, criteria];
        return list.filter((c) => c.id !== criteria.id);
      },
    );
    setEnabled.mutate({ jobTitleId, criteriaId: criteria.id, isEnabled });
  }

  return (
    <div className="space-y-3 py-2">
      <div className="space-y-1.5">
        <Label>المسمى الوظيفي</Label>
        <Select value={jobTitleId} onValueChange={setJobTitleId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="اختر مسمى وظيفياً" />
          </SelectTrigger>
          <SelectContent>
            {jobTitles.map((t) => (
              <SelectItem key={t.id} value={t.id}>{jobTitleLabel(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          إطفاء سؤال هنا يستثنيه من تقييمات هذا المسمى الوظيفي فقط، دون حذفه أو التأثير على بقية
          المسميات أو على التقييمات المنشأة سابقاً.
        </p>
      </div>

      {!jobTitleId ? (
        <p className="text-sm text-muted-foreground text-center py-8">اختر مسمى وظيفياً لعرض أسئلته</p>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : relevant.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">لا توجد أسئلة بعد</p>
      ) : (
        <>
          <div className="text-xs">
            {excludedCount > 0 ? (
              <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700">
                {excludedCount} سؤال مستثنى من هذا المسمى الوظيفي
              </Badge>
            ) : (
              <Badge variant="secondary">بدون استثناءات — كل الأسئلة مفعّلة</Badge>
            )}
          </div>

          <div className="space-y-1.5">
            {relevant.map((c) => {
              const isOn = c.isCore || enabledIds.has(c.id);
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-2 rounded-lg border p-2 ${isOn ? "" : "bg-muted/40"}`}
                >
                  <Switch
                    checked={isOn}
                    disabled={c.isCore || setEnabled.isPending}
                    onCheckedChange={(v) => toggle(c, v)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isOn ? "font-medium" : "text-muted-foreground line-through"}`}>
                      {c.nameAr}
                    </p>
                    {c.nameEn && <p className="text-xs text-muted-foreground truncate">{c.nameEn}</p>}
                  </div>
                  {c.jobTitleId === jobTitleId && (
                    <Badge variant="outline" className="text-[10px] shrink-0 border-blue-300 bg-blue-50 text-blue-700">
                      خاص بهذا المسمى
                    </Badge>
                  )}
                  {c.isCore && <Badge variant="secondary" className="text-[10px] shrink-0">أساسي</Badge>}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            الأسئلة الأساسية تظهر لكل الموظفين ولا يمكن استثناؤها.
          </p>
        </>
      )}
    </div>
  );
}
