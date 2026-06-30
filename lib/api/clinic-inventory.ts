import { apiClient } from "./client";

export type ItemType = "COMPONENT" | "CONSUMABLE";
export type TransactionType = "RECEIVE" | "ISSUE" | "ADJUST" | "RETURN";

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
  type?: ItemType;
  currentStock?: number;
  categoryId?: string;
  supplierId?: string;
  minStockLevel?: number;
  unitPrice?: number;
  unit?: string;
  imageUrl?: string;
  description?: string;
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
