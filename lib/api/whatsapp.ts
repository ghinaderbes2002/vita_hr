import { apiClient } from "./client";

// WhatsApp link for notifications: every in-app notification also goes out on
// WhatsApp to an employee with a phone number. The sending is all server-side;
// this is only the company number's link (QR pairing). whatsapp.manage.

export interface WhatsappStatus {
  connected: boolean;
  /** A QR code is waiting to be scanned. */
  hasQrPending: boolean;
}

export const whatsappApi = {
  status: async (): Promise<WhatsappStatus> => {
    const { data } = await apiClient.get("/whatsapp/status");
    const d = data?.data ?? data;
    return { connected: !!d?.connected, hasQrPending: !!d?.hasQrPending };
  },

  /** A data URL ready for <img src>; null when already linked or not started yet. */
  qr: async (): Promise<string | null> => {
    const { data } = await apiClient.get("/whatsapp/qr");
    const d = data?.data ?? data;
    return d?.qrDataUrl ?? null;
  },

  /** Unlinks the current number; a fresh QR follows. */
  logout: async (): Promise<void> => {
    await apiClient.post("/whatsapp/logout");
  },
};
