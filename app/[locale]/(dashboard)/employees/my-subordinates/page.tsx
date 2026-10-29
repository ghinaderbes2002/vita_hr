"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { employeesApi } from "@/lib/api/employees";

/**
 * "My team" for a direct manager: the employees who report to the signed-in
 * user, with what each one's job is. The API reads who from the token.
 */
export default function MySubordinatesPage() {
  const t = useTranslations("mySubordinates");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [search, setSearch] = useState("");

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["my-subordinates"],
    queryFn: () => employeesApi.getMySubordinates(),
  });

  const q = search.trim().toLowerCase();
  const rows = data.filter((e) =>
    !q
    || e.name?.toLowerCase().includes(q)
    || e.nameEn?.toLowerCase().includes(q)
    || e.employeeNumber?.toLowerCase().includes(q)
    || e.jobTitle?.toLowerCase().includes(q),
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} className="ps-9" />
      </div>

      <div className="rounded-md border">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-destructive">{t("error")}</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8 text-muted-foreground" />}
            title={q ? t("noMatches") : t("empty")}
            description={q ? undefined : t("emptyHint")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colEmployee")}</TableHead>
                <TableHead>{t("colNumber")}</TableHead>
                <TableHead>{t("colJobTitle")}</TableHead>
                <TableHead>{t("colJobDescription")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => {
                const name = (isAr ? e.name : e.nameEn) || e.name || e.nameEn || "—";
                const other = isAr ? e.nameEn : e.name;
                const jobTitle = (isAr ? e.jobTitle : e.jobTitleEn) || e.jobTitle || e.jobTitleEn || "—";
                return (
                  <TableRow key={e.employeeId}>
                    <TableCell>
                      <p className="font-medium">{name}</p>
                      {other && other !== name && <p className="text-xs text-muted-foreground" dir="auto">{other}</p>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.employeeNumber || "—"}</TableCell>
                    <TableCell>{jobTitle}</TableCell>
                    <TableCell className="max-w-md text-sm text-muted-foreground whitespace-pre-wrap">
                      {e.jobTitleDescription || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
