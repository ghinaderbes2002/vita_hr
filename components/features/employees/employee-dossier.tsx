"use client";

import { useEmployeeDossier, useEmployees } from "@/lib/hooks/use-employees";
import { DossierEvent } from "@/lib/api/employees";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeftRight, TrendingUp, DollarSign, AlertTriangle,
  Gift, CreditCard, FileText, ChevronDown, ChevronUp
} from "lucide-react";
import { useState, useMemo } from "react";

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }); }
  catch { return d; }
}

function fmtMoney(amount?: number, currency?: string) {
  if (!amount) return "—";
  const cur = currency ?? "SYP";
  return `${amount.toLocaleString("en-US")} ${cur === "USD" ? "$" : "ل.س"}`;
}

// ─── event meta ───────────────────────────────────────────────────────────────
function eventMeta(ev: DossierEvent): {
  icon: React.ReactNode;
  label: string;
  color: string; // tailwind bg + border class
  textColor: string;
} {
  if (ev.category === "HISTORY") {
    if (ev.type === "PROMOTION") return {
      icon: <TrendingUp className="h-4 w-4" />, label: "ترقية",
      color: "bg-purple-50 border-purple-200", textColor: "text-purple-700",
    };
    if (ev.type === "SALARY_CHANGE") return {
      icon: <DollarSign className="h-4 w-4" />, label: "تغيير راتب",
      color: "bg-emerald-50 border-emerald-200", textColor: "text-emerald-700",
    };
    return {
      icon: <ArrowLeftRight className="h-4 w-4" />, label: "نقل وظيفي",
      color: "bg-blue-50 border-blue-200", textColor: "text-blue-700",
    };
  }
  if (ev.category === "PENALTY") return {
    icon: <AlertTriangle className="h-4 w-4" />, label: "عقوبة",
    color: "bg-red-50 border-red-200", textColor: "text-red-700",
  };
  if (ev.category === "REWARD") return {
    icon: <Gift className="h-4 w-4" />, label: "مكافأة",
    color: "bg-amber-50 border-amber-200", textColor: "text-amber-700",
  };
  if (ev.category === "SALARY_ADVANCE") return {
    icon: <CreditCard className="h-4 w-4" />, label: "سلفة",
    color: "bg-orange-50 border-orange-200", textColor: "text-orange-700",
  };
  return {
    icon: <FileText className="h-4 w-4" />, label: ev.type ?? ev.category,
    color: "bg-muted border-border", textColor: "text-foreground",
  };
}

// ─── change row helper ────────────────────────────────────────────────────────
function ChangeRow({ label, from, to }: { label: string; from?: string; to?: string }) {
  if (!from && !to) return null;
  return (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      <span className="text-muted-foreground min-w-[5rem]">{label}</span>
      {from && <span className="line-through text-muted-foreground/70">{from}</span>}
      {from && to && <ArrowLeftRight className="h-3 w-3 text-muted-foreground shrink-0" />}
      {to && <span className="font-medium">{to}</span>}
    </div>
  );
}

