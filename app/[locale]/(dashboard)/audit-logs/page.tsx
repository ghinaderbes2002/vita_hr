"use client";

import { useState } from "react";
import { Search, Shield, RefreshCw } from "lucide-react";
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
      return new Intl.DateTimeFormat("ar", {
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
        title="سجلات التدقيق"
        description="متابعة جميع العمليات والأنشطة في النظام"
        actions={
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">من تاريخ</label>
          <Input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-52"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">إلى تاريخ</label>
          <Input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-52"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">المورد</label>
          <select
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm w-48"
          >
            <option value="">الكل</option>
            {RESOURCES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <Button onClick={handleFilter}>
          <Search className="h-4 w-4 ml-2" />
          تصفية
        </Button>
        {(from || to || resource) && (
          <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); setResource(""); setPage(1); }}>
            مسح الفلتر
          </Button>
        )}
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>إجمالي السجلات: <strong className="text-foreground">{total}</strong></span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>المستخدم</TableHead>
              <TableHead>الطريقة</TableHead>
              <TableHead>المسار</TableHead>
              <TableHead>المورد</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  لا توجد سجلات
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
                  <TableCell className="font-mono text-xs max-w-64 truncate" title={log.path}>
                    {log.path}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{log.resource}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.ip}</TableCell>
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
