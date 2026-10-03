import { apiClient } from "./client";
import { unwrap, unwrapList, WarehouseItem, Warehouse, WarehouseSupplier, WarehouseCurrency } from "./warehouse";

// Warehouse service — the operational side: stock, documents and reports.
// Master data (warehouses, items, suppliers, currencies) lives in ./warehouse.ts.
// Reference: Warehouse_API_Frontend_Guide_AR (2026-09-28) §4–§13.

export type MovementType =
  | "STOCK_IN" | "STOCK_OUT" | "RESERVE" | "ISSUE" | "PURCHASE"
  | "TRANSFER_OUT" | "TRANSFER_IN" | "RETURN_OUT" | "RETURN_IN";
export type MaterialRequestStatus =
  | "SUBMITTED" | "APPROVED" | "PARTIALLY_APPROVED" | "REJECTED"
  | "PARTIALLY_ISSUED" | "ISSUED" | "CANCELLED";
export type PurchaseInvoiceStatus = "DRAFT" | "APPROVED" | "POSTED" | "REJECTED" | "CANCELLED";
export type DiscountType = "PERCENT" | "FIXED";
export type StockTransferStatus = "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
export type ReturnType = "PURCHASE_RETURN" | "SALES_RETURN" | "ISSUE_RETURN" | "PRODUCTION_RETURN";
export type ReturnCondition = "GOOD" | "DAMAGED" | "INSPECT";
export type InventoryCountStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type QuotationStatus =
  | "DRAFT" | "APPROVED" | "SENT" | "ACCEPTED" | "REJECTED" | "SUPERSEDED" | "CANCELLED";
export type QuotationLineType = "ITEM" | "SERVICE" | "SESSION" | "CUSTOM";
export type SalesInvoiceStatus = "DRAFT" | "APPROVED" | "CANCELLED";

export const MATERIAL_REQUEST_STATUSES: MaterialRequestStatus[] = [
  "SUBMITTED", "APPROVED", "PARTIALLY_APPROVED", "REJECTED", "PARTIALLY_ISSUED", "ISSUED", "CANCELLED",
];
export const PURCHASE_INVOICE_STATUSES: PurchaseInvoiceStatus[] = ["DRAFT", "APPROVED", "POSTED", "REJECTED", "CANCELLED"];
export const TRANSFER_STATUSES: StockTransferStatus[] = ["IN_TRANSIT", "COMPLETED", "CANCELLED"];
export const RETURN_TYPES: ReturnType[] = ["PURCHASE_RETURN", "SALES_RETURN", "ISSUE_RETURN", "PRODUCTION_RETURN"];
export const RETURN_CONDITIONS: ReturnCondition[] = ["GOOD", "DAMAGED", "INSPECT"];
export const COUNT_STATUSES: InventoryCountStatus[] = ["IN_PROGRESS", "COMPLETED", "CANCELLED"];
export const QUOTATION_STATUSES: QuotationStatus[] = [
  "DRAFT", "APPROVED", "SENT", "ACCEPTED", "REJECTED", "SUPERSEDED", "CANCELLED",
];
export const QUOTATION_LINE_TYPES: QuotationLineType[] = ["ITEM", "SERVICE", "SESSION", "CUSTOM"];
export const SALES_INVOICE_STATUSES: SalesInvoiceStatus[] = ["DRAFT", "APPROVED", "CANCELLED"];
export const DISCOUNT_TYPES: DiscountType[] = ["PERCENT", "FIXED"];

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PageParams {
  page?: number;
  limit?: number;
}

type ItemRef = Pick<WarehouseItem, "id" | "name"> & Partial<WarehouseItem>;
type WarehouseRef = Pick<Warehouse, "id" | "name"> & Partial<Warehouse>;

