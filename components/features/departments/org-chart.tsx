"use client";

import { useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Department } from "@/types";
import { Building2, ChevronDown, ChevronRight, User, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// PX_PER_GRADE must equal (card_height + 48) so same-grade nodes land at the
// same Y regardless of how many intermediate levels exist between parent and child.
// Card height ≈ 162px → 162 + 48 = 210.
const PX_PER_GRADE = 210;

function OrgChartNode({ dept, level = 0 }: { dept: Department; level?: number }) {
  const locale = useLocale();
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = dept.children && dept.children.length > 0;

  const name = locale === "ar" ? dept.nameAr : dept.nameEn;
  const managerName = dept.manager
    ? `${dept.manager.firstNameAr} ${dept.manager.lastNameAr}`
    : null;

  const parentOrder = dept.grade?.order ?? 0;

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        className={cn(
          "relative flex flex-col items-center rounded-xl border bg-card shadow-sm p-3 text-center transition-shadow hover:shadow-md cursor-default",
          level === 0 ? "border-primary bg-primary/5 w-52" : "w-44",
          dept.grade?.color && "border-l-4"
        )}
        style={dept.grade?.color ? { borderLeftColor: dept.grade.color } : undefined}
      >
        <div className={cn(
          "mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted",
          level === 0 && "bg-primary/20"
        )}>
          <Building2 className={cn("h-5 w-5 text-muted-foreground", level === 0 && "text-primary")} />
        </div>

        <p className={cn("font-semibold text-sm leading-tight", level === 0 && "text-base")}>{name}</p>
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
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted transition-colors"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Children */}
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
                  <OrgChartNode dept={child} level={level + 1} />
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

// ─── Main OrgChart ────────────────────────────────────────────────────────────

interface OrgChartProps {
  departments: Department[];
  allDepartments?: Department[];
}

export function OrgChart({ departments, allDepartments }: OrgChartProps) {
  const t = useTranslations();
  const [zoom, setZoom] = useState(1);

  const zoomIn = () => setZoom((z) => Math.min(+(z + 0.1).toFixed(1), 2));
  const zoomOut = () => setZoom((z) => Math.max(+(z - 0.1).toFixed(1), 0.3));
  const zoomReset = () => setZoom(1);

  // Build grade lookup from allDepartments (has localStorage grade info)
  const gradeMap = useMemo(() => {
    const map = new Map<string, Department>();
    (allDepartments || []).forEach((d) => map.set(d.id, d));
    return map;
  }, [allDepartments]);

  // Recursively inject grade info into tree nodes
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

  return (
    <div className="space-y-4">
      {/* Zoom controls */}
      <div className="flex items-center gap-1 border rounded-lg p-1 w-fit">
        <button onClick={zoomOut} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="تصغير">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button onClick={zoomReset} className="px-2 py-1 rounded-md text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-w-12 text-center" title="إعادة ضبط">
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={zoomIn} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="تكبير">
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-auto p-8">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease",
          }}
        >
          <div className="flex gap-12 items-start min-w-max">
            {enrichedTree.map((dept) => (
              <OrgChartNode key={dept.id} dept={dept} level={0} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
