import { apiClient } from "./client";

export type ItemType = "COMPONENT" | "CONSUMABLE";
export type TransactionType = "RECEIVE" | "ISSUE" | "ADJUST" | "RETURN";
export type ItemRequestStatus = "PENDING" | "APPROVED" | "DONE" | "NOT_AVAILABLE";

export interface InventoryCategory {
  id: string;
  name: string;
  description?: string | null;
}

export interface InventorySupplier {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  nameAr?: string | null;
  companyName?: string | null;
  type: ItemType | null;
  categoryId?: string | null;
  category?: InventoryCategory | null;
  supplierId?: string | null;
  supplier?: InventorySupplier | null;
  currentStock: number;
  minStockLevel: number | null;
  unitPrice?: number | null;
  unit?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  isActive?: boolean;
  isLowStock?: boolean;
  // Part-request workflow — set when the item was created as a technician request
  status?: ItemRequestStatus | null;
  notes?: string | null;
  requestedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

function normalizeItem(raw: any): InventoryItem {
  return {
    ...raw,
    code: raw.code ?? raw.partCode ?? "",
    unitPrice: raw.unitPrice ?? raw.unitCostUsd ?? null,
    isLowStock:
      raw.isLowStock ??
      (raw.minStockLevel != null ? raw.currentStock <= raw.minStockLevel : false),
  };
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  item?: Pick<InventoryItem, "id" | "code" | "name">;
  type: TransactionType;
  quantity: number;
  notes?: string | null;
  caseId?: string | null;
  performedByName?: string | null;
  createdAt: string;
}

export interface CreateItemDto {
  code: string;
  name: string;
  companyName?: string;
  type?: ItemType;
  currentStock?: number;
  categoryId?: string;
  supplierId?: string;
  minStockLevel?: number;
  unitPrice?: number;
  unit?: string;
  imageUrl?: string;
  description?: string;
  status?: ItemRequestStatus;
  notes?: string;
  // Marks the item as a technician-submitted part request (status starts
  // PENDING, no stock impact until an admin approves it). Omit entirely for
  // a normal admin-added catalog item (status stays null).
  isRequest?: boolean;
}

export interface ImportExcelResult {
  created: number;
  skipped: number;
  errors: string[];
}

export interface InventoryListParams {
  type?: ItemType;
  categoryId?: string;
  supplierId?: string;
  search?: string;
  lowStock?: boolean;
}

export const clinicInventoryApi = {
  getCategories: async (): Promise<InventoryCategory[]> => {
    const { data } = await apiClient.get("/inventory/categories");
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  createCategory: async (dto: { name: string; description?: string }): Promise<InventoryCategory> => {
    const { data } = await apiClient.post("/inventory/categories", dto);
    return data?.data ?? data;
  },

  getSuppliers: async (): Promise<InventorySupplier[]> => {
    const { data } = await apiClient.get("/inventory/suppliers");
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  createSupplier: async (dto: Omit<InventorySupplier, "id">): Promise<InventorySupplier> => {
    const { data } = await apiClient.post("/inventory/suppliers", dto);
    return data?.data ?? data;
  },

  listItems: async (params?: InventoryListParams): Promise<InventoryItem[]> => {
    const { data } = await apiClient.get("/inventory/items", { params });
    const d = data?.data ?? data;
    const items: any[] = Array.isArray(d) ? d : d?.items ?? [];
    return items.map(normalizeItem);
  },

  createItem: async (dto: CreateItemDto): Promise<InventoryItem> => {
    const { code, unitPrice, ...rest } = dto;
    const { data } = await apiClient.post("/inventory/items", {
      ...rest,
      partCode: code,
      ...(unitPrice != null ? { unitCostUsd: unitPrice } : {}),
    });
    return normalizeItem(data?.data ?? data);
  },

  updateItem: async (id: string, dto: Partial<CreateItemDto>): Promise<InventoryItem> => {
    const { code, unitPrice, ...rest } = dto;
    const { data } = await apiClient.put(`/inventory/items/${id}`, {
      ...rest,
      ...(code != null ? { partCode: code } : {}),
      ...(unitPrice != null ? { unitCostUsd: unitPrice } : {}),
    });
    return normalizeItem(data?.data ?? data);
  },

  getItemById: async (id: string): Promise<InventoryItem> => {
    const { data } = await apiClient.get(`/inventory/items/${id}`);
    return normalizeItem(data?.data ?? data);
  },

  getItemByCode: async (code: string): Promise<InventoryItem> => {
    const { data } = await apiClient.get(`/inventory/items/by-code/${code}`);
    return normalizeItem(data?.data ?? data);
  },

  // Soft delete — sets isActive: false, item stops appearing in listItems()
  deleteItem: async (id: string): Promise<{ deleted: boolean }> => {
    const { data } = await apiClient.delete(`/inventory/items/${id}`);
    return data?.data ?? data;
  },

  importExcel: async (file: File): Promise<ImportExcelResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post("/inventory/items/import-excel", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.data ?? data;
  },

  addTransaction: async (id: string, dto: { type: TransactionType; quantity: number; notes?: string; caseId?: string }): Promise<InventoryTransaction> => {
    const { data } = await apiClient.post(`/inventory/items/${id}/transactions`, dto);
    return data?.data ?? data;
  },

  getItemHistory: async (id: string): Promise<InventoryTransaction[]> => {
    const { data } = await apiClient.get(`/inventory/items/${id}/history`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  getAllTransactions: async (params?: { from?: string; to?: string }): Promise<InventoryTransaction[]> => {
    const { data } = await apiClient.get("/inventory/transactions", { params });
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  getLowStockAlerts: async (): Promise<InventoryItem[]> => {
    const { data } = await apiClient.get("/inventory/low-stock-alerts");
    const d = data?.data ?? data;
    const items: any[] = Array.isArray(d) ? d : d?.items ?? [];
    return items.map(normalizeItem);
  },
};