// Read models follow the backend's answers of 2026-10: details embed their
// related records in full, every document's number is `documentNo`, and —
// the one that bites — quantities and prices come back as decimal *strings*
// ("12.500"), not numbers. Only the reports return real numbers. Always go
// through Number() before doing arithmetic on a Dec.
export type Dec = number | string;

// ── Stock ──
export interface StockBalance {
  id?: string;
  warehouseId: string;
  itemId: string;
  onHandQty: Dec;
  reservedQty: Dec;
  // onHandQty - reservedQty; the one field here that is a real number.
  availableQty: number;
  // Not part of a balance row: only low-stock rows carry it (the warehouse's
  // own minimum if set, else the item's general one).
  minStock?: Dec | null;
  avgUnitCost?: Dec | null;
  lastUnitCost?: Dec | null;
  highestUnitCost?: Dec | null;
  warehouse?: WarehouseRef | null;
  item?: ItemRef | null;
}

// Low-stock rows are flat: the item's names sit on the row itself and there
// is no warehouse object.
interface LowStockRow {
  warehouseId: string;
  itemId: string;
  onHandQty: Dec;
  reservedQty: Dec;
  name: string;
  nameAr?: string | null;
  sku?: string;
  effectiveMinStock: Dec;
}

export interface StockMovement {
  id: string;
  warehouseId: string;
  itemId: string;
  movementType: MovementType;
  // Signed change to the on-hand balance: positive in, negative out.
  onHandDelta: Dec;
  // Signed change to the reserved quantity (what a RESERVE movement moves).
  reservedDelta: Dec;
  balanceAfter: Dec;
  documentType?: string | null;
  documentId?: string | null;
  notes?: string | null;
  createdAt: string;
  warehouse?: WarehouseRef | null;
  item?: ItemRef | null;
}

export interface AdjustStockDto {
  warehouseId: string;
  itemId: string;
  direction: "IN" | "OUT";
  quantity: number;
  notes?: string;
}

export interface SetMinStockDto {
  warehouseId: string;
  itemId: string;
  minStock: number;
}

// ── Material requests ──
export interface MaterialRequestLine {
  id?: string;
  itemId: string;
  requestedQty: Dec;
  approvedQty?: Dec | null;
  issuedQty?: Dec | null;
  item?: ItemRef | null;
}

export interface MaterialRequest {
  id: string;
  documentNo?: string | null;
  warehouseId: string;
  warehouse?: WarehouseRef | null;
  status: MaterialRequestStatus;
  referenceType?: string | null;
  referenceId?: string | null;
  departmentId?: string | null;
  notes?: string | null;
  rejectionReason?: string | null;
  items: MaterialRequestLine[];
  createdAt: string;
}

export interface CreateMaterialRequestDto {
  warehouseId: string;
  referenceType?: string;
  referenceId?: string;
  departmentId?: string;
  notes?: string;
  items: { itemId: string; requestedQty: number }[];
}

// ── Purchase invoices ──
// The price fields are stripped by the backend for users without
// warehouse.purchase_prices.view — treat every one of them as possibly absent.
export interface PurchaseInvoiceLine {
  id?: string;
  itemId: string;
  qty: Dec;
  unitPrice?: Dec;
  lineTotal?: Dec;
  item?: ItemRef | null;
}

export interface PurchaseInvoice {
  id: string;
  documentNo?: string | null;
  supplierId: string;
  supplier?: Pick<WarehouseSupplier, "id" | "name"> | null;
  warehouseId: string;
  warehouse?: WarehouseRef | null;
  currencyId: string;
  currency?: Pick<WarehouseCurrency, "id" | "code" | "name"> | null;
  invoiceDate?: string | null;
  status: PurchaseInvoiceStatus;
  discountType?: DiscountType | null;
  discountValue?: Dec | null;
  subtotal?: Dec;
  total?: Dec;
  exchangeRate?: Dec;
  notes?: string | null;
  rejectionReason?: string | null;
  items: PurchaseInvoiceLine[];
  createdAt: string;
}

