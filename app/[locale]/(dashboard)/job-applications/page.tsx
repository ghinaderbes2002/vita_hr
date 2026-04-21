"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Eye, Users, Clock, CheckCircle, XCircle, Briefcase, UserCheck,
  LayoutList, Kanban, Star, GripVertical,
} from "lucide-react";
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
} from "@/lib/hooks/use-job-applications";
import { JobApplication, JobApplicationStatus } from "@/types";
import { useLocale } from "next-intl";

// ─── Pipeline columns definition ────────────────────────────────────────────

interface PipelineColumn {
  id: JobApplicationStatus;
  label: string;
  color: string;
  headerBg: string;
  cardBorder: string;
  badge: string;
  locked?: boolean; // HIRED requires ceoApprove, not a normal update
}

const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    id: "PENDING",
    label: "استلام الطلب",
    color: "#F59E0B",
    headerBg: "bg-amber-50 border-amber-200",
    cardBorder: "border-l-amber-400",
    badge: "bg-amber-100 text-amber-800",
  },
  {
    id: "INTERVIEW_READY",
    label: "مؤهل للمقابلة",
    color: "#3B82F6",
    headerBg: "bg-blue-50 border-blue-200",
    cardBorder: "border-l-blue-400",
    badge: "bg-blue-100 text-blue-800",
  },
  {
    id: "ACCEPTED",
    label: "مقبول",
    color: "#10B981",
    headerBg: "bg-green-50 border-green-200",
    cardBorder: "border-l-green-400",
    badge: "bg-green-100 text-green-800",
  },
  {
    id: "HIRED",
    label: "تم التوظيف",
    color: "#8B5CF6",
    headerBg: "bg-purple-50 border-purple-200",
    cardBorder: "border-l-purple-400",
    badge: "bg-purple-100 text-purple-800",
    locked: true,
  },
  {
    id: "REJECTED",
    label: "مرفوض",
    color: "#EF4444",
    headerBg: "bg-red-50 border-red-200",
    cardBorder: "border-l-red-400",
    badge: "bg-red-100 text-red-800",
  },
];

const STATUS_CONFIG: Record<JobApplicationStatus, { bg: string; label: string }> = {
  PENDING:          { bg: "bg-amber-100 text-amber-800",   label: "معلق" },
  INTERVIEW_READY:  { bg: "bg-blue-100 text-blue-800",     label: "مؤهل للمقابلة" },
  ACCEPTED:         { bg: "bg-green-100 text-green-800",   label: "مقبول" },
  REJECTED:         { bg: "bg-red-100 text-red-800",       label: "مرفوض" },
  HIRED:            { bg: "bg-purple-100 text-purple-800", label: "تم التوظيف" },
};

const STATUSES: JobApplicationStatus[] = ["PENDING", "INTERVIEW_READY", "ACCEPTED", "REJECTED", "HIRED"];

// ─── Candidate card (kanban) ─────────────────────────────────────────────────

function CandidateCard({
  app,
  col,
  index,
  onView,
}: {
  app: JobApplication;
  col: PipelineColumn;
  index: number;
  onView: (id: string) => void;
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
          <div className="flex items-start justify-between gap-1">
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
            <span className="rounded bg-muted px-1.5 py-0.5">{app.yearsOfExperience} سنوات</span>
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

          <div className="flex items-center justify-between">
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
}: {
  applications: JobApplication[];
  onView: (id: string) => void;
  onDragEnd: (result: DropResult) => void;
}) {
  const grouped = Object.fromEntries(
    PIPELINE_COLUMNS.map((col) => [
      col.id,
      applications.filter((a) => a.status === col.id),
    ])
  ) as Record<JobApplicationStatus, JobApplication[]>;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[60vh]">
        {PIPELINE_COLUMNS.map((col) => {
          const cards = grouped[col.id] ?? [];
          return (
            <div key={col.id} className="shrink-0 w-64 flex flex-col">
              {/* Column header */}
              <div className={`rounded-t-lg border px-3 py-2.5 ${col.headerBg} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="text-sm font-semibold">{col.label}</span>
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
                        يتطلب موافقة المدير التنفيذي
                      </p>
                    )}
                    {cards.map((app, index) => (
                      <CandidateCard
                        key={app.id}
                        app={app}
                        col={col}
                        index={index}
                        onView={onView}
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

  const { data, isLoading } = useJobApplications(
    view === "pipeline"
      ? { limit: 500 }
      : {
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          page,
          limit: 20,
        }
  );
  const { data: stats } = useJobApplicationStats();
  const updateApplication = useUpdateJobApplication();
  const ceoApprove = useApproveJobApplicationCEO();

  const applications: JobApplication[] =
    (data as any)?.data?.data || (data as any)?.data || [];
  const pagination = (data as any)?.data?.pagination;
  const statsData = stats as any;

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
          <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setView("list")}
            >
              <LayoutList className="h-4 w-4 ml-1" />
              قائمة
            </Button>
            <Button
              variant={view === "pipeline" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setView("pipeline")}
            >
              <Kanban className="h-4 w-4 ml-1" />
              بورد
            </Button>
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
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
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
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">{t("common.noData")}</TableCell>
                  </TableRow>
                ) : (
                  applications.map((app) => {
                    const statusCfg = STATUS_CONFIG[app.status];
                    return (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{app.fullName}</p>
                            <p className="text-xs text-muted-foreground">{app.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{app.specialization}</TableCell>
                        <TableCell>{app.yearsOfExperience} {t("common.years")}</TableCell>
                        <TableCell>{app.education}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.bg}`}>
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("common.of")} {pagination.total} {t("jobApplications.fields.application")}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  {t("common.previous")}
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
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
