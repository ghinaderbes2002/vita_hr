import { apiClient } from "./client";

export const DOCUMENT_TYPES = [
  "PHOTO", "CONTRACT", "NATIONAL_ID", "PASSPORT", "RESIDENCE",
  "CERTIFICATE", "MEDICAL", "BANK_ACCOUNT", "OTHER",
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number];

export interface EmployeeDocument {
  id: string;
  fileUrl: string;
  fileName: string;
  type: DocumentType;
  titleAr: string;
  employeeId: string;
  createdAt: string;
}

export const documentsApi = {
  upload: async (params: {
    file: File;
    employeeId: string;
    type: DocumentType | string;
    titleAr: string;
  }): Promise<{ fileUrl: string; fileName: string }> => {
    const fd = new FormData();
    fd.append("file", params.file);
    fd.append("employeeId", params.employeeId);
    fd.append("type", params.type);
    fd.append("titleAr", params.titleAr);
    const res = await apiClient.post("/documents/upload", fd, {
      headers: { "Content-Type": undefined },
    });
    const data = res.data?.data || res.data;
    return { fileUrl: data.fileUrl, fileName: params.file.name };
  },

  list: async (employeeId: string): Promise<EmployeeDocument[]> => {
    const res = await apiClient.get("/documents", { params: { employeeId } });
    return res.data?.data || res.data || [];
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },
};
