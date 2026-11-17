"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Save, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageGuard } from "@/components/permissions/page-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAppraisalDepartmentConfig,
  useAppraisalReadinessJobTitles,
  useAppraisalSettings,
  useSetAppraisalReadinessJobTitles,
  useUpdateAppraisalDepartmentConfig,
  useUpdateAppraisalSettings,
} from "@/lib/hooks/use-appraisal";
import { useActiveLeaveTypes } from "@/lib/hooks/use-leave-types";
import { AppraisalSettings, ReadinessJobTitle, SatisfactionSource } from "@/lib/api/appraisal";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { cn } from "@/lib/utils";

export default function AppraisalSetupPage() {
  const t = useTranslations("appraisal");
  const locale = useLocale();
  return (
    <PageGuard permission={PERMISSIONS.APPRAISAL.MANAGE}>
      <div className="space-y-4">
        <PageHeader title={t("setup.title")} description={t("setup.description")} />
        <Tabs defaultValue="departments" dir={locale === "ar" ? "rtl" : "ltr"}>
          <TabsList>
            <TabsTrigger value="departments">{t("setup.tabs.departments")}</TabsTrigger>
            <TabsTrigger value="readiness">{t("setup.tabs.readiness")}</TabsTrigger>
            <TabsTrigger value="settings">{t("setup.tabs.settings")}</TabsTrigger>
          </TabsList>
          <TabsContent value="departments">
            <DepartmentsTab />
          </TabsContent>
          <TabsContent value="readiness">
            <ReadinessTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageGuard>
  );
}

// ─── تصنيف الأقسام ────────────────────────────────────────────────────

const ADMIN = "ADMIN"; // يمثّل null (قسم إداري) داخل الـ Select
const SOURCES = ["PROSTHETICS", "PHYSIO", "PODIATRY"] as const;

