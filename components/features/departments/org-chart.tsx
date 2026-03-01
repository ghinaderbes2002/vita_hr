"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Department } from "@/types";
import { Building2, ChevronDown, ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface OrgChartNodeProps {
  dept: Department;
  level?: number;
}

function OrgChartNode({ dept, level = 0 }: OrgChartNodeProps) {
  const locale = useLocale();
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = dept.children && dept.children.length > 0;

  const name = locale === "ar" ? dept.nameAr : dept.nameEn;
  const managerName = dept.manager
    ? locale === "ar"
      ? `${dept.manager.firstNameAr} ${dept.manager.lastNameAr}`
      : `${dept.manager.firstNameEn} ${dept.manager.lastNameEn}`
    : null;

  return (
    <div className="flex flex-col items-center">
      {/* Node card */}
      <div
        className={cn(
          "relative flex flex-col items-center rounded-xl border bg-card shadow-sm p-3 w-44 text-center transition-shadow hover:shadow-md cursor-default",
          level === 0 && "border-primary bg-primary/5 w-52"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted",
            level === 0 && "bg-primary/20"
          )}
        >
          <Building2 className={cn("h-5 w-5 text-muted-foreground", level === 0 && "text-primary")} />
        </div>

        {/* Name */}
        <p className={cn("font-semibold text-sm leading-tight", level === 0 && "text-base")}>
          {name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{dept.code}</p>

        {/* Manager */}
        {managerName && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-30">{managerName}</span>
          </div>
        )}

        {/* Expand/collapse button */}
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <>
          {/* Vertical line from card to horizontal connector */}
          <div className="w-px h-8 bg-border mt-3" />

          {/* Children row */}
          <div className="relative flex gap-6 items-start">
            {/* Horizontal connecting line */}
            {dept.children!.length > 1 && (
              <div
                className="absolute top-0 left-0 right-0 h-px bg-border"
                style={{
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: `calc(100% - 88px)`, // half node width from each side
                }}
              />
            )}

            {dept.children!.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Vertical line from horizontal connector to child */}
                <div className="w-px h-6 bg-border" />
                <OrgChartNode dept={child} level={level + 1} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Collapsed indicator */}
      {hasChildren && !isExpanded && (
        <div className="mt-4">
          <Badge variant="secondary" className="text-xs">
            +{dept.children!.length}
          </Badge>
        </div>
      )}
    </div>
  );
}

interface OrgChartProps {
  departments: Department[];
}

export function OrgChart({ departments }: OrgChartProps) {
  const t = useTranslations();

  if (!departments || departments.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        {t("common.noData")}
      </div>
    );
  }

  return (
    <div className="overflow-auto p-8">
      <div className="flex gap-12 items-start min-w-max">
        {departments.map((dept) => (
          <OrgChartNode key={dept.id} dept={dept} level={0} />
        ))}
      </div>
    </div>
  );
}
