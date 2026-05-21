"use client";

import { useState } from "react";
import { Inbox, Send, FileText, Archive, Trash2, PenSquare, Users, FolderOpen, FolderPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MailList } from "@/components/features/mail/mail-list";
import { MailDetail } from "@/components/features/mail/mail-detail";
import { ComposeMailModal } from "@/components/features/mail/compose-mail-modal";
import { EmployeeDirectorySheet } from "@/components/features/mail/employee-directory-sheet";
import { useArchiveFolders, useCreateArchiveFolder, useDeleteArchiveFolder } from "@/lib/hooks/use-mail";
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
  const [archiveFolderId, setArchiveFolderId] = useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: archiveFolders = [] } = useArchiveFolders();
  const createFolder = useCreateArchiveFolder();
  const deleteFolder = useDeleteArchiveFolder();
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder.mutateAsync(newFolderName.trim());
    setNewFolderName("");
    setNewFolderOpen(false);
  };

  const handleDeleteFolder = async (id: string) => {
    if (archiveFolderId === id) setArchiveFolderId(undefined);
    await deleteFolder.mutateAsync(id);
  };

  const handleFolderChange = (folder: MailFolder) => {
    setActiveFolder(folder);
    setOpenMessageId(null);
    setSearch("");
    setPage(1);
    setArchiveFolderId(undefined);
    setDateFrom("");
    setDateTo("");
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

      {/* Archive sub-folder navigation */}
      {activeFolder === "ARCHIVE" && !openMessageId && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-muted/10 overflow-x-auto">
          <button
            onClick={() => { setArchiveFolderId(undefined); setPage(1); }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 h-7 rounded text-xs font-medium transition-colors whitespace-nowrap",
              !archiveFolderId
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            الكل
          </button>
          {archiveFolders.map((af) => (
            <div
              key={af.id}
              className={cn(
                "group flex items-center gap-1 px-2 h-7 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
                archiveFolderId === af.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => { setArchiveFolderId(af.id); setPage(1); }}
            >
              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
              {af.name}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(af.id); }}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setNewFolderOpen(true)}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap border border-dashed"
          >
            <FolderPlus className="h-3.5 w-3.5 shrink-0" />
            مجلد جديد
          </button>
        </div>
      )}

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
            archiveFolderId={archiveFolderId}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={(v) => { setDateFrom(v); setPage(1); }}
            onDateToChange={(v) => { setDateTo(v); setPage(1); }}
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

      {/* Create archive folder dialog */}
      <Dialog open={newFolderOpen} onOpenChange={(v) => { if (!v) { setNewFolderOpen(false); setNewFolderName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              مجلد أرشيف جديد
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="اسم المجلد..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setNewFolderOpen(false); setNewFolderName(""); }}>
              إلغاء
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolder.isPending}>
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
