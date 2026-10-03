import { apiClient } from "./client";

// Warehouse service (`/warehouse/*`) — the new stock system, separate from the
// legacy clinic inventory in ./clinic-inventory.ts, which is still in use.
// Reference: Warehouse_API_Frontend_Guide_AR (2026-09-28).

export type WarehouseType = "MAIN" | "QUARANTINE" | "OTHER";
export type WarehouseItemType = "COMPONENT" | "CONSUMABLE" | "SERVICE";
export type CostingMethod = "HIGHEST_PRICE" | "LAST_PRICE" | "AVERAGE_PRICE";

export const WAREHOUSE_TYPES: WarehouseType[] = ["MAIN", "QUARANTINE", "OTHER"];
export const WAREHOUSE_ITEM_TYPES: WarehouseItemType[] = ["COMPONENT", "CONSUMABLE", "SERVICE"];

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: WarehouseType;
  location?: string | null;
  managerEmployeeId?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateWarehouseDto {
  code: string;
  name: string;
  type?: WarehouseType;
  location?: string;
  managerEmployeeId?: string;
}

export interface UpdateWarehouseDto extends Partial<CreateWarehouseDto> {
  isActive?: boolean;
}

export interface WarehouseUnit {
  id: string;
  name: string;
  symbol?: string | null;
}

export interface WarehouseUnitDto {
  name: string;
  symbol?: string;
}

export interface WarehouseCategory {
  id: string;
  name: string;
  nameAr?: string | null;
  parentId?: string | null;
  parent?: Pick<WarehouseCategory, "id" | "name" | "nameAr"> | null;
  isActive?: boolean;
}

export interface CreateWarehouseCategoryDto {
  name: string;
  nameAr?: string;
  parentId?: string;
}

export interface UpdateWarehouseCategoryDto extends Partial<CreateWarehouseCategoryDto> {
  isActive?: boolean;
}

export interface WarehouseSupplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
}

