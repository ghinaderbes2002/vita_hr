"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Package, AlertTriangle, CheckCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { useMyCustodies } from "@/lib/hooks/use-custodies";
import { CustodyStatus } from "@/types";

const STATUS_VARIANTS: Record<CustodyStatus, "default" | "secondary" | "destructive" | "outline"> = {
  WITH_EMPLOYEE: "default",
  RETURNED: "secondary",
  DAMAGED: "destructive",
  LOST: "destructive",
};

export default function MyCustodiesPage() {
  const t = useTranslations();

  const { data: rawData, isLoading } = useMyCustodies();

  const custodies: any[] = Array.isArray(rawData)
    ? rawData
    : (rawData as any)?.data?.items ?? (rawData as any)?.data ?? [];

  const total = custodies.length;
  const withEmployee = custodies.filter((c) => c.status === "WITH_EMPLOYEE").length;
  const returned = custodies.filter((c) => c.status === "RETURNED").length;
  const damaged = custodies.filter((c) => c.status === "DAMAGED" || c.status === "LOST").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("custodies.myTitle")}
        description={t("custodies.myDescription")}
        count={total}
      />

      {/* Summary cards */}
      {!isLoading && total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("custodies.summary.total")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("custodies.summary.withEmployee")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <p className="text-2xl font-bold">{withEmployee}</p>
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
              <p className="text-2xl font-bold">{returned}</p>
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
              <p className="text-2xl font-bold">{damaged}</p>
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
              <TableHead>{t("custodies.fields.serialNumber")}</TableHead>
              <TableHead>{t("custodies.fields.assignedDate")}</TableHead>
              <TableHead>{t("custodies.fields.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : custodies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="p-0">
                  <EmptyState
                    icon={<RotateCcw className="h-10 w-10" />}
                    title="لا توجد عهد"
                    description="لم يتم تخصيص أي عهد لك حتى الآن"
                  />
                </TableCell>
              </TableRow>
            ) : (
              custodies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.serialNumber || "—"}</TableCell>
                  <TableCell>
                    {c.assignedDate ? format(new Date(c.assignedDate), "yyyy/MM/dd") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[c.status as CustodyStatus] ?? "outline"}>
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
