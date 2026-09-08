"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { assetUrl, cn } from "@/lib/utils";
import { useEmployees, useEmployeesBasicList, useEmployeesByDepartment } from "@/lib/hooks/use-employees";
import { employeesApi } from "@/lib/api/employees";
import { useJobTitles } from "@/lib/hooks/use-job-titles";
import { useDepartments } from "@/lib/hooks/use-departments";
import { useAllUsers } from "@/lib/hooks/use-users";
import type { Employee } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserOption {
  id: string;
  label: string;
}

// Senior-management job titles excluded from bulk "select all" so a mass email
// doesn't automatically reach them — they can still be added individually.
// Matched (case-insensitive) against a job title's code (most stable) or name.
const SELECT_ALL_EXCLUDED_TITLES = new Set([
  "vtx-jtl-000003", "المدير التنفيذي", "ceo",         // CEO
  "vtx-jtl-000002", "المدير العام", "general manager", // General Manager
]);

function isExcludedTitle(jobTitle: any): boolean {
  const candidates = [jobTitle?.nameAr, jobTitle?.nameEn, jobTitle?.titleAr, jobTitle?.code]
    .filter(Boolean)
    .map((s: string) => s.trim().toLowerCase());
  return candidates.some((c) => SELECT_ALL_EXCLUDED_TITLES.has(c));
}

/** Card footprint used when placing the hover preview. */
const PREVIEW_W = 112;
const PREVIEW_H = 130;

/**
 * Centres the preview under the hovered chip, clamped to the viewport, and
 * flips above the chip when there is no room below.
 */
function previewPosition(p: { top: number; bottom: number; left: number; right: number }): React.CSSProperties {
  const vw = typeof window === "undefined" ? PREVIEW_W + 16 : window.innerWidth;
  const vh = typeof window === "undefined" ? PREVIEW_H + 16 : window.innerHeight;
  const centered = p.left + (p.right - p.left) / 2 - PREVIEW_W / 2;
  const left = Math.min(Math.max(8, centered), vw - PREVIEW_W - 8);
  const below = p.bottom + 6;
  const top = below + PREVIEW_H > vh - 8 ? Math.max(8, p.top - PREVIEW_H - 6) : below;
  return { top, left };
}

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  exclude?: string[];
  requireLinkedUser?: boolean;
}

