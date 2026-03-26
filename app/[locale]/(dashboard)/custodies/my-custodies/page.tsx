"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Package, RotateCcw, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useEmployeeCustodies, useEmployeeCustodySummary } from "@/lib/hooks/use-custodies";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Custody, CustodyStatus } from "@/types";

const STATUS_VARIANTS: Record<CustodyStatus, "default" | "secondary" | "destructive" | "outline"> = {
  WITH_EMPLOYEE: "default",
  RETURNED: "secondary",
  DAMAGED: "destructive",
  LOST: "destructive",
};

export default function MyCustodiesPage() {
  const t = useTranslations();
  const { user } = useAuthStore();
  const employeeId = user?.employeeId || "";

  const { data: custodiesData, isLoading } = useEmployeeCustodies(employeeId);
  const { data: summary } = useEmployeeCustodySummary(employeeId);

  const custodies: Custody[] =
    (custodiesData as any)?.data?.data ||
    (custodiesData as any)?.data ||
    (Array.isArray(custodiesData) ? custodiesData : []);

  const summaryData = summary as any;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("custodies.myTitle")}
        description={t("custodies.myDescription")}
      />

      {/* Summary cards */}
      {summaryData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("custodies.summary.total")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summaryData.total ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("custodies.summary.withEmployee")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <p className="text-2xl font-bold">{summaryData.withEmployee ?? 0}</p>
              <Package className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("custodies.summary.returned")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <p className="text-2xl font-bold">{summaryData.returned ?? 0}</p>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("custodies.summary.damaged")} / {t("custodies.summary.lost")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <p className="text-2xl font-bold">{(summaryData.damaged ?? 0) + (summaryData.lost ?? 0)}</p>
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("custodies.fields.name")}</TableHead>
              <TableHead>{t("custodies.fields.category")}</TableHead>
              <TableHead>{t("custodies.fields.serialNumber")}</TableHead>
              <TableHead>{t("custodies.fields.assignedDate")}</TableHead>
              <TableHead>{t("custodies.fields.returnedDate")}</TableHead>
              <TableHead>{t("custodies.fields.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : custodies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">{t("common.noData")}</TableCell>
              </TableRow>
            ) : (
              custodies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.description && (
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(`custodies.categories.${c.category}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.serialNumber || "—"}</TableCell>
                  <TableCell>
                    {c.assignedDate ? format(new Date(c.assignedDate), "yyyy/MM/dd") : "—"}
                  </TableCell>
                  <TableCell>
                    {c.returnedDate ? format(new Date(c.returnedDate), "yyyy/MM/dd") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[c.status]}>
                      {t(`custodies.statuses.${c.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
