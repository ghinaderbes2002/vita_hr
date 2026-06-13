"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useEmployeesBasicList, useEmployeesByDepartment } from "@/lib/hooks/use-employees";
import { useDepartments } from "@/lib/hooks/use-departments";
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

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  exclude?: string[];
}

export function UserSearchSelect({ value, onChange, placeholder, exclude = [] }: Props) {
  const t = useTranslations("mail");
  const resolvedPlaceholder = placeholder ?? t("searchEmployee");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState("__all__");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: deptData } = useDepartments({ limit: 200 });
  const departments: any[] = (deptData as any)?.data?.items || (deptData as any)?.data || [];

  const { data: allData, isLoading: allLoading } = useEmployeesBasicList();
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
    .filter((e: any) => e.id && !exclude.includes(e.id))
    .map((e: any) => ({ id: e.id, label: `${e.firstNameAr} ${e.lastNameAr}` }));

  const selectedOptions = (Array.isArray(allData) ? allData : [])
    .filter((e: any) => value.includes(e.id))
    .map((e: any) => ({ id: e.id, label: `${e.firstNameAr} ${e.lastNameAr}` }));

  const allVisibleSelected = options.length > 0 && options.every((o) => value.includes(o.id));

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(options.map((o) => o.id));
      onChange(value.filter((v) => !visibleIds.has(v)));
    } else {
      const newIds = options.filter((o) => !value.includes(o.id)).map((o) => o.id);
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
              const opt = selectedOptions.find((o) => o.id === id);
              const label = opt?.label ?? id;
              return (
                <Badge key={id} variant="secondary" className="gap-1 text-xs">
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
                    "w-full flex items-center justify-between px-3 py-2 text-sm font-medium border-b hover:bg-muted transition-colors text-right",
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
                        "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors text-right",
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
      </div>
    </div>
  );
}
