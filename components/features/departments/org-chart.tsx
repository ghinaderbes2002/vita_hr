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
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { employeesApi } from "@/lib/api/employees";

// NODE_H must match the exact rendered card height — all cards are fixed to this height
const NODE_W = 184;
const NODE_H = 176;
const BUTTON_Y = 16;   // space below card for the toggle button
const H_GAP = 40;
const V_GAP = 80;
const COL_W = NODE_W + H_GAP;
const ROW_H = NODE_H + BUTTON_Y + V_GAP; // 272

const LEVEL_PALETTE = ["#6366f1", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];
function accentFor(dept: Department, row: number) {
  return dept.grade?.color || LEVEL_PALETTE[row % LEVEL_PALETTE.length];
}

type Positioned = {
  dept: Department;
  col: number;
  row: number;
  parentId: string | null;
};

function buildLayout(nodes: Department[], collapsed: Set<string>): Positioned[] {
  const result: Positioned[] = [];
  let leafIdx = 0;

  function place(node: Department, row: number, parentId: string | null): number {
    const children = !collapsed.has(node.id) ? (node.children ?? []) : [];

    if (children.length === 0) {
      const col = leafIdx++;
      result.push({ dept: node, col, row, parentId });
      return col;
    }

    const childCols = children.map((c) => place(c, row + 1, node.id));
    const col = (childCols[0] + childCols[childCols.length - 1]) / 2;
    result.push({ dept: node, col, row, parentId });
    return col;
  }

  nodes.forEach((root) => place(root, 0, null));
  return result;
}

