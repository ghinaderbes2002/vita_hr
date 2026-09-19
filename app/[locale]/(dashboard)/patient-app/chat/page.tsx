"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, MessageSquare, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { PageGuard } from "@/components/permissions/page-guard";
import { PatientName } from "@/components/patient-app/patient-picker";
import { cn } from "@/lib/utils";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  PATIENT_APP_CHAT_KEY, useChatConversations, useSendChatMessage,
} from "@/lib/hooks/use-patient-app";
import {
  ChatConversation, ChatMessage, isFromPatient, patientAppApi,
} from "@/lib/api/patient-app";

/** The gateway has no WebSocket support; the guide recommends polling every 3–5s. */
const POLL_MS = 4000;

const fmtTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short", hour12: true }) : "";

const lastActivity = (c: ChatConversation) =>
  c.lastMessageAt ?? c.lastMessage?.createdAt ?? c.createdAt ?? "";

export default function PatientAppChatPage() {
  const t = useTranslations("patientApp.chat");
  const [activeId, setActiveId] = useState<string | null>(null);
  // Conversations belong to the therapist responsible for the patient, so an
  // admin has none — the request is skipped rather than answered empty.
  const { isAdmin } = usePermissions();
  const adminView = isAdmin();
  const { data = [], isLoading } = useChatConversations(!adminView);
  const conversations = [...data].sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)));
  const active = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <PageGuard permission={PERMISSIONS.PATIENT_APP.CHAT_USE}>
      <div className="space-y-4">
        <PageHeader title={t("title")} description={t("description")} />

        {adminView ? (
          <div className="rounded-lg border p-10 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("adminNotice")}</p>
          </div>
        ) : (
        <div className="grid h-[calc(100dvh-13rem)] min-h-[28rem] grid-rows-[minmax(0,1fr)] overflow-hidden rounded-lg border lg:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className={cn("flex min-h-0 flex-col border-e", active ? "hidden lg:flex" : "flex")}>
            <div className="border-b px-4 py-3 text-sm font-medium">
              {t("conversations", { count: conversations.length })}
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : conversations.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("empty")}</p>
              ) : (
                conversations.map((c) => {
                  const unread = c.unreadCount ?? 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className={cn(
                        "flex w-full items-center gap-3 border-b px-4 py-3 text-start transition-colors",
                        c.id === activeId ? "bg-accent" : "hover:bg-accent/50",
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <UserRound className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("truncate text-sm", unread > 0 && "font-semibold")}>
                            <PatientName id={c.erpPatientId} name={c.patientName} />
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground" dir="ltr">
                            {fmtTime(lastActivity(c))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-muted-foreground">
                            {c.lastMessage?.messageText ?? ""}
                          </span>
                          {unread > 0 && (
                            <Badge className="h-5 min-w-5 shrink-0 justify-center rounded-full px-1.5 text-[11px]">
                              {unread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className={cn("min-h-0 flex-col", active ? "flex" : "hidden lg:flex")}>
            {active ? (
              <ChatThread key={active.id} conversation={active} onBack={() => setActiveId(null)} />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                <MessageSquare className="h-10 w-10" />
                <p className="text-sm">{t("pick")}</p>
              </div>
            )}
          </section>
        </div>
        )}
      </div>
    </PageGuard>
  );
}

function ChatThread({ conversation, onBack }: { conversation: ChatConversation; onBack: () => void }) {
  const t = useTranslations("patientApp.chat");
  const qc = useQueryClient();
  const send = useSendChatMessage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const lastAt = useRef<string | undefined>(undefined);
  const inFlight = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    for (const m of incoming) {
      if (!lastAt.current || m.createdAt > lastAt.current) lastAt.current = m.createdAt;
    }
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      return fresh.length === 0
        ? prev
        : [...prev, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }, []);

  // First call fetches the whole thread; later ones pass `after` and only get
  // what's new.
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (inFlight.current || document.hidden) return;
      inFlight.current = true;
      try {
        const incoming = await patientAppApi.chat.messages(conversation.id, lastAt.current);
        if (cancelled) return;
        merge(incoming);
        if (incoming.some((m) => isFromPatient(m) && !m.readAt)) {
          patientAppApi.chat
            .markRead(conversation.id)
            .then(() => qc.invalidateQueries({ queryKey: PATIENT_APP_CHAT_KEY }))
            .catch(() => {});
        }
      } catch {
        // Transient failure — the next tick retries.
      } finally {
        inFlight.current = false;
        if (!cancelled) setLoaded(true);
      }
    };

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [conversation.id, merge, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || send.isPending) return;
    try {
      const sent = await send.mutateAsync({ conversationId: conversation.id, messageText: body });
      setText("");
      if (sent?.id) merge([sent]);
    } catch {
      // toast shown by the hook; keep the text so it can be resent
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack} aria-label={t("back")}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Button>
        <p className="font-medium">
          <PatientName id={conversation.erpPatientId} name={conversation.patientName} />
        </p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto bg-muted/20 p-4">
        {!loaded ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("noMessages")}</p>
        ) : (
          messages.map((m) => {
            const mine = !isFromPatient(m);
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                    mine ? "bg-primary text-primary-foreground" : "border bg-background",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.messageText}</p>
                  <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")} dir="ltr">
                    {fmtTime(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={t("placeholder")}
          className="max-h-32 min-h-10 resize-none"
        />
        <Button size="icon" className="h-10 w-10 shrink-0" onClick={handleSend} disabled={!text.trim() || send.isPending}>
          {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />}
        </Button>
      </div>
    </>
  );
}
