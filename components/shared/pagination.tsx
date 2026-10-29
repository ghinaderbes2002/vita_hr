"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  const t = useTranslations("common");

  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-2 py-3">
      <p className="text-xs sm:text-sm text-muted-foreground">
        {from}–{to} {t("of")} {total}
      </p>
      {/* The labels sit where they always did ("previous" left, "next" right), but
          the left button moves forward and the right one back — the clinic's choice. */}
      <div className="flex items-center gap-2 rtl:flex-row-reverse">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronLeft className="h-4 w-4" />
          {t("previous")}
        </Button>
        {/* Spelled out: "1 / 5" reads as "5 / 1" in Arabic. */}
        <span className="text-sm font-medium px-2 tabular-nums">
          {t("pageOf", { page, total: totalPages })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          {t("next")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