function OrgNode({
  dept, row, isCollapsed, onToggle, onSelect, isHighlighted,
}: {
  dept: Department;
  row: number;
  isCollapsed: boolean;
  onToggle: () => void;
  onSelect: () => void;
  isHighlighted: boolean;
}) {
  const locale = useLocale();
  const hasChildren = !!(dept.children?.length);
  const name = locale === "ar" ? dept.nameAr : dept.nameEn;
  const managerName = dept.manager
    ? (locale === "ar"
        ? `${dept.manager.firstNameAr} ${dept.manager.lastNameAr}`
        : `${dept.manager.firstNameEn} ${dept.manager.lastNameEn}`)
    : null;
  const accent = accentFor(dept, row);

  return (
    // Outer wrapper: full height of the slot, relative for button positioning
    <div className="relative w-full h-full">

      {/* ── Card ── fixed height, overflow-hidden for the rounded top-bar */}
      <div
        onClick={onSelect}
        className={cn(
          "w-full h-full rounded-2xl border bg-card overflow-hidden cursor-pointer",
          "shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5",
          isHighlighted && "ring-2 ring-amber-400"
        )}
      >
        {/* Coloured accent stripe */}
        <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />

        <div className="flex flex-col items-center text-center px-3 pt-3 pb-4 gap-1">
          {/* Icon */}
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: accent + "18" }}
          >
            <Building2 className="h-5 w-5" style={{ color: accent }} />
          </div>

          {/* Name */}
          <p className={cn(
            "font-bold leading-snug line-clamp-2 w-full",
            row === 0 ? "text-sm" : "text-xs"
          )}>{name}</p>

          {/* Code */}
          <p className="text-[11px] text-muted-foreground/70 font-mono">{dept.code}</p>

          {/* Grade */}
          {dept.grade && (
            <div
              className="text-[10px] px-2 py-px rounded-full font-medium border"
              style={{ color: accent, borderColor: accent + "50", backgroundColor: accent + "0f" }}
            >
              {locale === "ar" ? dept.grade.nameAr : dept.grade.nameEn}
            </div>
          )}

          {/* Manager */}
          {managerName && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground w-full justify-center">
              <div
                className="h-3.5 w-3.5 shrink-0 rounded-full flex items-center justify-center"
                style={{ backgroundColor: accent + "20" }}
              >
                <User className="h-2 w-2" style={{ color: accent }} />
              </div>
              <span className="truncate max-w-[8rem]">{managerName}</span>
            </div>
          )}

          {/* Collapsed children count */}
          {hasChildren && isCollapsed && (
            <div
              className="text-[10px] px-2 py-px rounded-full font-semibold"
              style={{ backgroundColor: accent + "18", color: accent }}
            >
              +{dept.children!.length}
            </div>
          )}
        </div>
      </div>

      {/* ── Toggle button ── lives OUTSIDE overflow-hidden so it's always visible */}
      {hasChildren && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted transition-colors"
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const { data: deptEmployees, isLoading: empLoading } = useQuery({
    queryKey: ["employees-by-dept", selectedDept?.id],
    queryFn: () => employeesApi.getByDepartment(selectedDept!.id),
    enabled: !!selectedDept,
  });

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
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(+(z + 0.1).toFixed(1), 2));
  const zoomOut = () => setZoom((z) => Math.max(+(z - 0.1).toFixed(1), 0.3));

  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const cW = containerRef.current.clientWidth;
    const cH = containerRef.current.clientHeight;
    const nW = contentRef.current.offsetWidth;
    const nH = contentRef.current.offsetHeight;
    const scale = +Math.min(cW / nW, cH / nH, 1).toFixed(2);
    setZoom(scale);
    setPan({ x: (cW - nW * scale) / 2, y: (cH - nH * scale) / 2 });
  }, []);

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

  useEffect(() => { fitToScreen(); }, [enrichedTree, fitToScreen]);

  const allParentIds = useMemo(() => {
    const ids = new Set<string>();
    const walk = (nodes: Department[]) =>
      nodes.forEach((n) => { if (n.children?.length) { ids.add(n.id); walk(n.children); } });
    walk(enrichedTree);
    return ids;
  }, [enrichedTree]);

  const layout = useMemo(() => buildLayout(enrichedTree, collapsed), [enrichedTree, collapsed]);

  const posMap = useMemo(() => {
    const m = new Map<string, Positioned>();
    layout.forEach((n) => m.set(n.dept.id, n));
    return m;
  }, [layout]);

  const maxCol = layout.length ? Math.max(...layout.map((n) => n.col)) : 0;
  const maxRow = layout.length ? Math.max(...layout.map((n) => n.row)) : 0;
  const totalW = (Math.ceil(maxCol) + 1) * COL_W;
  const totalH = (maxRow + 1) * ROW_H;

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
      {/* ── Toolbar ── */}
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
          onClick={() => setCollapsed(new Set())}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border hover:bg-muted transition-colors"
        >
          <ChevronsUpDown className="h-3.5 w-3.5" />
          توسيع الكل
        </button>
        <button
          onClick={() => setCollapsed(new Set(allParentIds))}
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
          <button onClick={fitToScreen} className="px-2 py-1 rounded-md text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-w-12 text-center">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={zoomIn} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button onClick={fitToScreen} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground ms-auto hidden sm:block">
          اسحب للتنقل • اضغط على قسم لعرض موظفيه
        </p>
      </div>

      <div className="flex gap-4 items-start">
        {/* ── Canvas ── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden rounded-lg"
          style={{ minHeight: "500px", maxHeight: "75vh", cursor: "grab", userSelect: "none" }}
          onMouseDown={onMouseDown}
        >
          <div
            ref={contentRef}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "top left",
              transition: isDragging.current ? "none" : "transform 0.12s ease",
              position: "relative",
              width: totalW,
              height: totalH,
            }}
          >
            {/* ── SVG Connectors ── */}
            <svg
              style={{
                position: "absolute", top: 0, left: 0,
                width: totalW, height: totalH,
                overflow: "visible", pointerEvents: "none",
              }}
            >
              {layout.filter((n) => n.parentId).map(({ dept, col, row, parentId }) => {
                const parent = posMap.get(parentId!);
                if (!parent) return null;

                // px/py = centre-bottom of parent card (exact card edge, no button offset)
                const px = parent.col * COL_W + NODE_W / 2;
                const py = parent.row * ROW_H + NODE_H;

                // cx/cy = centre-top of child card
                const cx = col * COL_W + NODE_W / 2;
                const cy = row * ROW_H;

                const dx = cx - px;
                const accent = accentFor(parent.dept, parent.row);

                // Midpoint elbow with rounded corners
                const midY = (py + cy) / 2;
                const r = Math.min(14, Math.abs(dx) / 2);

                let d: string;
                if (Math.abs(dx) < 1) {
                  // Perfectly vertical — straight line
                  d = `M ${px} ${py} V ${cy}`;
                } else if (dx > 0) {
                  // Child is to the right
                  d = [
                    `M ${px} ${py}`,
                    `V ${midY - r}`,
                    `Q ${px} ${midY} ${px + r} ${midY}`,
                    `H ${cx - r}`,
                    `Q ${cx} ${midY} ${cx} ${midY + r}`,
                    `V ${cy}`,
                  ].join(" ");
                } else {
                  // Child is to the left
                  d = [
                    `M ${px} ${py}`,
                    `V ${midY - r}`,
                    `Q ${px} ${midY} ${px - r} ${midY}`,
                    `H ${cx + r}`,
                    `Q ${cx} ${midY} ${cx} ${midY + r}`,
                    `V ${cy}`,
                  ].join(" ");
                }

                return (
                  <path
                    key={dept.id}
                    d={d}
                    fill="none"
                    stroke={accent}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.55"
                  />
                );
              })}
            </svg>

            {/* ── Nodes ── */}
            {layout.map(({ dept, col, row }) => {
              const isHighlighted =
                search.length >= 2 &&
                (dept.nameAr.toLowerCase().includes(search.toLowerCase()) ||
                  (dept.nameEn || "").toLowerCase().includes(search.toLowerCase()) ||
                  dept.code.toLowerCase().includes(search.toLowerCase()));

              return (
                <div
                  key={dept.id}
                  style={{
                    position: "absolute",
                    left: col * COL_W,
                    top: row * ROW_H,
                    width: NODE_W,
                    height: NODE_H,   // fixed height so py/cy math is pixel-perfect
                  }}
                >
                  <OrgNode
                    dept={dept}
                    row={row}
                    isCollapsed={collapsed.has(dept.id)}
                    onToggle={() =>
                      setCollapsed((prev) => {
                        const next = new Set(prev);
                        if (next.has(dept.id)) next.delete(dept.id);
                        else next.add(dept.id);
                        return next;
                      })
                    }
                    onSelect={() => setSelectedDept(dept)}
                    isHighlighted={isHighlighted}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Employee panel ── */}
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

            <div className="divide-y max-h-[500px] overflow-y-auto">
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
