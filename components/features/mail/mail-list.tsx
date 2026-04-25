"use client";

import { useState } from "react";
import { Star, Search, Archive, Trash2, MailOpen, CheckSquare, Square } from "lucide-react";
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
import { EmployeeName } from "./employee-name";
import type { MailFolder } from "@/lib/api/mail";

interface Props {
  folder: MailFolder;
  onOpenMessage: (messageId: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  page: number;
  onPageChange: (p: number) => void;
}

const LIMIT = 20;

export function MailList({ folder, onOpenMessage, search, onSearchChange, page, onPageChange }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  const params = { page, limit: LIMIT, search: search || undefined };

  const folderKey = folder.toLowerCase() as Lowercase<MailFolder>;
  const activeQuery = useQuery({
    queryKey: ["mail", folderKey, params],
    queryFn: () => {
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

  const isSentOrDraft = folder === "SENT" || folder === "DRAFTS";
  const items: any[] = activeQuery.data?.items ?? [];
  const total: number = activeQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT) || 1;

  const getMessageId = (item: any): string =>
    isSentOrDraft ? item.id : item.messageId;

  const getSubject = (item: any): string =>
    isSentOrDraft ? item.subject : item.message?.subject ?? "(بدون موضوع)";

  const getSender = (item: any): { name: string | null; id: string | null } => {
    if (isSentOrDraft) return { name: "أنت", id: null };
    const s = item.message?.sender;
    if (s?.firstNameAr) return { name: `${s.firstNameAr} ${s.lastNameAr}`, id: null };
    return { name: null, id: item.message?.senderId ?? null };
  };

  const getDate = (item: any): string => {
    const d = isSentOrDraft ? item.createdAt : item.message?.createdAt ?? item.createdAt;
    return format(new Date(d), "d MMM", { locale: ar });
  };

  const isUnread = (item: any): boolean =>
    !isSentOrDraft && !item.isRead;

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
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في الرسائل..."
            value={search}
            onChange={(e) => { onSearchChange(e.target.value); onPageChange(1); }}
            className="pr-9 h-8 text-sm"
          />
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => updateRead.mutate({ messageIds: selected, isRead: true })}
            >
              <MailOpen className="h-3.5 w-3.5 ml-1" />
              مقروء
            </Button>
            {folder !== "ARCHIVE" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => { moveMail.mutate({ messageIds: selected, folder: "ARCHIVE" }); clearSelect(); }}
              >
                <Archive className="h-3.5 w-3.5 ml-1" />
                أرشفة
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-red-600 hover:text-red-700"
              onClick={() => { moveMail.mutate({ messageIds: selected, folder: "TRASH" }); clearSelect(); }}
            >
              <Trash2 className="h-3.5 w-3.5 ml-1" />
              حذف
            </Button>
            <span className="text-xs text-muted-foreground">{selected.length} محدد</span>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
            <MailOpen className="h-10 w-10 opacity-30" />
            لا توجد رسائل
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
                  {(() => { const s = getSender(item); return s.name ?? <EmployeeName userId={s.id!} />; })()}
                </span>

                {/* Subject + preview */}
                <div className="flex-1 min-w-0">
                  <span className={cn("text-sm truncate block", unread && "font-medium")}>
                    {getSubject(item)}
                  </span>
                </div>

                {/* Unread dot */}
                {unread && (
                  <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                )}

                {/* Date */}
                <span className="text-xs text-muted-foreground shrink-0 w-14 text-left">
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
            السابق
          </Button>
          <span className="text-muted-foreground">{page} / {totalPages}</span>
          <Button
            size="sm"
            variant="ghost"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}
