"use client";

import { useState } from "react";
import { Inbox, Send, FileText, Archive, Trash2, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MailList } from "@/components/features/mail/mail-list";
import { MailDetail } from "@/components/features/mail/mail-detail";
import { ComposeMailModal } from "@/components/features/mail/compose-mail-modal";
import type { MailFolder } from "@/lib/api/mail";

const FOLDERS: { key: MailFolder; label: string; icon: any }[] = [
  { key: "INBOX",   label: "صندوق الوارد", icon: Inbox    },
  { key: "SENT",    label: "المرسل",        icon: Send     },
  { key: "DRAFTS",  label: "المسودات",      icon: FileText },
  { key: "ARCHIVE", label: "الأرشيف",       icon: Archive  },
  { key: "TRASH",   label: "المحذوفات",     icon: Trash2   },
];

export default function MailPage() {
  const [activeFolder, setActiveFolder] = useState<MailFolder>("INBOX");
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const handleFolderChange = (folder: MailFolder) => {
    setActiveFolder(folder);
    setOpenMessageId(null);
    setSearch("");
    setPage(1);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg border bg-background shadow-sm">
      {/* Folder sidebar */}
      <aside className="w-48 shrink-0 border-l flex flex-col bg-muted/20">
        <div className="p-3 border-b">
          <Button
            className="w-full gap-2"
            size="sm"
            onClick={() => setComposeOpen(true)}
          >
            <PenSquare className="h-4 w-4" />
            رسالة جديدة
          </Button>
        </div>

        <nav className="flex-1 py-2 space-y-0.5 px-2">
          {FOLDERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleFolderChange(key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-right",
                activeFolder === key
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Folder title bar */}
        <div className="px-4 py-3 border-b flex items-center gap-2">
          {(() => {
            const f = FOLDERS.find((f) => f.key === activeFolder)!;
            const Icon = f.icon;
            return (
              <>
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h1 className="text-sm font-semibold">{f.label}</h1>
              </>
            );
          })()}
        </div>

        {openMessageId ? (
          <MailDetail
            messageId={openMessageId}
            onBack={() => setOpenMessageId(null)}
          />
        ) : (
          <MailList
            folder={activeFolder}
            onOpenMessage={setOpenMessageId}
            search={search}
            onSearchChange={setSearch}
            page={page}
            onPageChange={setPage}
          />
        )}
      </main>

      <ComposeMailModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
      />
    </div>
  );
}
