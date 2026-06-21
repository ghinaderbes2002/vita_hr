"use client";

import { useState, useMemo } from "react";
import { Star, Search, Archive, Trash2, Mail, MailOpen, CalendarDays, X, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { mailApi } from "@/lib/api/mail";
import {
  useUpdateRead, useUpdateStar, useMoveMail,
} from "@/lib/hooks/use-mail";
import { useAllUsers } from "@/lib/hooks/use-users";
import type { MailFolder } from "@/lib/api/mail";

interface Props {
  folder: MailFolder;
  onOpenMessage: (messageId: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  page: number;
  onPageChange: (p: number) => void;
  archiveFolderId?: string;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (v: string) => void;
  onDateToChange?: (v: string) => void;
}

const LIMIT = 20;

export function MailList({
  folder, onOpenMessage, search, onSearchChange, page, onPageChange,
  archiveFolderId, dateFrom, dateTo, onDateFromChange, onDateToChange,
}: Props) {
  const t = useTranslations("mail");
  const [selected, setSelected] = useState<string[]>([]);
  const [showDateFilter, setShowDateFilter] = useState(false);

  const params = {
    page,
    limit: LIMIT,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    archiveFolderId: archiveFolderId || undefined,
  };

  const folderKey = folder.toLowerCase() as Lowercase<MailFolder>;
  const activeQuery = useQuery<any>({
    queryKey: ["mail", folderKey, params],
    queryFn: (): Promise<any> => {
      switch (folder) {
        case "INBOX":   return mailApi.getInbox(params);
        case "SENT":    return mailApi.getSent(params);
        case "DRAFTS":  return mailApi.getDrafts(params);
        case "ARCHIVE": return mailApi.getArchive(params);
        case "TRASH":   return mailApi.getTrash(params);
      }
    },
  });

  const updateRead = useUpdateRead();
  const updateStar = useUpdateStar();
  const moveMail   = useMoveMail();
  const { data: allUsersData } = useAllUsers();
  const userNameById = useMemo(() => {
    const map: Record<string, string> = {};
    const users = (allUsersData as any)?.data?.items ?? (allUsersData as any)?.data ?? [];
    for (const u of users) {
      if (u.id && u.fullName) map[u.id] = u.fullName;
    }
    return map;
  }, [allUsersData]);

  // DRAFTS still returns message objects directly; all other folders return recipient-wrapped items
  const isDraft = folder === "DRAFTS";
  const items: any[] = activeQuery.data?.items ?? [];
  const total: number = activeQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT) || 1;

  const getMessageId = (item: any): string =>
    isDraft ? item.id : (item.messageId ?? item.message?.id);

  const getSubject = (item: any): string =>
    isDraft ? item.subject : item.message?.subject ?? t("noSubject");

  const getSender = (item: any): { name: string | null; id: string | null } => {
    if (isDraft) return { name: t("draft"), id: null };
    if (folder === "SENT") {
      // Show first TO recipient name
      const toR = item.message?.recipients?.find((r: any) => r.type === "TO");
      const info = toR?.employeeInfo ?? toR?.recipient;
      if (info?.firstNameAr) return { name: `${info.firstNameAr} ${info.lastNameAr}`, id: null };
      if (toR?.recipientId) return { name: null, id: toR.recipientId };
      return { name: "—", id: null };
    }
    const s = item.message?.senderInfo ?? item.message?.sender;
    if (s?.firstNameAr) return { name: `${s.firstNameAr} ${s.lastNameAr}`, id: null };
    return { name: null, id: item.message?.senderId ?? null };
  };

  const getDate = (item: any): string => {
    const d = isDraft ? item.createdAt : item.message?.createdAt ?? item.createdAt;
    return format(new Date(d), "d MMM HH:mm", { locale: ar });
  };

  const isUnread = (item: any): boolean =>
    !isDraft && folder !== "SENT" && !item.isRead;

  const isStarred = (item: any): boolean =>
    !!(item.isStarred ?? item.message?.isStarred);

  const toggleSelect = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const selectAll = () =>
    setSelected(items.map((item) => getMessageId(item)));

  const clearSelect = () => setSelected([]);

  const handleOpen = (item: any) => {
    const msgId = getMessageId(item);
    onOpenMessage(msgId);
    if (isUnread(item)) {
      updateRead.mutate({ messageIds: [msgId], isRead: true });
    }
  };

  if (activeQuery.isLoading) {
    return (
      <div className="divide-y">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col gap-1.5 px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              value={search}
              onChange={(e) => { onSearchChange(e.target.value); onPageChange(1); }}
              className="pr-9 h-8 text-sm"
            />
          </div>
          <Button
            size="sm"
            variant={showDateFilter || dateFrom || dateTo ? "secondary" : "ghost"}
            className="h-8 gap-1.5 text-xs shrink-0"
            onClick={() => setShowDateFilter((v) => !v)}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {t("filterByDate")}
            {(dateFrom || dateTo) && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            )}
          </Button>
          {selected.length > 0 && (
            <div className="flex items-center gap-1 border-r pr-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => updateRead.mutate({ messageIds: selected, isRead: true })}
              >
                <MailOpen className="h-3.5 w-3.5 ml-1" />
                {t("markAsRead")}
              </Button>
              {folder !== "ARCHIVE" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => { moveMail.mutate({ messageIds: selected, folder: "ARCHIVE" }); clearSelect(); }}
                >
                  <Archive className="h-3.5 w-3.5 ml-1" />
                  {t("archiveAction")}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-red-600 hover:text-red-700"
                onClick={() => { moveMail.mutate({ messageIds: selected, folder: "TRASH" }); clearSelect(); }}
              >
                <Trash2 className="h-3.5 w-3.5 ml-1" />
                {t("delete")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("selectedCount", { count: selected.length })}</span>
            </div>
          )}
        </div>

        {/* Date filter row */}
        {showDateFilter && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">{t("dateFrom")}</span>
              <Input
                type="date"
                value={dateFrom ?? ""}
                onChange={(e) => onDateFromChange?.(e.target.value)}
                className="h-7 text-xs w-36"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">{t("dateTo")}</span>
              <Input
                type="date"
                value={dateTo ?? ""}
                onChange={(e) => onDateToChange?.(e.target.value)}
                className="h-7 text-xs w-36"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { onDateFromChange?.(""); onDateToChange?.(""); }}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" />
                {t("clearFilter")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
            <MailOpen className="h-10 w-10 opacity-30" />
            {t("noMessages")}
          </div>
        ) : (
          items.map((item: any) => {
            const msgId = getMessageId(item);
            const unread = isUnread(item);
            const starred = isStarred(item);
            const isSelected = selected.includes(msgId);

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
                  unread && "bg-blue-50/40",
                  isSelected && "bg-primary/5",
                )}
                onClick={() => handleOpen(item)}
              >
                {/* Checkbox */}
                <div
                  onClick={(e) => { e.stopPropagation(); toggleSelect(msgId); }}
                  className="shrink-0"
                >
                  <Checkbox checked={isSelected} className="h-4 w-4" />
                </div>

                {/* Star */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStar.mutate({ messageIds: [msgId], isStarred: !starred });
                  }}
                  className="shrink-0 text-muted-foreground hover:text-amber-400 transition-colors"
                >
                  <Star className={cn("h-4 w-4", starred && "fill-amber-400 text-amber-400")} />
                </button>

                {/* Sender */}
                <span className={cn("w-32 shrink-0 text-sm truncate", unread ? "font-semibold" : "text-muted-foreground")}>
                  {(() => { const s = getSender(item); return s.name ?? (s.id ? userNameById[s.id] ?? null : null); })()}
                </span>

                {/* Subject + preview */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className={cn("text-sm truncate", unread && "font-medium")}>
                    {getSubject(item)}
                  </span>
                  {(item?.importance === "HIGH" || item?.message?.importance === "HIGH") && (
                    <span className="shrink-0 text-red-500" title="مهم جداً">
                      <AlertCircle className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                {/* Read/Unread toggle */}
                {!isDraft && folder !== "SENT" && (
                  <button
                    title={unread ? t("markAsReadTitle") : t("markAsUnreadTitle")}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateRead.mutate({ messageIds: [msgId], isRead: unread });
                    }}
                    className="shrink-0 transition-colors"
                  >
                    {unread
                      ? <Mail className="h-4 w-4 text-blue-500 fill-blue-100" />
                      : <MailOpen className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground" />}
                  </button>
                )}

                {/* Date */}
                <span className="text-xs text-muted-foreground shrink-0 w-24 text-left">
                  {getDate(item)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 px-4 py-2 border-t text-sm">
          <Button
            size="sm"
            variant="ghost"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          >
            {t("previous")}
          </Button>
          <span className="text-muted-foreground">{page} / {totalPages}</span>
          <Button
            size="sm"
            variant="ghost"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {t("next")}
          </Button>
        </div>
      )}
    </div>
  );
}
