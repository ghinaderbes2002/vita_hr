"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Eye, Users, Clock, CheckCircle, XCircle, Briefcase, UserCheck,
  LayoutList, Kanban, Star, GripVertical, ExternalLink, Search, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useJobApplications,
  useJobApplicationStats,
  useUpdateJobApplication,
  useApproveJobApplicationCEO,
  useSetJobApplicationTalent,
  useMigrateLocalTalents,
} from "@/lib/hooks/use-job-applications";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { JobApplication, JobApplicationStatus } from "@/types";
import { useLocale } from "next-intl";

// ─── Pipeline columns definition ────────────────────────────────────────────

interface PipelineColumn {
  id: JobApplicationStatus;
  color: string;
  headerBg: string;
  cardBorder: string;
  badge: string;
  locked?: boolean; // HIRED requires ceoApprove, not a normal update
}

const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: "PENDING",         color: "#F59E0B", headerBg: "bg-amber-50 border-amber-200",   cardBorder: "border-l-amber-400",   badge: "bg-amber-100 text-amber-800" },
  { id: "INTERVIEW_READY", color: "#3B82F6", headerBg: "bg-blue-50 border-blue-200",     cardBorder: "border-l-blue-400",    badge: "bg-blue-100 text-blue-800" },
  { id: "ACCEPTED",        color: "#10B981", headerBg: "bg-green-50 border-green-200",   cardBorder: "border-l-green-400",   badge: "bg-green-100 text-green-800" },
  { id: "HIRED",           color: "#8B5CF6", headerBg: "bg-purple-50 border-purple-200", cardBorder: "border-l-purple-400",  badge: "bg-purple-100 text-purple-800", locked: true },
  { id: "REJECTED",        color: "#EF4444", headerBg: "bg-red-50 border-red-200",       cardBorder: "border-l-red-400",     badge: "bg-red-100 text-red-800" },
];

const STATUS_BG: Record<JobApplicationStatus, string> = {
  PENDING:         "bg-amber-100 text-amber-800",
  INTERVIEW_READY: "bg-blue-100 text-blue-800",
  ACCEPTED:        "bg-green-100 text-green-800",
  REJECTED:        "bg-red-100 text-red-800",
  HIRED:           "bg-purple-100 text-purple-800",
};

const STATUSES: JobApplicationStatus[] = ["PENDING", "INTERVIEW_READY", "ACCEPTED", "REJECTED", "HIRED"];

// ─── Candidate card (kanban) ─────────────────────────────────────────────────

