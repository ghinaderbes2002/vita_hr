"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS, tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useHolidays, useDeleteHoliday } from "@/lib/hooks/use-holidays";
import { HolidayDialog } from "@/components/features/holidays/holiday-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Holiday } from "@/types";

export default function HolidaysPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);

  const { data, isLoading } = useHolidays();
  const deleteHoliday = useDeleteHoliday();

  // Get the appropriate locale for date-fns
  const dateLocale = locale === "ar" ? ar : locale === "tr" ? tr : enUS;

  // Handle different API response formats
  const holidays = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const filteredHolidays = holidays.filter((holiday: Holiday) =>
    holiday.nameAr?.toLowerCase().includes(search.toLowerCase()) ||
    holiday.nameEn?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setDialogOpen(true);
  };

  const handleDelete = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedHoliday) {
      await deleteHoliday.mutateAsync(selectedHoliday.id);
      setDeleteDialogOpen(false);
      setSelectedHoliday(null);
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "PUBLIC":
        return "default";
      case "NATIONAL":
        return "secondary";
      case "RELIGIOUS":
        return "outline";
      default:
        return "outline";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "PUBLIC":
        return t("holidays.types.public");
      case "NATIONAL":
        return t("holidays.types.national");
      case "RELIGIOUS":
        return t("holidays.types.religious");
      default:
        return t("holidays.types.other");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("holidays.title")}
        description={t("holidays.description")}
        actions={
          <Button onClick={() => { setSelectedHoliday(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 ml-2" />
            {t("holidays.addHoliday")}
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("holidays.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("holidays.fields.nameAr")}</TableHead>
              <TableHead>{t("holidays.fields.nameEn")}</TableHead>
              <TableHead>{t("holidays.fields.date")}</TableHead>
              <TableHead>{t("holidays.fields.type")}</TableHead>
              <TableHead>{t("holidays.fields.isRecurring")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredHolidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              filteredHolidays.map((holiday: Holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="font-medium">{holiday.nameAr}</TableCell>
                  <TableCell>{holiday.nameEn}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(holiday.date), "PPP", { locale: dateLocale })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTypeBadgeVariant(holiday.type)}>
                      {getTypeLabel(holiday.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={holiday.isRecurring ? "default" : "secondary"}>
                      {holiday.isRecurring ? t("common.yes") : t("common.no")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(holiday)}>
                          <Pencil className="h-4 w-4 ml-2" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(holiday)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <HolidayDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        holiday={selectedHoliday || undefined}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("messages.confirmDelete")}
        description={t("messages.actionCantUndo")}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