export interface CreatePurchaseInvoiceDto {
  supplierId: string;
  warehouseId: string;
  currencyId: string;
  invoiceDate?: string;
  discountType?: DiscountType;
  discountValue?: number;
  notes?: string;
  items: { itemId: string; qty: number; unitPrice: number }[];
}

// ── Transfers ──
export interface TransferLine {
  id?: string;
  itemId: string;
  requestedQty: Dec;
  sentQty?: Dec | null;
  receivedQty?: Dec | null;
  item?: ItemRef | null;
}

export interface StockTransfer {
  id: string;
  documentNo?: string | null;
  fromWarehouseId: string;
  fromWarehouse?: WarehouseRef | null;
  toWarehouseId: string;
  toWarehouse?: WarehouseRef | null;
  status: StockTransferStatus;
  notes?: string | null;
  items: TransferLine[];
  createdAt: string;
}

export interface CreateTransferDto {
  fromWarehouseId: string;
  toWarehouseId: string;
  notes?: string;
  items: { itemId: string; qty: number }[];
}

// ── Returns ──
export interface ReturnLine {
  id?: string;
  itemId: string;
  qty: Dec;
  condition?: ReturnCondition | null;
  unitPrice?: Dec | null;
  note?: string | null;
  item?: ItemRef | null;
  // Where the line actually landed (the quarantine warehouse for damaged ones).
  postedWarehouse?: WarehouseRef | null;
}

export interface StockReturn {
  id: string;
  documentNo?: string | null;
  returnType: ReturnType;
  warehouseId: string;
  warehouse?: WarehouseRef | null;
  purchaseInvoiceId?: string | null;
  purchaseInvoice?: Pick<PurchaseInvoice, "id" | "documentNo"> | null;
  damagedWarehouseId?: string | null;
  notes?: string | null;
  items: ReturnLine[];
  createdAt: string;
}

export interface CreateReturnDto {
  returnType: ReturnType;
  warehouseId: string;
  // Required in practice for PURCHASE_RETURN.
  purchaseInvoiceId?: string;
  sourceReferenceType?: string;
  sourceReferenceId?: string;
  departmentId?: string;
  // Omitted → the backend picks the first active QUARANTINE warehouse.
  damagedWarehouseId?: string;
  notes?: string;
  items: { itemId: string; qty: number; condition?: ReturnCondition; unitPrice?: number; note?: string }[];
}

// ── Inventory counts ──
export interface InventoryCountLine {
  id?: string;
  itemId: string;
  // Snapshot of the balance when the session started.
  systemQty?: Dec | null;
  // Both empty until the line is recorded.
  actualQty?: Dec | null;
  differenceQty?: Dec | null;
  note?: string | null;
  item?: ItemRef | null;
}

export interface InventoryCount {
  id: string;
  documentNo?: string | null;
  warehouseId: string;
  warehouse?: WarehouseRef | null;
  status: InventoryCountStatus;
  notes?: string | null;
  items?: InventoryCountLine[];
  createdAt: string;
  completedAt?: string | null;
}

// ── Quotations ──
export interface QuotationItemInput {
  lineType?: QuotationLineType;
  // Required only when lineType is ITEM.
  itemId?: string;
  description: string;
  qty: number;
  unitPrice: number;
  discountType?: DiscountType;
  discountValue?: number;
}

// Price fields are stripped for users without warehouse.quotations.view_prices
// (the technician copy), on quotations and sales invoices alike.
export interface QuotationLine {
  id?: string;
  lineType?: QuotationLineType;
  itemId?: string | null;
  description: string;
  qty: Dec;
  unitPrice?: Dec;
  discountType?: DiscountType | null;
  discountValue?: Dec | null;
  lineTotal?: Dec;
  item?: ItemRef | null;
}