function CandidateCard({
  app,
  col,
  index,
  onView,
  t,
}: {
  app: JobApplication;
  col: PipelineColumn;
  index: number;
  onView: (id: string) => void;
  t: (key: string) => string;
}) {
  return (
    <Draggable draggableId={app.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`
            bg-white rounded-lg border border-l-4 ${col.cardBorder} p-3 space-y-2
            shadow-sm hover:shadow-md transition-shadow cursor-grab
            ${snapshot.isDragging ? "shadow-lg rotate-1 opacity-90" : ""}
          `}
        >
          <div className="flex flex-wrap items-start justify-between gap-1">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{app.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{app.email}</p>
            </div>
            <div
              {...provided.dragHandleProps}
              className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab pt-0.5 shrink-0"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          </div>

          <div className="flex flex-wrap gap-1 text-xs">
            <span className="rounded bg-muted px-1.5 py-0.5">{app.specialization}</span>
            <span className="rounded bg-muted px-1.5 py-0.5">{app.yearsOfExperience} {t("common.years")}</span>
          </div>

          {app.rating != null && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${i < app.rating! ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {format(new Date(app.createdAt), "yyyy/MM/dd")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onView(app.id)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Pipeline board ──────────────────────────────────────────────────────────

function PipelineBoard({
  applications,
  onView,
  onDragEnd,
  t,
}: {
  applications: JobApplication[];
  onView: (id: string) => void;
  onDragEnd: (result: DropResult) => void;
  t: (key: string) => string;
}) {
  const grouped = Object.fromEntries(
    PIPELINE_COLUMNS.map((col) => [
      col.id,
      applications.filter((a) => a.status === col.id),
    ])
  ) as Record<JobApplicationStatus, JobApplication[]>;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[60dvh]">
        {PIPELINE_COLUMNS.map((col) => {
          const cards = grouped[col.id] ?? [];
          return (
            <div key={col.id} className="shrink-0 w-64 flex flex-col">
              {/* Column header */}
              <div className={`rounded-t-lg border px-3 py-2.5 ${col.headerBg} flex flex-wrap gap-2 items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="text-sm font-semibold">{t(`jobApplications.pipeline.${col.id}`)}</span>
                </div>
                <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${col.badge}`}>
                  {cards.length}
                </span>
              </div>

              {/* Drop zone */}
              <Droppable droppableId={col.id} isDropDisabled={col.locked}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`
                      flex-1 rounded-b-lg border border-t-0 p-2 space-y-2 min-h-50
                      transition-colors
                      ${snapshot.isDraggingOver
                        ? col.locked
                          ? "bg-gray-100"
                          : "bg-blue-50/50"
                        : "bg-gray-50/50"
                      }
                      ${col.locked && snapshot.isDraggingOver ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    {col.locked && snapshot.isDraggingOver && (
                      <p className="text-xs text-center text-muted-foreground pt-2">
                        {t("jobApplications.pipeline.ceoRequired")}
                      </p>
                    )}
                    {cards.map((app, index) => (
                      <CandidateCard
                        key={app.id}
                        app={app}
                        col={col}
                        index={index}
                        onView={onView}
                        t={t}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function JobApplicationsPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const [view, setView] = useState<"list" | "pipeline">("list");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [showFavorites, setShowFavorites] = useState(false);
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission("job-applications:update");

  // Search filters. The API only filters by status and talent, so the whole
  // list is fetched once and these narrow it here; the volume is small.
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState("ALL");
  const [eduSearch, setEduSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const hasSearchFilters = !!(search.trim() || specFilter !== "ALL" || eduSearch.trim() || dateFrom || dateTo);
  const clearSearchFilters = () => {
    setSearch(""); setSpecFilter("ALL"); setEduSearch(""); setDateFrom(""); setDateTo(""); setPage(1);
  };

  const { data, isLoading } = useJobApplications(
    view === "pipeline"
      ? { limit: 500 }
      : {
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          isTalent: showFavorites ? true : undefined,
          page: 1,
          limit: 500,
        }
  );
  const { data: talentsData } = useJobApplications({ isTalent: true, page: 1, limit: 1 });
  const { data: stats } = useJobApplicationStats();
  const updateApplication = useUpdateJobApplication();
  const ceoApprove = useApproveJobApplicationCEO();
  const setTalent = useSetJobApplicationTalent();

  const allApplications: JobApplication[] = useMemo(
    () => (data as any)?.data?.data || (data as any)?.data || [],
    [data],
  );

  // Specializations actually present, for the dropdown.
  const specOptions = useMemo(
    () => Array.from(new Set(allApplications.map((a) => a.specialization?.trim()).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b, "ar")),
    [allApplications],
  );

  const norm = (v?: string | null) => (v ?? "").toLowerCase().trim();
  const filteredApplications = allApplications.filter((a) => {
    const q = norm(search);
    if (q && !norm(a.fullName).includes(q) && !norm(a.email).includes(q) && !norm(a.phone).includes(q)) return false;
    if (specFilter !== "ALL" && a.specialization?.trim() !== specFilter) return false;
    if (eduSearch.trim() && !norm(a.education).includes(norm(eduSearch))) return false;
    // Compared on the local calendar day the application was submitted.
    const day = a.createdAt ? format(new Date(a.createdAt), "yyyy-MM-dd") : "";
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  });

  // The list paginates locally now that it holds every match.
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const applications: JobApplication[] = view === "pipeline"
    ? filteredApplications
    : filteredApplications.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pagination = { total: filteredApplications.length, totalPages };
  const statsData = stats as any;

  // Only migrate once the server actually returns isTalent — otherwise the
  // endpoint isn't deployed yet and the local list must be left untouched.
  const serverHasTalent = applications.some((a) => typeof a.isTalent === "boolean");
  useMigrateLocalTalents(canUpdate && serverHasTalent);

  // Without server support the isTalent filter is ignored and the total would
  // be the count of all applications, so hide the badge until it's deployed.
  const talentsCount: number = serverHasTalent
    ? (talentsData as any)?.data?.pagination?.total ?? (talentsData as any)?.pagination?.total ?? 0
    : 0;

  const statCards = [
    { label: t("jobApplications.stats.total"),    value: statsData?.total ?? 0,          icon: Users,      color: "text-foreground" },
    { label: t("jobApplications.stats.pending"),   value: statsData?.pending ?? 0,        icon: Clock,      color: "text-amber-500" },
    { label: t("jobApplications.stats.interview"), value: statsData?.interviewReady ?? 0, icon: Briefcase,  color: "text-blue-500" },
    { label: t("jobApplications.stats.accepted"),  value: statsData?.accepted ?? 0,       icon: CheckCircle, color: "text-green-500" },
    { label: t("jobApplications.stats.rejected"),  value: statsData?.rejected ?? 0,       icon: XCircle,    color: "text-red-500" },
    { label: t("jobApplications.stats.hired"),     value: statsData?.hired ?? 0,          icon: UserCheck,  color: "text-purple-500" },
  ];

  const handleView = (id: string) => router.push(`/${locale}/job-applications/${id}`);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const destStatus = destination.droppableId as JobApplicationStatus;

    if (destStatus === "HIRED") {
      ceoApprove.mutate(draggableId);
      return;
    }

    updateApplication.mutate({
      id: draggableId,
      data: { status: destStatus as Exclude<JobApplicationStatus, "HIRED"> },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("jobApplications.title")}
        description={t("jobApplications.description")}
        actions={
          <div className="flex items-center gap-2">
          <a href="https://vitaxirpro.com/join-us" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 ml-2" />
              {t("jobApplications.submitApplication")}
            </Button>
          </a>
          <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setView("list")}
            >
              <LayoutList className="h-4 w-4 ml-1" />
              {t("jobApplications.listView")}
            </Button>
            <Button
              variant={view === "pipeline" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setView("pipeline")}
            >
              <Kanban className="h-4 w-4 ml-1" />
              {t("jobApplications.boardView")}
            </Button>
          </div>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <p className="text-2xl font-bold">{card.value}</p>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Search filters (both views) ── */}
      <div className="rounded-lg border bg-card p-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="بحث بالاسم أو البريد أو الهاتف..."
              className="ps-9"
            />
          </div>
          <Select value={specFilter} onValueChange={(v) => { setSpecFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full min-w-0 *:data-[slot=select-value]:block! *:data-[slot=select-value]:truncate">
              <SelectValue placeholder={t("jobApplications.fields.specialization")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل التخصصات</SelectItem>
              {specOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={eduSearch}
            onChange={(e) => { setEduSearch(e.target.value); setPage(1); }}
            placeholder="المؤهل العلمي (مثال: بكالوريوس)"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">من</span>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-full lg:w-40" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">إلى</span>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-full lg:w-40" />
          </div>
        </div>
        {hasSearchFilters && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredApplications.length}</span> نتيجة من أصل {allApplications.length}
            </span>
            <Button variant="ghost" size="sm" className="gap-1.5 h-7" onClick={clearSearchFilters}>
              <X className="h-3.5 w-3.5" /> مسح الفلاتر
            </Button>
          </div>
        )}
      </div>

      {/* ── Pipeline view ── */}
      {view === "pipeline" && (
        <>
          {isLoading ? (
            <div className="flex gap-3">
              {PIPELINE_COLUMNS.map((col) => (
                <div key={col.id} className="shrink-0 w-64 space-y-2">
                  <Skeleton className="h-10 w-full rounded-t-lg" />
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
                </div>
              ))}
            </div>
          ) : (
            <PipelineBoard
              applications={applications}
              onView={handleView}
              onDragEnd={handleDragEnd}
              t={t}
            />
          )}
        </>
      )}

      {/* ── List view ── */}
      {view === "list" && (
        <>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("common.all")}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{t(`jobApplications.statuses.${s}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showFavorites ? "default" : "outline"}
              size="sm"
              onClick={() => { setShowFavorites((v) => !v); setPage(1); }}
              className="gap-2"
            >
              <Star className={`h-4 w-4 ${showFavorites ? "fill-white" : "fill-none"}`} />
              {t("jobApplications.talentList")}
              {talentsCount > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${showFavorites ? "bg-white/20" : "bg-red-100 text-red-600"}`}>
                  {talentsCount}
                </span>
              )}
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>{t("jobApplications.fields.fullName")}</TableHead>
                  <TableHead>{t("jobApplications.fields.specialization")}</TableHead>
                  <TableHead>{t("jobApplications.fields.yearsOfExperience")}</TableHead>
                  <TableHead>{t("jobApplications.fields.education")}</TableHead>
                  <TableHead>{t("jobApplications.fields.status")}</TableHead>
                  <TableHead>{t("jobApplications.fields.createdAt")}</TableHead>
                  <TableHead className="w-17.5">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {hasSearchFilters ? "لا توجد طلبات مطابقة للبحث" : showFavorites ? t("jobApplications.noFavorites") : t("common.noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((app) => {
                    const statusBg = STATUS_BG[app.status];
                    const isFav = !!app.isTalent;
                    return (
                      <TableRow key={app.id}>
                        <TableCell>
                          <button
                            onClick={() => setTalent.mutate({ id: app.id, isTalent: !isFav })}
                            disabled={!canUpdate || setTalent.isPending}
                            className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Star className={`h-4 w-4 transition-colors ${isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                          </button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{app.fullName}</p>
                            <p className="text-xs text-muted-foreground">{app.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{app.specialization}</TableCell>
                        <TableCell>{app.yearsOfExperience} {t("common.years")}</TableCell>
                        <TableCell className="max-w-45">
                          <span className="block truncate" title={app.education}>{app.education}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBg}`}>
                            {t(`jobApplications.statuses.${app.status}`)}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(app.createdAt), "yyyy/MM/dd")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(app.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("common.of")} {pagination.total} {t("jobApplications.fields.application")}
              </p>
              <div className="flex gap-2 rtl:flex-row-reverse">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                  {t("common.previous")}
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage >= pagination.totalPages} onClick={() => setPage(currentPage + 1)}>
                  {t("common.next")}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
