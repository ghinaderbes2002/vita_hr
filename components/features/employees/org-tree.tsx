"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Users2, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployees } from "@/lib/hooks/use-employees";
import { cn } from "@/lib/utils";

interface OrgNode {
  id: string;
  emp: any;
  children: OrgNode[];
}

function buildTree(employees: any[]): OrgNode[] {
  const map = new Map<string, OrgNode>();
  for (const emp of employees) {
    map.set(emp.id, { id: emp.id, emp, children: [] });
  }
  const roots: OrgNode[] = [];
  for (const emp of employees) {
    const node = map.get(emp.id)!;
    if (emp.managerId && map.has(emp.managerId)) {
      map.get(emp.managerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/* ثابت لون الـ avatar بحسب اسم الموظف */
const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(emp: any) {
  return `${emp.firstNameAr?.[0] ?? ""}${emp.lastNameAr?.[0] ?? ""}`;
}

/* ─── Node Card ─────────────────────────────────────────────── */
function NodeCard({
  node,
  depth,
  isLast,
}: {
  node: OrgNode;
  depth: number;
  isLast: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const emp = node.emp;
  const name = `${emp.firstNameAr} ${emp.lastNameAr}`;
  const color = avatarColor(name);

  return (
    <div className="relative">
      {/* vertical guide line for siblings that follow */}
      {!isLast && (
        <div className="absolute top-12 bottom-0 end-4 w-px bg-border/60 z-0" />
      )}

      {/* ─ Row: toggle + card ─ */}
      <div className="relative z-10 flex items-center gap-2 mb-1">
        {/* Expand/Collapse button */}
        <button
          type="button"
          aria-label="toggle"
          disabled={!hasChildren}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "shrink-0 w-8 h-8 rounded-full flex items-center justify-center border bg-background transition-colors",
            hasChildren
              ? "hover:bg-muted cursor-pointer border-border"
              : "opacity-0 pointer-events-none",
          )}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              !open && "-rotate-90",
            )}
          />
        </button>

        {/* Card */}
        <div
          onClick={() => router.push(`/employees/${node.id}`)}
          className={cn(
            "flex items-center gap-3 flex-1 max-w-xs rounded-xl border bg-card px-4 py-2.5 cursor-pointer",
            "hover:shadow-md hover:border-primary/40 transition-all duration-150 group",
            depth === 0 && "border-primary/30 shadow-sm",
          )}
        >
          {/* Avatar */}
          <div
            className={cn(
              "shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold",
              color,
            )}
          >
            {initials(emp)}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
              {name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {emp.jobTitle?.nameAr ?? emp.jobGrade?.nameAr ?? "—"}
            </p>
            {emp.department?.nameAr && (
              <div className="flex items-center gap-1 mt-0.5">
                <Building2 className="h-2.5 w-2.5 text-muted-foreground/60" />
                <span className="text-[10px] text-muted-foreground/70 truncate">
                  {emp.department.nameAr}
                </span>
              </div>
            )}
          </div>

          {/* Children count badge */}
          {hasChildren && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {node.children.length}
            </span>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && open && (
        <div className="me-10 pe-0 ps-6 border-s border-border/50 ms-4 mt-1 mb-2 space-y-0">
          {node.children.map((child, i) => (
            <NodeCard
              key={child.id}
              node={child}
              depth={depth + 1}
              isLast={i === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── OrgTree (exported) ────────────────────────────────────── */
export function OrgTree() {
  const { data, isLoading } = useEmployees({ limit: 500 });

  const employees: any[] = useMemo(() => {
    const d = data as any;
    return d?.data?.items ?? d?.items ?? (Array.isArray(d) ? d : []);
  }, [data]);

  const roots = useMemo(() => buildTree(employees), [employees]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3"
            style={{ paddingInlineStart: `${(i % 3) * 48}px` }}
          >
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className="h-14 w-64 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (roots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Users2 className="h-14 w-14 opacity-20" />
        <p className="text-sm">لا يوجد موظفون</p>
      </div>
    );
  }

  return (
    <div className="p-5 overflow-auto">
      {/* Summary row */}
      <div className="flex items-center gap-2 mb-5 text-xs text-muted-foreground border-b pb-3">
        <Users2 className="h-3.5 w-3.5" />
        <span>{employees.length} موظف</span>
        <span className="mx-1">·</span>
        <span>اضغط على السهم لفتح/إغلاق · اضغط على البطاقة لملف الموظف</span>
      </div>

      <div className="space-y-1">
        {roots.map((root, i) => (
          <NodeCard
            key={root.id}
            node={root}
            depth={0}
            isLast={i === roots.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
