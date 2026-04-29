import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  mailApi,
  MailQueryParams,
  SendMailDto,
  SaveDraftDto,
  MailFolder,
} from "@/lib/api/mail";

export function useInbox(params?: MailQueryParams) {
  return useQuery({
    queryKey: ["mail", "inbox", params],
    queryFn: () => mailApi.getInbox(params),
  });
}

export function useSent(params?: MailQueryParams) {
  return useQuery({
    queryKey: ["mail", "sent", params],
    queryFn: () => mailApi.getSent(params),
  });
}

export function useDrafts(params?: MailQueryParams) {
  return useQuery({
    queryKey: ["mail", "drafts", params],
    queryFn: () => mailApi.getDrafts(params),
  });
}

export function useArchive(params?: MailQueryParams) {
  return useQuery({
    queryKey: ["mail", "archive", params],
    queryFn: () => mailApi.getArchive(params),
  });
}

export function useTrash(params?: MailQueryParams) {
  return useQuery({
    queryKey: ["mail", "trash", params],
    queryFn: () => mailApi.getTrash(params),
  });
}

export function useMailMessage(messageId: string | null) {
  return useQuery({
    queryKey: ["mail", "message", messageId],
    queryFn: () => mailApi.getById(messageId!),
    enabled: !!messageId,
  });
}

export function useSendMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: SendMailDto) => mailApi.send(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mail", "sent"] });
      qc.invalidateQueries({ queryKey: ["mail", "inbox"] });
      toast.success("تم إرسال الرسالة بنجاح");
    },
    onError: () => toast.error("فشل إرسال الرسالة"),
  });
}

export function useSaveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: SaveDraftDto) => mailApi.saveDraft(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mail", "drafts"] });
      toast.success("تم حفظ المسودة");
    },
    onError: () => toast.error("فشل حفظ المسودة"),
  });
}

export function useReplyMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, dto }: { messageId: string; dto: SendMailDto }) =>
      mailApi.reply(messageId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mail", "sent"] });
      qc.invalidateQueries({ queryKey: ["mail", "inbox"] });
      toast.success("تم إرسال الرد بنجاح");
    },
    onError: () => toast.error("فشل إرسال الرد"),
  });
}

export function useReplyAllMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, dto }: { messageId: string; dto: SendMailDto }) =>
      mailApi.replyAll(messageId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mail", "sent"] });
      qc.invalidateQueries({ queryKey: ["mail", "inbox"] });
      toast.success("تم إرسال الرد على الكل بنجاح");
    },
    onError: () => toast.error("فشل إرسال الرد"),
  });
}

export function useUpdateRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageIds, isRead }: { messageIds: string[]; isRead: boolean }) =>
      mailApi.updateRead(messageIds, isRead),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mail"] }),
  });
}

export function useUpdateStar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageIds, isStarred }: { messageIds: string[]; isStarred: boolean }) =>
      mailApi.updateStar(messageIds, isStarred),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mail"] }),
  });
}

export function useMoveMail() {
  const qc = useQueryClient();

  const removeFromCache = (messageIds: string[]) => {
    qc.setQueriesData({ queryKey: ["mail"] }, (old: any) => {
      if (!old?.items) return old;
      const idSet = new Set(messageIds);
      const filtered = old.items.filter(
        (item: any) => !idSet.has(item.id) && !idSet.has(item.messageId),
      );
      return { ...old, items: filtered, total: Math.max(0, (old.total ?? 0) - (old.items.length - filtered.length)) };
    });
  };

  return useMutation({
    mutationFn: ({ messageIds, folder }: { messageIds: string[]; folder: MailFolder }) =>
      mailApi.move(messageIds, folder),
    onSuccess: (_, { messageIds, folder }) => {
      removeFromCache(messageIds);
      // Invalidate only the target folder — do NOT refetch sent/inbox
      // because the backend SENT view is message-ownership-based and won't
      // reflect the move, causing the item to reappear after refetch.
      qc.invalidateQueries({ queryKey: ["mail", folder.toLowerCase()] });
      if (folder === "ARCHIVE") toast.success("تم أرشفة الرسالة");
      else if (folder === "TRASH") toast.success("تم نقل الرسالة إلى المحذوفات");
    },
    onError: () => toast.error("فشلت العملية"),
  });
}

export function useDeleteMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => mailApi.delete(messageId),
    onSuccess: (_, messageId) => {
      qc.setQueriesData({ queryKey: ["mail"] }, (old: any) => {
        if (!old?.items) return old;
        const filtered = old.items.filter(
          (item: any) => item.id !== messageId && item.messageId !== messageId,
        );
        return { ...old, items: filtered, total: Math.max(0, (old.total ?? 0) - (old.items.length - filtered.length)) };
      });
      // Only refresh trash — same reason as useMoveMail: sent view is
      // message-ownership-based, refetching it would bring the item back.
      qc.invalidateQueries({ queryKey: ["mail", "trash"] });
      toast.success("تم حذف الرسالة");
    },
    onError: () => toast.error("فشل حذف الرسالة"),
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, file }: { messageId: string; file: File }) =>
      mailApi.uploadAttachment(messageId, file),
    onSuccess: (_, { messageId }) => {
      qc.invalidateQueries({ queryKey: ["mail", "message", messageId] });
      toast.success("تم رفع المرفق");
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.code === "EMPTY_FILE") {
        toast.error("الملف فارغ أو لم يصل — يرجى اختيار الملف مرة ثانية");
      } else {
        toast.error("فشل رفع المرفق");
      }
    },
  });
}