export interface Quotation {
  id: string;
  documentNo?: string | null;
  version?: number;
  childVersions?: { id: string; version: number; status: QuotationStatus }[];
  patientId: string;
  currencyId: string;
  currency?: Pick<WarehouseCurrency, "id" | "code" | "name"> | null;
  status: QuotationStatus;
  validUntil?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  discountType?: DiscountType | null;
  discountValue?: Dec | null;
  subtotal?: Dec;
  total?: Dec;
  exchangeRate?: Dec;
  rejectionReason?: string | null;
  acceptedByName?: string | null;
  items: QuotationLine[];
  createdAt: string;
}

export interface CreateQuotationDto {
  patientId: string;
  currencyId: string;
  validUntil?: string;
  paymentTerms?: string;
  notes?: string;
  discountType?: DiscountType;
  discountValue?: number;
  items: QuotationItemInput[];
}

// A line is identified by `quotationItemId` (the quotation line's own id —
// required; `id`/`itemId` are stripped and the request fails with 400).
// Lines left out keep their prices.
export interface AdjustQuotationPricesDto {
  discountType?: DiscountType;
  discountValue?: number;
  items: { quotationItemId: string; unitPrice: number; discountType?: DiscountType; discountValue?: number }[];
}

// ── Sales invoices ──
export interface SalesInvoice {
  id: string;
  documentNo?: string | null;
  quotationId: string;
  quotation?: Pick<Quotation, "id" | "documentNo"> | null;
  patientId: string;
  currencyId?: string;
  currency?: Pick<WarehouseCurrency, "id" | "code" | "name"> | null;
  status: SalesInvoiceStatus;
  paymentMethod?: string | null;
  paymentTerms?: string | null;
  discountType?: DiscountType | null;
  discountValue?: Dec | null;
  subtotal?: Dec;
  total?: Dec;
  exchangeRate?: Dec;
  items: QuotationLine[];
  createdAt: string;
}

// ── Reports ──
export type WarehouseReportKey =
  | "stock-valuation" | "low-stock" | "stock-movements" | "purchases-summary"
  | "sales-summary" | "material-requests-summary" | "returns-summary" | "inventory-variance";

export interface WarehouseReportParams {
  warehouseId?: string;
  itemId?: string;
  dateFrom?: string;
  dateTo?: string;
}

function unwrapPage<T>(data: unknown): Paginated<T> {
  const d = unwrap<T[] | Partial<Paginated<T>>>(data);
  if (Array.isArray(d)) {
    return { items: d, page: 1, limit: d.length, total: d.length, totalPages: 1 };
  }
  const items = d?.items ?? [];
  return {
    items,
    page: d?.page ?? 1,
    limit: d?.limit ?? items.length,
    total: d?.total ?? items.length,
    totalPages: d?.totalPages ?? 1,
  };
}

const base = "/warehouse";