// ─── single event card ────────────────────────────────────────────────────────
function EventCard({ ev, resolveUser }: { ev: DossierEvent; resolveUser: (id: string) => string }) {
  const [expanded, setExpanded] = useState(false);
  const meta = eventMeta(ev);
  const from = ev.fromValue ?? {};
  const to   = ev.toValue   ?? {};

  // DEV: log raw event to inspect backend structure
  if (process.env.NODE_ENV === "development" && ev.category === "HISTORY") {
    console.log("[Dossier event]", JSON.stringify(ev, null, 2));
  }

  // salary field might come as "salary", "basicSalary", or nested object
  function getSalary(v: Record<string, any>): number | undefined {
    const raw = v.basicSalary ?? v.salary;
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw === "number") return raw;
    if (typeof raw === "object") return raw.amount ?? raw.basicSalary;
    return undefined;
  }
  // currency: check toValue/fromValue AND the event itself
  function getCurrency(v: Record<string, any>): string {
    return v.salaryCurrency ?? v.newSalaryCurrency ?? v.currency ??
           v.salary?.currency ?? (ev as any).salaryCurrency ?? "SYP";
  }

  const hasChanges = ev.category === "HISTORY" && (
    from.department || to.department ||
    from.jobTitle   || to.jobTitle   ||
    from.jobGrade   || to.jobGrade   ||
    from.manager    || to.manager    ||
    getSalary(from) !== undefined || getSalary(to) !== undefined
  );

  return (
    <div className={`rounded-lg border p-4 space-y-2 ${meta.color}`}>
      {/* header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`${meta.textColor}`}>{meta.icon}</span>
          <span className={`font-semibold text-sm ${meta.textColor}`}>{meta.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {ev.performedBy && (
            <span className="text-xs text-muted-foreground hidden sm:inline">بواسطة: {resolveUser(ev.performedBy)}</span>
          )}
          <span className="text-xs text-muted-foreground">{fmtDate(ev.date)}</span>
          {hasChanges && (
            <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* HISTORY details */}
      {ev.category === "HISTORY" && hasChanges && expanded && (
        <div className="mt-2 space-y-1.5 pt-2 border-t border-current/10">
          <ChangeRow
            label="القسم"
            from={from.department?.nameAr ?? from.department}
            to={to.department?.nameAr ?? to.department}
          />
          <ChangeRow
            label="المسمى"
            from={from.jobTitle?.nameAr ?? from.jobTitle}
            to={to.jobTitle?.nameAr ?? to.jobTitle}
          />
          <ChangeRow
            label="الدرجة"
            from={from.jobGrade?.nameAr ?? from.jobGrade}
            to={to.jobGrade?.nameAr ?? to.jobGrade}
          />
          <ChangeRow
            label="المدير"
            from={from.manager ? `${from.manager.firstNameAr ?? ""} ${from.manager.lastNameAr ?? ""}`.trim() : undefined}
            to={to.manager ? `${to.manager.firstNameAr ?? ""} ${to.manager.lastNameAr ?? ""}`.trim() : undefined}
          />
          {(getSalary(from) !== undefined || getSalary(to) !== undefined) && (
            <ChangeRow
              label="الراتب"
              from={getSalary(from) !== undefined ? fmtMoney(getSalary(from), getCurrency(from)) : undefined}
              to={getSalary(to)   !== undefined ? fmtMoney(getSalary(to),   getCurrency(to))   : undefined}
            />
          )}
        </div>
      )}

      {/* SALARY_CHANGE / PROMOTION shortcut */}
      {ev.category === "HISTORY" && !hasChanges && (getSalary(to) !== undefined || getSalary(from) !== undefined) && (
        <div className="text-sm flex items-center gap-2 flex-wrap">
          {getSalary(from) !== undefined && <span className="line-through text-muted-foreground/70">{fmtMoney(getSalary(from), getCurrency(from))}</span>}
          {getSalary(from) !== undefined && getSalary(to) !== undefined && <ArrowLeftRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
          {getSalary(to)   !== undefined && <span className="font-semibold">{fmtMoney(getSalary(to), getCurrency(to))}</span>}
        </div>
      )}

      {/* PENALTY */}
      {ev.category === "PENALTY" && (
        <div className="text-sm space-y-1">
          {ev.penaltyDays && <p>الخصم: <span className="font-medium">{ev.penaltyDays} يوم</span></p>}
          {ev.amount && <p>المبلغ: <span className="font-medium">{fmtMoney(ev.amount)}</span></p>}
          {ev.reason && <p className="text-muted-foreground">{ev.reason}</p>}
          {ev.status && <Badge variant="outline" className="text-xs">{ev.status}</Badge>}
        </div>
      )}

      {/* REWARD */}
      {ev.category === "REWARD" && (
        <div className="text-sm space-y-1">
          {ev.amount && <p>القيمة: <span className="font-medium">{fmtMoney(ev.amount)}</span></p>}
          {ev.reason && <p className="text-muted-foreground">{ev.reason}</p>}
          {ev.status && <Badge variant="outline" className="text-xs">{ev.status}</Badge>}
        </div>
      )}

      {/* SALARY_ADVANCE */}
      {ev.category === "SALARY_ADVANCE" && (
        <div className="text-sm space-y-1">
          {ev.amount && <p>المبلغ: <span className="font-medium">{fmtMoney(ev.amount)}</span></p>}
          {ev.remainingBalance !== undefined && <p>الرصيد المتبقي: <span className="font-medium">{fmtMoney(ev.remainingBalance)}</span></p>}
          {ev.status && <Badge variant="outline" className="text-xs">{{ ACTIVE: "نشطة", COMPLETED: "مكتملة", CANCELLED: "ملغاة" }[ev.status] ?? ev.status}</Badge>}
        </div>
      )}

      {/* global note */}
      {ev.note && (
        <p className="text-xs text-muted-foreground border-t border-current/10 pt-2 mt-2">{ev.note}</p>
      )}
    </div>
  );
}

// ─── main export ──────────────────────────────────────────────────────────────
export function EmployeeDossier({ employeeId }: { employeeId: string }) {
  const { data, isLoading, isError }   = useEmployeeDossier(employeeId);
  const { data: empData }              = useEmployees({ limit: 500 });
  const timeline: DossierEvent[] = data?.timeline ?? [];

  const userMap = useMemo(() => {
    const m: Record<string, string> = {};
    const raw = empData as any;
    const list: any[] =
      raw?.data?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
    for (const e of list) {
      const name = `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim();
      if (!name) continue;
      if (e.id)     m[e.id]     = name;   // employee ID
      if (e.userId) m[e.userId] = name;   // linked user ID
    }
    return m;
  }, [empData]);

  function resolveUser(id: string): string {
    return userMap[id] ?? id;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        تعذّر تحميل الإضبارة
      </p>
    );
  }

  if (timeline.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        لا توجد أحداث مسجّلة بعد
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {timeline.map((ev, i) => <EventCard key={ev.id ?? i} ev={ev} resolveUser={resolveUser} />)}
    </div>
  );
}
