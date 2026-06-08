"use client";

import { useState } from "react";
import { Search, Shield, RefreshCw, Eye } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { useAuditLogs } from "@/lib/hooks/use-audit-logs";
import { AuditLog } from "@/lib/api/audit-logs";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700",
  POST: "bg-green-100 text-green-700",
  PATCH: "bg-amber-100 text-amber-700",
  PUT: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
};

const RESOURCES = [
  "leave-requests", "employees", "departments", "attendance",
  "evaluations", "users", "audit-logs", "salaries", "maintenance",
  "custodies", "requests", "roles", "holidays", "leave-types",
];

function MetadataValue({ value }: { value: any }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (typeof value === "boolean") {
    return <Badge variant={value ? "default" : "secondary"}>{value ? "true" : "false"}</Badge>;
  }
  if (typeof value === "object") {
    return (
      <div className="rounded-md border bg-muted/30 p-2 space-y-1 text-xs">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span className="text-muted-foreground min-w-24 shrink-0">{k}</span>
            <span className="font-medium break-all">
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return <span className="font-medium break-all">{String(value)}</span>;
}

function MetadataPanel({ metadata }: { metadata: Record<string, any> }) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات إضافية</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{key}</p>
          <div className="text-sm">
            <MetadataValue value={value} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AuditLogsPage() {
  const t = useTranslations("auditLogs");

  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [resource, setResource] = useState("");
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);
  const LIMIT = 20;

  const { data, isLoading, refetch } = useAuditLogs({
    page,
    limit: LIMIT,
    ...(from && { from }),
    ...(to && { to }),
    ...(resource && { resource }),
  });

  const raw = data as any;
  const logs: AuditLog[] = Array.isArray(raw?.data)
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
      const d = new Date(iso);
      const datePart = new Intl.DateTimeFormat("en-GB", {
        year: "numeric", month: "short", day: "numeric",
      }).format(d);
      const timePart = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      }).format(d);
      return `${datePart}، ${timePart}`;
    } catch {
      return iso;
    }
  };

  const handleFilter = () => {
    setPage(1);
    refetch();
  };

  const hasMetadata = (log: AuditLog) =>
    log.metadata && Object.keys(log.metadata).length > 0;

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
              <TableHead className="w-10">#</TableHead>
              <TableHead>{t("table.user")}</TableHead>
              <TableHead className="w-20">{t("table.method")}</TableHead>
              <TableHead>{t("table.description")}</TableHead>
              <TableHead className="w-44">{t("table.date")}</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log, idx) => (
                <TableRow key={log.id} className="group">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {(page - 1) * LIMIT + idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">{log.username || "—"}</TableCell>
                  <TableCell>
                    <Badge className={METHOD_COLORS[log.method] || "bg-gray-100 text-gray-700"}>
                      {log.method}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-sm">
                    <p className="truncate">
                      {log.description || log.action || "—"}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setDetailLog(log)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
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

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={(v) => !v && setDetailLog(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge className={METHOD_COLORS[detailLog?.method ?? ""] || "bg-gray-100 text-gray-700"}>
                {detailLog?.method}
              </Badge>
              <span className="font-mono text-sm font-normal text-muted-foreground truncate">
                {detailLog?.path}
              </span>
            </DialogTitle>
          </DialogHeader>

          {detailLog && (
            <div className="space-y-4 text-sm">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">{t("table.user")}</p>
                  <p className="font-medium">{detailLog.username || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">IP</p>
                  <p className="font-mono">{detailLog.ip || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Resource</p>
                  <p>{detailLog.resource || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("table.date")}</p>
                  <p>{formatDate(detailLog.createdAt)}</p>
                </div>
              </div>

              {/* Description */}
              {detailLog.description && (
                <div className="rounded-md bg-muted/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground mb-0.5">{t("table.description")}</p>
                  <p className="font-medium">{detailLog.description}</p>
                </div>
              )}

              {/* Metadata */}
              {hasMetadata(detailLog) && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Metadata
                  </p>
                  <div className="rounded-md border bg-muted/20 p-3">
                    <MetadataPanel metadata={detailLog.metadata!} />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
