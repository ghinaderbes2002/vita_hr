"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, Crown, MessageCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentStars } from "@/lib/hooks/use-star-of-month";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import type { StarCurrent } from "@/lib/api/star-of-month";
import { assetUrl } from "@/lib/utils";
import { StarComments } from "./star-comments";

const COMPANY_NAME = { VITASYR: "VitaSyr", VITAXIR: "VitaXir" } as const;

type Winner = StarCurrent["winners"][number];

/**
 * The latest stars of the month on the home page, one per company, with their
 * photo and a way to congratulate them. Shows nothing until a cycle has closed.
 */
export function CurrentStarsCard() {
  const t = useTranslations("starOfMonth");
  const locale = useLocale();
  const { data } = useCurrentStars();
  const { data: employees } = useEmployeesBasicList();
  const [commentsFor, setCommentsFor] = useState<{ winner: Winner; name: string } | null>(null);
  const winners = data?.winners ?? [];
  if (winners.length === 0) return null;

  const nameOf = (w: Winner) => {
    const e = w.employee ?? (Array.isArray(employees) ? employees.find((x) => x.id === w.employeeId) : undefined);
    return e ? `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim() : "";
  };

  return (
    <Card className="overflow-hidden border-amber-200 bg-linear-to-br from-amber-50/80 to-transparent dark:border-amber-900 dark:from-amber-950/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="h-5 w-5 text-amber-500" />
          {t("title")}
        </CardTitle>
        <Link href={`/${locale}/star-of-month`} className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
          {t("viewDetails")}
          <ChevronLeft className="h-3.5 w-3.5 ltr:rotate-180" />
        </Link>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {winners.map((w) => {
          const name = nameOf(w);
          return (
            <div key={w.company} className="flex items-center gap-4 rounded-xl border bg-background/70 p-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-100 ring-2 ring-amber-300">
                {w.imageUrl
                  ? <img src={assetUrl(w.imageUrl)} alt={name} className="h-full w-full object-cover" />
                  : <Star className="h-8 w-8 text-amber-500" />}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{COMPANY_NAME[w.company]}</p>
                {name && <p className="truncate text-base font-bold">{name}</p>}
                <p className="truncate text-xs text-muted-foreground">{w.title}</p>
                {/* Comments are keyed by the winner's candidate id. */}
                {w.candidateId && (
                  <Button variant="ghost" size="sm" className="-ms-2 h-7 gap-1 px-2 text-xs" onClick={() => setCommentsFor({ winner: w, name })}>
                    <MessageCircle className="h-3.5 w-3.5" />
                    {t("congratulate")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={!!commentsFor} onOpenChange={(o) => { if (!o) setCommentsFor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{commentsFor?.name || commentsFor?.winner.title}</DialogTitle>
          </DialogHeader>
          {commentsFor?.winner.candidateId && <StarComments candidateId={commentsFor.winner.candidateId} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