export const warehouseOpsApi = {
  // ── Stock ──
  getBalances: async (params?: { warehouseId?: string; itemId?: string }): Promise<StockBalance[]> => {
    const { data } = await apiClient.get(`${base}/stock/balances`, { params });
    return unwrapList(data);
  },

  getMovements: async (
    params?: PageParams & { warehouseId?: string; itemId?: string },
  ): Promise<Paginated<StockMovement>> => {
    const { data } = await apiClient.get(`${base}/stock/movements`, { params });
    return unwrapPage(data);
  },

  // Reshaped into balance rows so both stock tables render the same way.
  getLowStock: async (params?: { warehouseId?: string }): Promise<StockBalance[]> => {
    const { data } = await apiClient.get(`${base}/stock/low-stock`, { params });
    return unwrapList<LowStockRow>(data).map((r) => ({
      warehouseId: r.warehouseId,
      itemId: r.itemId,
      onHandQty: r.onHandQty,
      reservedQty: r.reservedQty,
      availableQty: Number(r.onHandQty) - Number(r.reservedQty),
      minStock: r.effectiveMinStock,
      item: { id: r.itemId, name: r.name, nameAr: r.nameAr, sku: r.sku },
    }));
  },

  // Rejected with INSUFFICIENT_STOCK when taking out more than is available.
  adjustStock: async (dto: AdjustStockDto): Promise<unknown> => {
    const { data } = await apiClient.post(`${base}/stock/adjust`, dto);
    return unwrap(data);
  },

  // Per item *per warehouse* — overrides the item's own general minStock.
  setMinStock: async (dto: SetMinStockDto): Promise<unknown> => {
    const { data } = await apiClient.post(`${base}/stock/min-stock`, dto);
    return unwrap(data);
  },

  // ── Material requests ──
  getMaterialRequests: async (
    params?: PageParams & { status?: MaterialRequestStatus; warehouseId?: string },
  ): Promise<Paginated<MaterialRequest>> => {
    const { data } = await apiClient.get(`${base}/material-requests`, { params });
    return unwrapPage(data);
  },

  // Not paginated and takes no filters: the caller's whole list, newest first.
  getMyMaterialRequests: async (): Promise<Paginated<MaterialRequest>> => {
    const { data } = await apiClient.get(`${base}/material-requests/my`);
    return unwrapPage(data);
  },

  getMaterialRequest: async (id: string): Promise<MaterialRequest> => {
    const { data } = await apiClient.get(`${base}/material-requests/${id}`);
    return unwrap(data);
  },

  createMaterialRequest: async (dto: CreateMaterialRequestDto): Promise<MaterialRequest> => {
    const { data } = await apiClient.post(`${base}/material-requests`, dto);
    return unwrap(data);
  },

  // Without `items` the backend approves the full requested quantity, capped
  // by what is actually available (which may yield PARTIALLY_APPROVED).
  approveMaterialRequest: async (
    id: string,
    items?: { itemId: string; approvedQty: number }[],
  ): Promise<MaterialRequest> => {
    const { data } = await apiClient.post(`${base}/material-requests/${id}/approve`, items ? { items } : {});
    return unwrap(data);
  },

  rejectMaterialRequest: async (id: string, reason?: string): Promise<MaterialRequest> => {
    const { data } = await apiClient.post(`${base}/material-requests/${id}/reject`, reason ? { reason } : {});
    return unwrap(data);
  },

  // Without `items` everything approved is issued.
  issueMaterialRequest: async (
    id: string,
    items?: { itemId: string; issuedQty: number }[],
  ): Promise<MaterialRequest> => {
    const { data } = await apiClient.post(`${base}/material-requests/${id}/issue`, items ? { items } : {});
    return unwrap(data);
  },

  // ── Purchase invoices ──
  getPurchaseInvoices: async (
    params?: PageParams & { status?: PurchaseInvoiceStatus; supplierId?: string; warehouseId?: string },
  ): Promise<Paginated<PurchaseInvoice>> => {
    const { data } = await apiClient.get(`${base}/purchase-invoices`, { params });
    return unwrapPage(data);
  },

  getPurchaseInvoice: async (id: string): Promise<PurchaseInvoice> => {
    const { data } = await apiClient.get(`${base}/purchase-invoices/${id}`);
    return unwrap(data);
  },

  createPurchaseInvoice: async (dto: CreatePurchaseInvoiceDto): Promise<PurchaseInvoice> => {
    const { data } = await apiClient.post(`${base}/purchase-invoices`, dto);
    return unwrap(data);
  },

  // Financial approval only — stock is untouched until the invoice is posted.
  approvePurchaseInvoice: async (id: string): Promise<PurchaseInvoice> => {
    const { data } = await apiClient.post(`${base}/purchase-invoices/${id}/approve`);
    return unwrap(data);
  },

  rejectPurchaseInvoice: async (id: string, reason?: string): Promise<PurchaseInvoice> => {
    const { data } = await apiClient.post(`${base}/purchase-invoices/${id}/reject`, reason ? { reason } : {});
    return unwrap(data);
  },

  // Adds the quantities to stock and updates the unit cost.
  postPurchaseInvoice: async (id: string): Promise<PurchaseInvoice> => {
    const { data } = await apiClient.post(`${base}/purchase-invoices/${id}/post`);
    return unwrap(data);
  },

  // ── Transfers ──
  getTransfers: async (
    params?: PageParams & { status?: StockTransferStatus; warehouseId?: string },
  ): Promise<Paginated<StockTransfer>> => {
    const { data } = await apiClient.get(`${base}/transfers`, { params });
    return unwrapPage(data);
  },

  getTransfer: async (id: string): Promise<StockTransfer> => {
    const { data } = await apiClient.get(`${base}/transfers/${id}`);
    return unwrap(data);
  },

  // Comes back COMPLETED straight away when one keeper runs both warehouses.
  createTransfer: async (dto: CreateTransferDto): Promise<StockTransfer> => {
    const { data } = await apiClient.post(`${base}/transfers`, dto);
    return unwrap(data);
  },

  // Without `items` each line is received in full.
  receiveTransfer: async (
    id: string,
    items?: { itemId: string; receivedQty: number }[],
  ): Promise<StockTransfer> => {
    const { data } = await apiClient.post(`${base}/transfers/${id}/receive`, items ? { items } : {});
    return unwrap(data);
  },

  // ── Returns ──
  getReturns: async (
    params?: PageParams & { returnType?: ReturnType; warehouseId?: string },
  ): Promise<Paginated<StockReturn>> => {
    const { data } = await apiClient.get(`${base}/returns`, { params });
    return unwrapPage(data);
  },

  getReturn: async (id: string): Promise<StockReturn> => {
    const { data } = await apiClient.get(`${base}/returns/${id}`);
    return unwrap(data);
  },

  createReturn: async (dto: CreateReturnDto): Promise<StockReturn> => {
    const { data } = await apiClient.post(`${base}/returns`, dto);
    return unwrap(data);
  },

  // ── Inventory counts ──
  // While a count is IN_PROGRESS its warehouse is frozen: the backend rejects
  // every operation that would change that warehouse's balance.
  getInventoryCounts: async (
    params?: { warehouseId?: string; status?: InventoryCountStatus },
  ): Promise<InventoryCount[]> => {
    const { data } = await apiClient.get(`${base}/inventory-counts`, { params });
    return unwrapList(data);
  },

  getInventoryCount: async (id: string): Promise<InventoryCount> => {
    const { data } = await apiClient.get(`${base}/inventory-counts/${id}`);
    return unwrap(data);
  },

  startInventoryCount: async (dto: { warehouseId: string; notes?: string }): Promise<InventoryCount> => {
    const { data } = await apiClient.post(`${base}/inventory-counts`, dto);
    return unwrap(data);
  },

  recordInventoryCount: async (
    id: string,
    items: { itemId: string; actualQty: number; note?: string }[],
  ): Promise<InventoryCount> => {
    const { data } = await apiClient.post(`${base}/inventory-counts/${id}/record`, { items });
    return unwrap(data);
  },

  // Applies the variances to the balances.
  completeInventoryCount: async (id: string): Promise<InventoryCount> => {
    const { data } = await apiClient.post(`${base}/inventory-counts/${id}/complete`);
    return unwrap(data);
  },

  cancelInventoryCount: async (id: string): Promise<InventoryCount> => {
    const { data } = await apiClient.post(`${base}/inventory-counts/${id}/cancel`);
    return unwrap(data);
  },

  // ── Quotations ──
  getQuotations: async (
    params?: PageParams & { status?: QuotationStatus; patientId?: string },
  ): Promise<Paginated<Quotation>> => {
    const { data } = await apiClient.get(`${base}/quotations`, { params });
    return unwrapPage(data);
  },

  getQuotation: async (id: string): Promise<Quotation> => {
    const { data } = await apiClient.get(`${base}/quotations/${id}`);
    return unwrap(data);
  },

  createQuotation: async (dto: CreateQuotationDto): Promise<Quotation> => {
    const { data } = await apiClient.post(`${base}/quotations`, dto);
    return unwrap(data);
  },

  // Direct edit — allowed only while DRAFT. `items`, when sent, replaces every
  // line. The patient and the currency are fixed at creation: the backend
  // silently drops them here.
  updateQuotation: async (
    id: string,
    dto: Partial<Omit<CreateQuotationDto, "patientId" | "currencyId">>,
  ): Promise<Quotation> => {
    const { data } = await apiClient.patch(`${base}/quotations/${id}`, dto);
    return unwrap(data);
  },

  approveQuotation: async (id: string): Promise<Quotation> => {
    const { data } = await apiClient.post(`${base}/quotations/${id}/approve`);
    return unwrap(data);
  },

  // Prices/discount without a new version — DRAFT or APPROVED only.
  adjustQuotationPrices: async (id: string, dto: AdjustQuotationPricesDto): Promise<Quotation> => {
    const { data } = await apiClient.post(`${base}/quotations/${id}/adjust-prices`, dto);
    return unwrap(data);
  },

  // Requires APPROVED.
  sendQuotation: async (id: string): Promise<Quotation> => {
    const { data } = await apiClient.post(`${base}/quotations/${id}/send`);
    return unwrap(data);
  },

  acceptQuotation: async (id: string, acceptedByName?: string): Promise<Quotation> => {
    const { data } = await apiClient.post(`${base}/quotations/${id}/accept`, acceptedByName ? { acceptedByName } : {});
    return unwrap(data);
  },

  rejectQuotation: async (id: string, reason?: string): Promise<Quotation> => {
    const { data } = await apiClient.post(`${base}/quotations/${id}/reject`, reason ? { reason } : {});
    return unwrap(data);
  },

  // The old quotation becomes SUPERSEDED; the response is the new DRAFT.
  newQuotationVersion: async (id: string): Promise<Quotation> => {
    const { data } = await apiClient.post(`${base}/quotations/${id}/new-version`);
    return unwrap(data);
  },

  // ── Sales invoices ──
  getSalesInvoices: async (
    params?: PageParams & { status?: SalesInvoiceStatus; patientId?: string },
  ): Promise<Paginated<SalesInvoice>> => {
    const { data } = await apiClient.get(`${base}/sales-invoices`, { params });
    return unwrapPage(data);
  },

  getSalesInvoice: async (id: string): Promise<SalesInvoice> => {
    const { data } = await apiClient.get(`${base}/sales-invoices/${id}`);
    return unwrap(data);
  },

  // Never created by hand: generated from an ACCEPTED quotation, one invoice
  // per quotation (a second attempt is rejected with ALREADY_INVOICED).
  createSalesInvoice: async (
    dto: { quotationId: string; paymentMethod?: string; paymentTerms?: string },
  ): Promise<SalesInvoice> => {
    const { data } = await apiClient.post(`${base}/sales-invoices`, dto);
    return unwrap(data);
  },

  approveSalesInvoice: async (id: string): Promise<SalesInvoice> => {
    const { data } = await apiClient.post(`${base}/sales-invoices/${id}/approve`);
    return unwrap(data);
  },

  cancelSalesInvoice: async (id: string): Promise<SalesInvoice> => {
    const { data } = await apiClient.post(`${base}/sales-invoices/${id}/cancel`);
    return unwrap(data);
  },

  // ── Reports ──
  // Each report has its own shape (and, unlike the documents, real numbers —
  // except low-stock), so they stay untyped and the reports screen renders
  // whatever comes back.
  getReport: async (key: WarehouseReportKey, params?: WarehouseReportParams): Promise<unknown> => {
    const { data } = await apiClient.get(`${base}/reports/${key}`, { params });
    return unwrap(data);
  },
};
