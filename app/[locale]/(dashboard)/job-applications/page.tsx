"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { format } from "date-fns";
import { Eye, Users, Clock, CheckCircle, XCircle, Briefcase, UserCheck } from "lucide-react";
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
import { useJobApplications, useJobApplicationStats } from "@/lib/hooks/use-job-applications";
import { JobApplication, JobApplicationStatus } from "@/types";
import { useLocale } from "next-intl";

const STATUS_CONFIG: Record<JobApplicationStatus, { color: string; bg: string; label: string }> = {
  PENDING:         { color: "#F59E0B", bg: "bg-amber-100 text-amber-800",   label: "معلق" },
  INTERVIEW_READY: { color: "#3B82F6", bg: "bg-blue-100 text-blue-800",     label: "مؤهل للمقابلة" },
  ACCEPTED:        { color: "#10B981", bg: "bg-green-100 text-green-800",   label: "مقبول" },
  REJECTED:        { color: "#EF4444", bg: "bg-red-100 text-red-800",       label: "مرفوض" },
  HIRED:           { color: "#8B5CF6", bg: "bg-purple-100 text-purple-800", label: "تم التوظيف" },
};

const STATUSES: JobApplicationStatus[] = ["PENDING", "INTERVIEW_READY", "ACCEPTED", "REJECTED", "HIRED"];

export default function JobApplicationsPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useJobApplications({
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    page,
    limit: 20,
  });
  const { data: stats } = useJobApplicationStats();

  const applications: JobApplication[] =
    (data as any)?.data?.data || (data as any)?.data || [];
  const pagination = (data as any)?.data?.pagination;
  const statsData = stats as any;

  const statCards = [
    { label: t("jobApplications.stats.total"),    value: statsData?.total ?? 0,         icon: Users,     color: "text-foreground" },
    { label: t("jobApplications.stats.pending"),   value: statsData?.pending ?? 0,       icon: Clock,     color: "text-amber-500" },
    { label: t("jobApplications.stats.interview"), value: statsData?.interviewReady ?? 0,icon: Briefcase, color: "text-blue-500" },
    { label: t("jobApplications.stats.accepted"),  value: statsData?.accepted ?? 0,      icon: CheckCircle,color: "text-green-500" },
    { label: t("jobApplications.stats.rejected"),  value: statsData?.rejected ?? 0,      icon: XCircle,   color: "text-red-500" },
    { label: t("jobApplications.stats.hired"),     value: statsData?.hired ?? 0,         icon: UserCheck, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("jobApplications.title")}
        description={t("jobApplications.description")}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="cursor-pointer hover:shadow-md transition-shadow">
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

      {/* Filter */}
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

      {/* Table */}
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
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
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
                        onClick={() => router.push(`/${locale}/job-applications/${app.id}`)}
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("common.of")} {pagination.total} {t("jobApplications.fields.application")}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