export function UserSearchSelect({ value, onChange, placeholder, exclude = [], requireLinkedUser = false }: Props) {
  const t = useTranslations("mail");
  const resolvedPlaceholder = placeholder ?? t("searchEmployee");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState("__all__");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: deptData } = useDepartments({ limit: 200 });
  const departments: any[] = (deptData as any)?.data?.items || (deptData as any)?.data || [];

  const { data: allData, isLoading: allLoading } = useEmployeesBasicList();
  const { data: allUsersData } = useAllUsers();
  const userIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    const users = (allUsersData as any)?.data?.items ?? (allUsersData as any)?.data ?? [];
    for (const u of users) {
      if (u.id && u.fullName) map[u.id] = u.fullName;
    }
    return map;
  }, [allUsersData]);

  // The basic list has no job title, so pull the full list once (this system's
  // employee count is small) to know each employee's job title. limit is 500 —
  // the backend rejects larger values with 400, and 500 covers all employees.
  const { data: fullEmployeesData } = useEmployees({ limit: 500 });
  const { data: jobTitlesData } = useJobTitles({ limit: 500 });

  // The employees list returns jobTitleId (a UUID) rather than the nested job
  // title object, so resolve the excluded titles to their IDs via the job
  // titles list, then match employees by jobTitleId.
  const excludedJobTitleIds = useMemo(() => {
    const set = new Set<string>();
    const titles = (jobTitlesData as any)?.data?.items ?? (jobTitlesData as any)?.data ?? [];
    for (const jt of titles) {
      if (jt?.id && isExcludedTitle(jt)) set.add(jt.id);
    }
    return set;
  }, [jobTitlesData]);

  // Employee IDs whose job title is senior management — excluded from bulk
  // "select all" (still individually selectable).
  const excludedEmployeeIds = useMemo(() => {
    const set = new Set<string>();
    const emps = (fullEmployeesData as any)?.data?.items ?? (fullEmployeesData as any)?.data ?? [];
    for (const e of emps) {
      if (!e.id) continue;
      if ((e.jobTitleId && excludedJobTitleIds.has(e.jobTitleId)) || isExcludedTitle(e.jobTitle)) {
        set.add(e.id);
      }
    }
    return set;
  }, [fullEmployeesData, excludedJobTitleIds]);
  // Photo per employee, read off the full list this component already fetches.
  const photoById = useMemo(() => {
    const map: Record<string, string> = {};
    const payload = (fullEmployeesData as { data?: Employee[] | { items?: Employee[] } } | undefined)?.data;
    const emps: Employee[] = Array.isArray(payload) ? payload : payload?.items ?? [];
    for (const e of emps) {
      if (e?.id && e.profilePhoto) map[e.id] = e.profilePhoto;
    }
    return map;
  }, [fullEmployeesData]);

  // Hovering a chosen recipient's chip shows that employee's photo. Position is
  // taken from the chip's own rect and rendered fixed, so no ancestor's overflow
  // can clip the preview.
  const [preview, setPreview] = useState<
    { id: string; label: string; top: number; bottom: number; left: number; right: number } | null
  >(null);

  // Falls back to fetching the one hovered employee when the list response
  // carries no photo field. Cached forever and never retried: an employee record
  // is heavy (the photo travels inline) and the preview is a nicety — it must not
  // turn a hover into a burst of retries against a struggling server.
  const fallbackId = preview && !photoById[preview.id] ? preview.id : "";
  const { data: hoveredEmployee } = useQuery({
    queryKey: ["employee-photo", fallbackId],
    queryFn: () => employeesApi.getById(fallbackId),
    enabled: !!fallbackId,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const previewPhoto = preview
    ? photoById[preview.id] ?? hoveredEmployee?.profilePhoto ?? null
    : null;

  const { data: deptData2, isLoading: deptLoading } = useEmployeesByDepartment(
    selectedDeptId !== "__all__" ? selectedDeptId : ""
  );

  const isLoading = selectedDeptId === "__all__" ? allLoading : deptLoading;
  const rawItems: any[] = selectedDeptId === "__all__"
    ? (Array.isArray(allData) ? allData : [])
    : (Array.isArray(deptData2) ? deptData2 : []);

  const filtered = query
    ? rawItems.filter((e: any) =>
        `${e.firstNameAr} ${e.lastNameAr}`.includes(query) ||
        `${e.firstNameEn} ${e.lastNameEn}`.toLowerCase().includes(query.toLowerCase())
      )
    : rawItems;

  const options: UserOption[] = filtered
    .filter((e: any) => e.id && !exclude.includes(e.id) && (!requireLinkedUser || !!e.userId) && e.employmentStatus === "ACTIVE")
    .map((e: any) => ({ id: e.id, label: `${e.firstNameAr} ${e.lastNameAr}` }));

  // Normalize: if value contains user IDs instead of employee IDs, swap them once data loads
  useEffect(() => {
    if (!Array.isArray(allData) || allData.length === 0) return;
    const normalized = value.map((id) => {
      if ((allData as any[]).some((e) => e.id === id)) return id;
      const byUser = (allData as any[]).find((e) => e.userId === id);
      return byUser ? byUser.id : id;
    });
    if (normalized.some((id, i) => id !== value[i])) onChange(normalized);
  }, [allData]);

  const selectedOptions = (Array.isArray(allData) ? allData as any[] : [])
    .filter((e) => value.includes(e.id) || value.includes(e.userId))
    .map((e) => ({ id: e.id, userId: e.userId as string | undefined, label: `${e.firstNameAr} ${e.lastNameAr}` }));

  // Options that "select all" acts on — excludes senior management.
  const bulkOptions = options.filter((o) => !excludedEmployeeIds.has(o.id));
  const allVisibleSelected = bulkOptions.length > 0 && bulkOptions.every((o) => value.includes(o.id));

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      // Clear every visible recipient (including any manually-added executive).
      const visibleIds = new Set(options.map((o) => o.id));
      onChange(value.filter((v) => !visibleIds.has(v)));
    } else {
      // Add only non-executive recipients.
      const newIds = bulkOptions.filter((o) => !value.includes(o.id)).map((o) => o.id);
      onChange([...value, ...newIds]);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Selected badges */}
      {value.length > 0 && (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1">
            {value.map((id) => {
              const opt = selectedOptions.find((o) => o.id === id || o.userId === id);
              const label = opt?.label ?? userIdToName[id] ?? id;
              const employeeId = opt?.id ?? id;
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="gap-1 text-xs"
                  onMouseEnter={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setPreview({
                      id: employeeId, label,
                      top: r.top, bottom: r.bottom, left: r.left, right: r.right,
                    });
                  }}
                  onMouseLeave={() => setPreview((p) => (p?.id === employeeId ? null : p))}
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((v) => v !== id))}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            {t("clearAll", { count: value.length })}
          </button>
        </div>
      )}

      {/* Department filter */}
      <Select value={selectedDeptId} onValueChange={(v) => { setSelectedDeptId(v); setQuery(""); setOpen(true); }}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="كل الأقسام" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">كل الأقسام</SelectItem>
          {departments.map((d: any) => (
            <SelectItem key={d.id} value={d.id}>
              {d.nameAr}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search + dropdown */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={resolvedPlaceholder}
            className="pr-9 h-9 text-sm"
          />
        </div>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-52 overflow-y-auto">
            {isLoading ? (
              <div className="p-2 space-y-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : options.length === 0 ? (
              <p className="px-3 py-4 text-sm text-center text-muted-foreground">{t("noResults")}</p>
            ) : (
              <>
                {/* تحديد الكل */}
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className={cn(
                    "w-full flex flex-wrap gap-2 items-center justify-between px-3 py-2 text-sm font-medium border-b hover:bg-muted transition-colors text-right",
                    allVisibleSelected && "bg-primary/5",
                  )}
                >
                  <span>{allVisibleSelected ? t("deselectAll") : t("selectAll")}</span>
                  {allVisibleSelected && <Check className="h-4 w-4 text-primary" />}
                </button>

                {options.map((opt) => {
                  const selected = value.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggle(opt.id)}
                      className={cn(
                        "w-full flex flex-wrap gap-2 items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors text-right",
                        selected && "bg-primary/5",
                      )}
                    >
                      <span>{opt.label}</span>
                      {selected && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}

        {preview && typeof document !== "undefined" && createPortal(
          <div
            className="fixed z-[200] pointer-events-none rounded-lg border bg-popover shadow-lg p-1.5 flex flex-col items-center gap-1"
            style={previewPosition(preview)}
          >
            {previewPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={assetUrl(previewPhoto)}
                alt={preview.label}
                className="h-24 w-24 rounded-md object-cover bg-muted"
              />
            ) : (
              <div className="h-24 w-24 rounded-md bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold">
                {preview.label.trim()[0] ?? "?"}
              </div>
            )}
            <span className="text-[11px] text-muted-foreground max-w-24 truncate">{preview.label}</span>
          </div>,
          document.body,
        )}
      </div>
    </div>
  );
}