export interface CreateWarehouseSupplierDto {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface UpdateWarehouseSupplierDto extends Partial<CreateWarehouseSupplierDto> {
  isActive?: boolean;
}

export interface WarehouseItem {
  id: string;
  sku: string;
  // Links the item to a prosthetics part.
  partCode?: string | null;
  barcode?: string | null;
  name: string;
  nameAr?: string | null;
  itemType?: WarehouseItemType | null;
  categoryId?: string | null;
  category?: Pick<WarehouseCategory, "id" | "name" | "nameAr"> | null;
  unitId: string;
  unit?: WarehouseUnit | null;
  manufacturer?: string | null;
  minStock?: number | null;
  // Stored per item but not exposed by the create/update DTOs yet.
  costingMethod?: CostingMethod;
  isActive?: boolean;
  createdAt?: string;
}

export interface CreateWarehouseItemDto {
  sku: string;
  partCode?: string;
  barcode?: string;
  name: string;
  nameAr?: string;
  itemType?: WarehouseItemType;
  categoryId?: string;
  unitId: string;
  manufacturer?: string;
  minStock?: number;
}

export interface UpdateWarehouseItemDto extends Partial<CreateWarehouseItemDto> {
  isActive?: boolean;
}

export interface WarehouseItemListParams {
  search?: string;
  itemType?: WarehouseItemType;
  categoryId?: string;
}

export interface WarehouseCurrency {
  id: string;
  code: string;
  name: string;
  isBaseCurrency: boolean;
}

export interface CreateWarehouseCurrencyDto {
  code: string;
  name: string;
  isBaseCurrency?: boolean;
}

export interface WarehouseExchangeRate {
  id: string;
  currencyId?: string;
  // A decimal string ("13000.00000000").
  rate: number | string;
  effectiveFrom?: string;
  createdAt?: string;
}

/** An update body: any optional field may be sent as null to clear it. */
export type Clearable<T> = { [K in keyof T]: T[K] | null };

// Lists come back either as a bare array or as a paginated `{ items }` object.
export function unwrap<T>(data: unknown): T {
  return ((data as { data?: unknown })?.data ?? data) as T;
}

export function unwrapList<T>(data: unknown): T[] {
  const d = unwrap<T[] | { items?: T[] }>(data);
  return Array.isArray(d) ? d : d?.items ?? [];
}

export const warehouseApi = {
  // ── Warehouses ──
  getWarehouses: async (): Promise<Warehouse[]> => {
    const { data } = await apiClient.get("/warehouse/warehouses");
    return unwrapList(data);
  },

  getWarehouse: async (id: string): Promise<Warehouse> => {
    const { data } = await apiClient.get(`/warehouse/warehouses/${id}`);
    return unwrap(data);
  },

  createWarehouse: async (dto: CreateWarehouseDto): Promise<Warehouse> => {
    const { data } = await apiClient.post("/warehouse/warehouses", dto);
    return unwrap(data);
  },

  updateWarehouse: async (id: string, dto: Clearable<UpdateWarehouseDto>): Promise<Warehouse> => {
    const { data } = await apiClient.put(`/warehouse/warehouses/${id}`, dto);
    return unwrap(data);
  },

  // ── Units ──
  getUnits: async (): Promise<WarehouseUnit[]> => {
    const { data } = await apiClient.get("/warehouse/units");
    return unwrapList(data);
  },

  createUnit: async (dto: WarehouseUnitDto): Promise<WarehouseUnit> => {
    const { data } = await apiClient.post("/warehouse/units", dto);
    return unwrap(data);
  },

  updateUnit: async (id: string, dto: Clearable<Partial<WarehouseUnitDto>>): Promise<WarehouseUnit> => {
    const { data } = await apiClient.put(`/warehouse/units/${id}`, dto);
    return unwrap(data);
  },

  // ── Categories ──
  getCategories: async (): Promise<WarehouseCategory[]> => {
    const { data } = await apiClient.get("/warehouse/categories");
    return unwrapList(data);
  },

  createCategory: async (dto: CreateWarehouseCategoryDto): Promise<WarehouseCategory> => {
    const { data } = await apiClient.post("/warehouse/categories", dto);
    return unwrap(data);
  },

  updateCategory: async (id: string, dto: Clearable<UpdateWarehouseCategoryDto>): Promise<WarehouseCategory> => {
    const { data } = await apiClient.put(`/warehouse/categories/${id}`, dto);
    return unwrap(data);
  },

  // ── Suppliers ──
  getSuppliers: async (): Promise<WarehouseSupplier[]> => {
    const { data } = await apiClient.get("/warehouse/suppliers");
    return unwrapList(data);
  },

  createSupplier: async (dto: CreateWarehouseSupplierDto): Promise<WarehouseSupplier> => {
    const { data } = await apiClient.post("/warehouse/suppliers", dto);
    return unwrap(data);
  },

  updateSupplier: async (id: string, dto: Clearable<UpdateWarehouseSupplierDto>): Promise<WarehouseSupplier> => {
    const { data } = await apiClient.put(`/warehouse/suppliers/${id}`, dto);
    return unwrap(data);
  },

  // ── Items ──
  getItems: async (params?: WarehouseItemListParams): Promise<WarehouseItem[]> => {
    const { data } = await apiClient.get("/warehouse/items", { params });
    return unwrapList(data);
  },

  getItem: async (id: string): Promise<WarehouseItem> => {
    const { data } = await apiClient.get(`/warehouse/items/${id}`);
    return unwrap(data);
  },

  createItem: async (dto: CreateWarehouseItemDto): Promise<WarehouseItem> => {
    const { data } = await apiClient.post("/warehouse/items", dto);
    return unwrap(data);
  },

  updateItem: async (id: string, dto: Clearable<UpdateWarehouseItemDto>): Promise<WarehouseItem> => {
    const { data } = await apiClient.put(`/warehouse/items/${id}`, dto);
    return unwrap(data);
  },

  // Soft delete.
  deleteItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/warehouse/items/${id}`);
  },

  // ── Currencies ──
  getCurrencies: async (): Promise<WarehouseCurrency[]> => {
    const { data } = await apiClient.get("/warehouse/currencies");
    return unwrapList(data);
  },

  createCurrency: async (dto: CreateWarehouseCurrencyDto): Promise<WarehouseCurrency> => {
    const { data } = await apiClient.post("/warehouse/currencies", dto);
    return unwrap(data);
  },

  // Makes this the base currency; the backend clears the flag on the others.
  setBaseCurrency: async (id: string): Promise<WarehouseCurrency> => {
    const { data } = await apiClient.post(`/warehouse/currencies/${id}/set-base`);
    return unwrap(data);
  },

  getExchangeRates: async (currencyId: string): Promise<WarehouseExchangeRate[]> => {
    const { data } = await apiClient.get(`/warehouse/currencies/${currencyId}/exchange-rates`);
    return unwrapList(data);
  },

  // Rejected with BASE_CURRENCY_RATE_FIXED for the base currency (always 1).
  addExchangeRate: async (currencyId: string, rate: number): Promise<WarehouseExchangeRate> => {
    const { data } = await apiClient.post(`/warehouse/currencies/${currencyId}/exchange-rates`, { rate });
    return unwrap(data);
  },
};
