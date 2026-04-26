"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/lib/hooks/use-employees";

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

export function UserSearchSelect({ value, onChange, placeholder = "ابحث عن موظف...", exclude = [] }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useEmployees({ search: query || undefined, limit: 30 });

  const rawItems: any[] = Array.isArray((data as any)?.data?.items)
    ? (data as any).data.items
    : Array.isArray((data as any)?.items)
    ? (data as any).items
    : Array.isArray(data)
    ? data
    : [];

  const options: UserOption[] = rawItems
    .filter((e: any) => e.userId && !exclude.includes(e.userId))
    .map((e: any) => ({
      id: e.userId,  // userId مو employee.id — البريد بيستخدم user IDs
      label: `${e.firstNameAr} ${e.lastNameAr}`,
    }));

  const selectedOptions = options.filter((o) => value.includes(o.id));

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const remove = (id: string) => onChange(value.filter((v) => v !== id));

  const allVisibleSelected = options.length > 0 && options.every((o) => value.includes(o.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      // أزل فقط الـ IDs الظاهرة حالياً
      const visibleIds = new Set(options.map((o) => o.id));
      onChange(value.filter((v) => !visibleIds.has(v)));
    } else {
      // أضف الظاهرين غير المحددين
      const newIds = options.filter((o) => !value.includes(o.id)).map((o) => o.id);
      onChange([...value, ...newIds]);
    }
  };

  // Close on outside click
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
    <div ref={containerRef} className="relative">
      {/* Selected badges */}
      {value.length > 0 && (
        <div className="mb-1.5 space-y-1">
          <div className="flex flex-wrap gap-1">
            {value.map((id) => {
              const opt = options.find((o) => o.id === id) ?? rawItems.find((e: any) => e.userId === id);
              const label = opt
                ? (opt as any).label ?? `${(opt as any).firstNameAr} ${(opt as any).lastNameAr}`
                : id;
              return (
                <Badge key={id} variant="secondary" className="gap-1 text-xs">
                  {label}
                  <button
                    type="button"
                    onClick={() => remove(id)}
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
            مسح الكل ({value.length})
          </button>
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pr-9 h-9 text-sm"
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-52 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 space-y-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : options.length === 0 ? (
            <p className="px-3 py-4 text-sm text-center text-muted-foreground">لا توجد نتائج</p>
          ) : (
            <>
              {/* Select All row */}
              <button
                type="button"
                onClick={toggleSelectAll}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm font-medium border-b hover:bg-muted transition-colors text-right",
                  allVisibleSelected && "bg-primary/5",
                )}
              >
                <span>{allVisibleSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}</span>
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
  );
}
