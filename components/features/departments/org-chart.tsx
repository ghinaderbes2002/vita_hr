"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Department, Employee } from "@/types";
import {
  Building2, ChevronDown, ChevronRight, User,
  ZoomIn, ZoomOut, X, Maximize2, Search,
  ChevronsDownUp, ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { employeesApi } from "@/lib/api/employees";

const PX_PER_GRADE = 210;

function OrgChartNode({
  dept, level = 0, onSelect, globalExpand, searchQuery,
}: {
  dept: Department;
  level?: number;
  onSelect: (dept: Department) => void;
  globalExpand: boolean | null;
  searchQuery: string;
}) {
  const locale = useLocale();
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = dept.children && dept.children.length > 0;

  useEffect(() => {
    if (globalExpand !== null) setIsExpanded(globalExpand);
  }, [globalExpand]);

  const name = locale === "ar" ? dept.nameAr : dept.nameEn;
  const managerName = dept.manager
    ? `${dept.manager.firstNameAr} ${dept.manager.lastNameAr}`
    : null;

  const parentOrder = dept.grade?.order ?? 0;

  const isHighlighted =
    searchQuery.length >= 2 &&
    (dept.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dept.nameEn || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col items-center">
      <div
        onClick={() => onSelect(dept)}
        className={cn(
          "relative flex flex-col items-center rounded-xl border bg-card shadow-sm p-3 text-center transition-all hover:shadow-md cursor-pointer hover:border-primary/50",
          level === 0 ? "border-primary bg-primary/5 w-52" : "w-44",
          dept.grade?.color && "border-l-4",
          isHighlighted && "ring-2 ring-amber-400 shadow-amber-100 shadow-md bg-amber-50"
        )}
        style={dept.grade?.color ? { borderLeftColor: dept.grade.color } : undefined}
      >
        <div className={cn(
          "mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted",
          level === 0 && "bg-primary/20",
          isHighlighted && "bg-amber-200"
        )}>
          <Building2 className={cn("h-5 w-5 text-muted-foreground", level === 0 && "text-primary", isHighlighted && "text-amber-700")} />
        </div>

        <p className={cn("font-semibold text-sm leading-tight", level === 0 && "text-base", isHighlighted && "text-amber-800")}>{name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{dept.code}</p>

        {dept.grade && (
          <Badge
            variant="outline"
            className="mt-1.5 text-xs"
            style={dept.grade.color ? { borderColor: dept.grade.color, color: dept.grade.color } : undefined}
          >
            {dept.grade.nameAr}
          </Badge>
        )}

        {managerName && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-30">{managerName}</span>
          </div>
        )}

        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted transition-colors"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <>
          <div className="w-px h-6 bg-border mt-3" />
          <div className="relative flex gap-6 items-start">
            {dept.children!.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border"
                style={{ left: "50%", transform: "translateX(-50%)", width: "calc(100% - 88px)" }}
              />
            )}
            {dept.children!.map((child) => {
              const childOrder = child.grade?.order ?? parentOrder - 1;
              const gradeDiff = Math.max(1, parentOrder - childOrder);
              const lineH = (gradeDiff - 1) * PX_PER_GRADE + 24;
              return (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-px bg-border" style={{ height: lineH }} />
                  <OrgChartNode
                    dept={child}
                    level={level + 1}
                    onSelect={onSelect}
                    globalExpand={globalExpand}
                    searchQuery={searchQuery}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      {hasChildren && !isExpanded && (
        <div className="mt-4">
          <Badge variant="secondary" className="text-xs">+{dept.children!.length}</Badge>
        </div>
      )}
    </div>
  );
}

interface OrgChartProps {
  departments: Department[];
  allDepartments?: Department[];
}

export function OrgChart({ departments, allDepartments }: OrgChartProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [zoom, setZoom] = useState(1);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [globalExpand, setGlobalExpand] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(+(z + 0.1).toFixed(1), 2));
  const zoomOut = () => setZoom((z) => Math.max(+(z - 0.1).toFixed(1), 0.3));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const { data: deptEmployees, isLoading: empLoading } = useQuery({
    queryKey: ["employees-by-dept", selectedDept?.id],
    queryFn: () => employeesApi.getByDepartment(selectedDept!.id),
    enabled: !!selectedDept,
  });

  const gradeMap = useMemo(() => {
    const map = new Map<string, Department>();
    (allDepartments || []).forEach((d) => map.set(d.id, d));
    return map;
  }, [allDepartments]);

  const enrichTree = (nodes: Department[]): Department[] =>
    nodes.map((node) => {
      const enriched = gradeMap.get(node.id);
      return {
        ...node,
        grade: enriched?.grade ?? node.grade,
        gradeId: enriched?.gradeId ?? node.gradeId,
        children: node.children ? enrichTree(node.children) : undefined,
      };
    });

  const enrichedTree = useMemo(() => enrichTree(departments), [departments, gradeMap]);

  if (!departments || departments.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        {t("common.noData")}
      </div>
    );
  }

  const employees: Employee[] = Array.isArray(deptEmployees)
    ? deptEmployees
    : (deptEmployees as any)?.data || [];

  const selectedName = selectedDept
    ? (locale === "ar" ? selectedDept.nameAr : selectedDept.nameEn)
    : "";

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap p-3 border-b">
        <div className="relative w-56">
          <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="بحث عن قسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm pr-8"
          />
        </div>

        <div className="h-5 w-px bg-border" />

        <button
          onClick={() => setGlobalExpand(true)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border hover:bg-muted transition-colors"
        >
          <ChevronsUpDown className="h-3.5 w-3.5" />
          توسيع الكل
        </button>
        <button
          onClick={() => setGlobalExpand(false)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border hover:bg-muted transition-colors"
        >
          <ChevronsDownUp className="h-3.5 w-3.5" />
          طي الكل
        </button>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-0.5 border rounded-lg p-0.5">
          <button onClick={zoomOut} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button onClick={resetView} className="px-2 py-1 rounded-md text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-w-12 text-center">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={zoomIn} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button onClick={resetView} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground ms-auto hidden sm:block">
          اسحب للتنقل • اضغط على قسم لعرض موظفيه
        </p>
      </div>

      <div className="flex gap-4 items-start">
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden rounded-lg"
          style={{
            minHeight: "500px",
            maxHeight: "75vh",
            cursor: isDragging.current ? "grabbing" : "grab",
            userSelect: "none",
          }}
          onMouseDown={onMouseDown}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "top center",
              transition: isDragging.current ? "none" : "transform 0.12s ease",
              padding: "2rem",
              width: "max-content",
              minWidth: "100%",
            }}
          >
            <div className="flex gap-12 items-start min-w-max">
              {enrichedTree.map((dept) => (
                <OrgChartNode
                  key={dept.id}
                  dept={dept}
                  level={0}
                  onSelect={setSelectedDept}
                  globalExpand={globalExpand}
                  searchQuery={search}
                />
              ))}
            </div>
          </div>
        </div>

        {selectedDept && (
          <div className="w-72 shrink-0 rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div>
                <p className="font-semibold text-sm">{selectedName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {empLoading ? "..." : `${employees.length} موظف`}
                </p>
              </div>
              <button
                onClick={() => setSelectedDept(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="divide-y max-h-125 overflow-y-auto">
              {empLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                  </div>
                ))
              ) : employees.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">لا يوجد موظفون</p>
              ) : (
                employees.map((emp) => (
                  <div key={emp.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {emp.firstNameAr} {emp.lastNameAr}
                      </p>
                      {emp.jobTitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {locale === "ar" ? emp.jobTitle.nameAr : emp.jobTitle.nameEn}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
