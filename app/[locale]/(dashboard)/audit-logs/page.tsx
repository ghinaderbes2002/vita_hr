"use client";

import { useState } from "react";
import { Search, Shield, RefreshCw } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { useAuditLogs } from "@/lib/hooks/use-audit-logs";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700",
  POST: "bg-green-100 text-green-700",
  PATCH: "bg-amber-100 text-amber-700",
  PUT: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
};

const RESOURCES = [
  "leave-requests", "employees", "departments", "attendance",
  "evaluations", "users", "audit-logs", "salaries",
];

export default function AuditLogsPage() {
  const t = useTranslations("auditLogs");
  const locale = useLocale();

  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [resource, setResource] = useState("");
  const LIMIT = 20;

  const { data, isLoading, refetch } = useAuditLogs({
    page,
    limit: LIMIT,
    ...(from && { from }),
    ...(to && { to }),
    ...(resource && { resource }),
  });

  const raw = data as any;
  const logs: any[] = Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.data?.data)
    ? raw.data.data
    : Array.isArray(raw)
    ? raw
    : [];
  const total: number = raw?.total ?? raw?.data?.total ?? raw?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT) || 1;

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(locale, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const handleFilter = () => {
    setPage(1);
    refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 ml-2" />
            {t("refresh")}
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{t("filters.from")}</label>
          <Input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-52"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{t("filters.to")}</label>
          <Input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-52"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{t("filters.resource")}</label>
          <select
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm w-48"
          >
            <option value="">{t("filters.all")}</option>
            {RESOURCES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <Button onClick={handleFilter}>
          <Search className="h-4 w-4 ml-2" />
          {t("filters.filter")}
        </Button>
        {(from || to || resource) && (
          <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); setResource(""); setPage(1); }}>
            {t("filters.clear")}
          </Button>
        )}
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>{t("totalRecords")}: <strong className="text-foreground">{total}</strong></span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>{t("table.user")}</TableHead>
              <TableHead>{t("table.method")}</TableHead>
              <TableHead>{t("table.description")}</TableHead>
              <TableHead>{t("table.date")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.id}</TableCell>
                  <TableCell className="font-medium">{log.username || "—"}</TableCell>
                  <TableCell>
                    <Badge className={METHOD_COLORS[log.method] || "bg-gray-100 text-gray-700"}>
                      {log.method}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-md">
                    {log.description || <span className="font-mono text-xs text-muted-foreground">{log.action}</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={LIMIT}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