function DepartmentsTab() {
  const t = useTranslations("appraisal");
  const { data: departments = [], isLoading } = useAppraisalDepartmentConfig();
  const update = useUpdateAppraisalDepartmentConfig();
  const [search, setSearch] = useState("");

  const unconfiguredCount = departments.filter((d) => !d.configured).length;
  const filtered = departments.filter((d) => {
    const q = search.trim().toLowerCase();
    return !q || d.nameAr?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("setup.departments.title")}</CardTitle>
        <CardDescription>{t("setup.departments.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="ps-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {unconfiguredCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              {t("setup.departments.unconfiguredCount", { count: unconfiguredCount })}
            </span>
          )}
        </div>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("setup.departments.code")}</TableHead>
                <TableHead>{t("setup.departments.name")}</TableHead>
                <TableHead>{t("setup.departments.classification")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.departmentId} className={cn(!d.configured && "bg-amber-50 dark:bg-amber-950/20")}>
                  <TableCell className="font-mono text-sm">{d.code}</TableCell>
                  <TableCell>
                    <span className={cn(d.parentId && "ps-4")}>{d.nameAr}</span>
                    {!d.configured && (
                      <Badge variant="outline" className="ms-2 border-amber-300 bg-amber-100 text-amber-800">
                        {t("setup.departments.notConfigured")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={d.configured ? (d.satisfactionSource ?? ADMIN) : ""}
                      disabled={update.isPending}
                      onValueChange={(value) =>
                        update.mutate({
                          departmentId: d.departmentId,
                          satisfactionSource: value === ADMIN ? null : (value as SatisfactionSource),
                        })
                      }
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder={t("setup.departments.choose")} />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {t(`satisfactionSource.${s}`)}
                          </SelectItem>
                        ))}
                        <SelectItem value={ADMIN}>{t("satisfactionSource.ADMIN")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── مسمّيات جاهزية المركز ────────────────────────────────────────────

const EMPTY_JOB_TITLES: ReadinessJobTitle[] = [];

function ReadinessTab() {
  const t = useTranslations("appraisal");
  const { data: jobTitles = EMPTY_JOB_TITLES, isLoading } = useAppraisalReadinessJobTitles();
  const save = useSetAppraisalReadinessJobTitles();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // إعادة ضبط الاختيار كلما وصلت قائمة جديدة من الخدمة (أول تحميل وبعد الحفظ)
  const [syncedFrom, setSyncedFrom] = useState<ReadinessJobTitle[] | null>(null);
  if (syncedFrom !== jobTitles) {
    setSyncedFrom(jobTitles);
    setSelected(new Set(jobTitles.filter((j) => j.isReadiness).map((j) => j.id)));
  }

  const dirty = useMemo(() => {
    const original = jobTitles.filter((j) => j.isReadiness).map((j) => j.id);
    return original.length !== selected.size || original.some((id) => !selected.has(id));
  }, [jobTitles, selected]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filtered = jobTitles.filter((j) => {
    const q = search.trim().toLowerCase();
    return !q || j.nameAr?.toLowerCase().includes(q) || j.code?.toLowerCase().includes(q);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("setup.readiness.title")}</CardTitle>
        <CardDescription>{t("setup.readiness.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="ps-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{t("setup.readiness.selected", { count: selected.size })}</span>
            <Button disabled={!dirty || save.isPending} onClick={() => save.mutate(Array.from(selected))}>
              <Save className="me-2 h-4 w-4" />
              {t("common.save")}
            </Button>
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((j) => (
              <label
                key={j.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50",
                  selected.has(j.id) && "border-primary bg-primary/5",
                )}
              >
                <Checkbox checked={selected.has(j.id)} onCheckedChange={() => toggle(j.id)} />
                <span className="text-sm">{j.nameAr}</span>
                <span className="ms-auto font-mono text-xs text-muted-foreground">{j.code}</span>
              </label>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── أرقام الالتزام ───────────────────────────────────────────────────

type LeaveTypeOption = { code: string; nameAr?: string; nameEn?: string };

const NUMERIC_FIELDS: (keyof Omit<AppraisalSettings, "countedLeaveTypeCodes">)[] = [
  "penaltyPoints",
  "justificationPoints",
  "excessLeaveDayPoints",
  "excessLeaveHourPoints",
  "starOfMonthPoints",
  "monthlyLeaveDaysAllowance",
  "monthlyLeaveHoursAllowance",
];

function SettingsTab() {
  const t = useTranslations("appraisal");
  const { data: settings, isLoading } = useAppraisalSettings();
  const { data: leaveTypesData } = useActiveLeaveTypes();
  const update = useUpdateAppraisalSettings();
  const [values, setValues] = useState<Record<string, string>>({});
  const [codes, setCodes] = useState<string[]>([]);

  // تعبئة الحقول كلما وصلت إعدادات جديدة من الخدمة (أول تحميل وبعد الحفظ)
  const [syncedFrom, setSyncedFrom] = useState<AppraisalSettings | null>(null);
  if (settings && syncedFrom !== settings) {
    setSyncedFrom(settings);
    setValues(Object.fromEntries(NUMERIC_FIELDS.map((f) => [f, String(settings[f] ?? "")])));
    setCodes(settings.countedLeaveTypeCodes ?? []);
  }

  const leaveTypes = useMemo<LeaveTypeOption[]>(() => {
    // شكل الرد يختلف (مصفوفة / data / data.items) — نقبلها كلها
    const raw = leaveTypesData as unknown as { data?: unknown; items?: unknown } | LeaveTypeOption[] | undefined;
    const inner = Array.isArray(raw) ? raw : (raw?.data as { items?: unknown } | unknown[] | undefined);
    const list = (
      Array.isArray(inner) ? inner : (inner?.items ?? (raw && !Array.isArray(raw) ? raw.items : undefined) ?? [])
    ) as LeaveTypeOption[];
    // أنواع مختارة سابقاً لكنها غير فعّالة/غير موجودة تبقى ظاهرة لتُلغى إن لزم
    const known = new Set(list.map((l) => l.code));
    return [...list, ...codes.filter((c) => !known.has(c)).map((c) => ({ code: c }))];
  }, [leaveTypesData, codes]);

  if (isLoading || !settings) return <Skeleton className="h-96 w-full" />;

  // أرسلوا الحقول المتغيرة فقط
  const changes: Partial<AppraisalSettings> = {};
  for (const field of NUMERIC_FIELDS) {
    const raw = values[field];
    if (raw === undefined || raw === "") continue;
    const num = Number(raw);
    if (!Number.isNaN(num) && num !== settings[field]) changes[field] = num;
  }
  const original = settings.countedLeaveTypeCodes ?? [];
  if (original.length !== codes.length || original.some((c) => !codes.includes(c))) {
    changes.countedLeaveTypeCodes = codes;
  }
  const invalid = NUMERIC_FIELDS.some((f) => values[f] === "" || Number.isNaN(Number(values[f])) || Number(values[f]) < 0);
  const dirty = Object.keys(changes).length > 0;

  const toggleCode = (code: string) =>
    setCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("setup.settings.title")}</CardTitle>
        <CardDescription>{t("setup.settings.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NUMERIC_FIELDS.map((field) => (
            <div key={field} className="space-y-1.5">
              <Label htmlFor={field}>{t(`setup.settings.fields.${field}`)}</Label>
              <Input
                id={field}
                type="number"
                min={0}
                step="0.25"
                dir="ltr"
                value={values[field] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label>{t("setup.settings.fields.countedLeaveTypeCodes")}</Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {leaveTypes.map((lt) => (
              <label key={lt.code} className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm hover:bg-muted/50">
                <Checkbox checked={codes.includes(lt.code)} onCheckedChange={() => toggleCode(lt.code)} />
                <span>{lt.nameAr || lt.nameEn || lt.code}</span>
                <span className="ms-auto font-mono text-xs text-muted-foreground">{lt.code}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button disabled={!dirty || invalid || update.isPending} onClick={() => update.mutate(changes)}>
            <Save className="me-2 h-4 w-4" />
            {t("common.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
