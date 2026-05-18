"use client";

import { useState } from "react";
import { Inbox, Send, FileText, Archive, Trash2, PenSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MailList } from "@/components/features/mail/mail-list";
import { MailDetail } from "@/components/features/mail/mail-detail";
import { ComposeMailModal } from "@/components/features/mail/compose-mail-modal";
import { EmployeeDirectorySheet } from "@/components/features/mail/employee-directory-sheet";
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
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const handleFolderChange = (folder: MailFolder) => {
    setActiveFolder(folder);
    setOpenMessageId(null);
    setSearch("");
    setPage(1);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] overflow-hidden rounded-lg border bg-background shadow-sm">
      {/* Folder app bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/20">
        <nav className="flex-1 flex items-center gap-1 overflow-x-auto">
          {FOLDERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleFolderChange(key)}
              className={cn(
                "flex items-center gap-2 px-3 h-9 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                activeFolder === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <Button
          variant="outline"
          className="gap-2 shrink-0"
          size="sm"
          onClick={() => setDirectoryOpen(true)}
        >
          <Users className="h-4 w-4" />
          دليل الموظفين
        </Button>
        <Button
          className="gap-2 shrink-0"
          size="sm"
          onClick={() => setComposeOpen(true)}
        >
          <PenSquare className="h-4 w-4" />
          رسالة جديدة
        </Button>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
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

      <EmployeeDirectorySheet
        open={directoryOpen}
        onOpenChange={setDirectoryOpen}
      />
    </div>
  );
}
