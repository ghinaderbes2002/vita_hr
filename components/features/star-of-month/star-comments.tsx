"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useAddStarComment, useDeleteStarComment, useStarComments } from "@/lib/hooks/use-star-of-month";
import type { StarComment } from "@/lib/api/star-of-month";

const MAX = 500;

/** Congratulations under a star's photo: anyone may write, HR may remove. */
export function StarComments({ candidateId }: { candidateId: string }) {
  const t = useTranslations("starOfMonth");
  const locale = useLocale();
  const { hasPermission } = usePermissions();
  const canModerate = hasPermission(PERMISSIONS.STAR_OF_MONTH.MODERATE_COMMENTS);
  const { data: comments = [], isLoading } = useStarComments(candidateId);
  const add = useAddStarComment(candidateId);
  const remove = useDeleteStarComment(candidateId);
  const [text, setText] = useState("");

  const send = () => {
    const value = text.trim();
    if (!value) return;
    add.mutate(value, { onSuccess: () => setText("") });
  };
  const authorOf = (c: StarComment) =>
    c.author ? `${c.author.firstNameAr ?? ""} ${c.author.lastNameAr ?? ""}`.trim() || t("anonymousAuthor") : t("anonymousAuthor");
  const when = (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        {t("comments", { count: comments.length })}
      </p>

      <div className="max-h-72 space-y-2 overflow-y-auto">
        {isLoading ? (
          <Skeleton className="h-14 w-full" />
        ) : comments.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">{t("noComments")}</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="group rounded-md bg-muted/40 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{authorOf(c)}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{when(c.createdAt)}</span>
                  {canModerate && (
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                      aria-label={t("deleteComment")} disabled={remove.isPending}
                      onClick={() => remove.mutate(c.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.text}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          maxLength={MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("commentPlaceholder")}
          className="min-h-0 flex-1 resize-none"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <Button size="icon" aria-label={t("sendComment")} disabled={!text.trim() || add.isPending} onClick={send}>
          {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />}
        </Button>
      </div>
    </div>
  );
}
