import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  warehouseOpsApi,
  AdjustStockDto,
  SetMinStockDto,
  CreateMaterialRequestDto,
  MaterialRequestStatus,
  CreatePurchaseInvoiceDto,
  PurchaseInvoiceStatus,
  CreateTransferDto,
  StockTransferStatus,
  CreateReturnDto,
  ReturnType,
  InventoryCountStatus,
  CreateQuotationDto,
  AdjustQuotationPricesDto,
  QuotationStatus,
  SalesInvoiceStatus,
  PageParams,
  WarehouseReportKey,
  WarehouseReportParams,
} from "@/lib/api/warehouse-operations";
import { apiErrorCode, apiErrorMessage } from "@/lib/api/api-errors";

// Query key roots. Anything that moves stock also invalidates STOCK.
const K = {
  stock: "warehouse-stock",
  materialRequests: "warehouse-material-requests",
  purchaseInvoices: "warehouse-purchase-invoices",
  transfers: "warehouse-transfers",
  returns: "warehouse-returns",
  counts: "warehouse-counts",
  quotations: "warehouse-quotations",
  salesInvoices: "warehouse-sales-invoices",
  reports: "warehouse-reports",
} as const;

type ToastKey =
  | "done" | "created" | "saved" | "approved" | "rejected" | "issued" | "posted"
  | "received" | "completed" | "cancelled" | "sent" | "accepted";

/**
 * One shape for every warehouse write: invalidate the affected lists, show a
 * translated success toast, and on failure show the API's own message (it
 * comes back in Arabic) unless the error code has a translated one.
 */
function useOpMutation<TVars, TData>(
  mutationFn: (vars: TVars) => Promise<TData>,
  invalidate: string[],
  success: ToastKey,
) {
  const qc = useQueryClient();
  const t = useTranslations("warehouse.opToast");
  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidate.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
      toast.success(t(success));
    },
    onError: (e: unknown) => {
      // The two refusals worth their own wording, in the user's language:
      // WAREHOUSE_FROZEN_FOR_COUNT and COUNT_WOULD_BREAK_RESERVATION.
      const code = apiErrorCode(e);
      toast.error(code && t.has(`codes.${code}`) ? t(`codes.${code}`) : apiErrorMessage(e, t("error")));
    },
  });
}

// ── Stock ──
export function useStockBalances(params?: { warehouseId?: string; itemId?: string }, enabled = true) {
  return useQuery({
    queryKey: [K.stock, "balances", params],
    queryFn: () => warehouseOpsApi.getBalances(params),
    enabled,
  });
}

export function useStockMovements(params?: PageParams & { warehouseId?: string; itemId?: string }) {
  return useQuery({
    queryKey: [K.stock, "movements", params],
    queryFn: () => warehouseOpsApi.getMovements(params),
  });
}

export function useLowStock(params?: { warehouseId?: string }) {
  return useQuery({
    queryKey: [K.stock, "low-stock", params],
    queryFn: () => warehouseOpsApi.getLowStock(params),
  });
}

export function useAdjustStock() {
  return useOpMutation((dto: AdjustStockDto) => warehouseOpsApi.adjustStock(dto), [K.stock], "done");
}

export function useSetMinStock() {
  return useOpMutation((dto: SetMinStockDto) => warehouseOpsApi.setMinStock(dto), [K.stock], "saved");
}

// ── Material requests ──
export function useMaterialRequests(
  params?: PageParams & { status?: MaterialRequestStatus; warehouseId?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: [K.materialRequests, "all", params],
    queryFn: () => warehouseOpsApi.getMaterialRequests(params),
    enabled,
  });
}

export function useMyMaterialRequests(enabled = true) {
  return useQuery({
    queryKey: [K.materialRequests, "my"],
    queryFn: () => warehouseOpsApi.getMyMaterialRequests(),
    enabled,
  });
}

export function useMaterialRequest(id: string) {
  return useQuery({
    queryKey: [K.materialRequests, "one", id],
    queryFn: () => warehouseOpsApi.getMaterialRequest(id),
    enabled: !!id,
  });
}

export function useCreateMaterialRequest() {
  return useOpMutation(
    (dto: CreateMaterialRequestDto) => warehouseOpsApi.createMaterialRequest(dto),
    [K.materialRequests],
    "created",
  );
}

export function useApproveMaterialRequest() {
  return useOpMutation(
    ({ id, items }: { id: string; items?: { itemId: string; approvedQty: number }[] }) =>
      warehouseOpsApi.approveMaterialRequest(id, items),
    // Approval reserves stock.
    [K.materialRequests, K.stock],
    "approved",
  );
}

export function useRejectMaterialRequest() {
  return useOpMutation(
    ({ id, reason }: { id: string; reason?: string }) => warehouseOpsApi.rejectMaterialRequest(id, reason),
    [K.materialRequests],
    "rejected",
  );
}

export function useIssueMaterialRequest() {
  return useOpMutation(
    ({ id, items }: { id: string; items?: { itemId: string; issuedQty: number }[] }) =>
      warehouseOpsApi.issueMaterialRequest(id, items),
    [K.materialRequests, K.stock],
    "issued",
  );
}

// ── Purchase invoices ──
export function usePurchaseInvoices(
  params?: PageParams & { status?: PurchaseInvoiceStatus; supplierId?: string; warehouseId?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: [K.purchaseInvoices, "list", params],
    queryFn: () => warehouseOpsApi.getPurchaseInvoices(params),
    enabled,
  });
}

export function usePurchaseInvoice(id: string) {
  return useQuery({
    queryKey: [K.purchaseInvoices, "one", id],
    queryFn: () => warehouseOpsApi.getPurchaseInvoice(id),
    enabled: !!id,
  });
}

export function useCreatePurchaseInvoice() {
  return useOpMutation(
    (dto: CreatePurchaseInvoiceDto) => warehouseOpsApi.createPurchaseInvoice(dto),
    [K.purchaseInvoices],
    "created",
  );
}

export function useApprovePurchaseInvoice() {
  return useOpMutation((id: string) => warehouseOpsApi.approvePurchaseInvoice(id), [K.purchaseInvoices], "approved");
}

export function useRejectPurchaseInvoice() {
  return useOpMutation(
    ({ id, reason }: { id: string; reason?: string }) => warehouseOpsApi.rejectPurchaseInvoice(id, reason),
    [K.purchaseInvoices],
    "rejected",
  );
}

export function usePostPurchaseInvoice() {
  return useOpMutation(
    (id: string) => warehouseOpsApi.postPurchaseInvoice(id),
    [K.purchaseInvoices, K.stock],
    "posted",
  );
}

// ── Transfers ──
export function useTransfers(params?: PageParams & { status?: StockTransferStatus; warehouseId?: string }) {
  return useQuery({
    queryKey: [K.transfers, "list", params],
    queryFn: () => warehouseOpsApi.getTransfers(params),
  });
}

export function useTransfer(id: string) {
  return useQuery({
    queryKey: [K.transfers, "one", id],
    queryFn: () => warehouseOpsApi.getTransfer(id),
    enabled: !!id,
  });
}

export function useCreateTransfer() {
  return useOpMutation(
    (dto: CreateTransferDto) => warehouseOpsApi.createTransfer(dto),
    [K.transfers, K.stock],
    "created",
  );
}

export function useReceiveTransfer() {
  return useOpMutation(
    ({ id, items }: { id: string; items?: { itemId: string; receivedQty: number }[] }) =>
      warehouseOpsApi.receiveTransfer(id, items),
    [K.transfers, K.stock],
    "received",
  );
}

// ── Returns ──
export function useReturns(params?: PageParams & { returnType?: ReturnType; warehouseId?: string }) {
  return useQuery({
    queryKey: [K.returns, "list", params],
    queryFn: () => warehouseOpsApi.getReturns(params),
  });
}

export function useReturn(id: string) {
  return useQuery({
    queryKey: [K.returns, "one", id],
    queryFn: () => warehouseOpsApi.getReturn(id),
    enabled: !!id,
  });
}

export function useCreateReturn() {
  return useOpMutation((dto: CreateReturnDto) => warehouseOpsApi.createReturn(dto), [K.returns, K.stock], "created");
}

// ── Inventory counts ──
export function useInventoryCounts(
  params?: { warehouseId?: string; status?: InventoryCountStatus },
  enabled = true,
) {
  return useQuery({
    queryKey: [K.counts, "list", params],
    queryFn: () => warehouseOpsApi.getInventoryCounts(params),
    enabled,
  });
}

export function useInventoryCount(id: string) {
  return useQuery({
    queryKey: [K.counts, "one", id],
    queryFn: () => warehouseOpsApi.getInventoryCount(id),
    enabled: !!id,
  });
}

export function useStartInventoryCount() {
  return useOpMutation(
    (dto: { warehouseId: string; notes?: string }) => warehouseOpsApi.startInventoryCount(dto),
    [K.counts],
    "created",
  );
}

export function useRecordInventoryCount() {
  return useOpMutation(
    ({ id, items }: { id: string; items: { itemId: string; actualQty: number; note?: string }[] }) =>
      warehouseOpsApi.recordInventoryCount(id, items),
    [K.counts],
    "saved",
  );
}

export function useCompleteInventoryCount() {
  return useOpMutation(
    (id: string) => warehouseOpsApi.completeInventoryCount(id),
    [K.counts, K.stock],
    "completed",
  );
}

export function useCancelInventoryCount() {
  return useOpMutation((id: string) => warehouseOpsApi.cancelInventoryCount(id), [K.counts], "cancelled");
}

// ── Quotations ──
export function useQuotations(params?: PageParams & { status?: QuotationStatus; patientId?: string }) {
  return useQuery({
    queryKey: [K.quotations, "list", params],
    queryFn: () => warehouseOpsApi.getQuotations(params),
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: [K.quotations, "one", id],
    queryFn: () => warehouseOpsApi.getQuotation(id),
    enabled: !!id,
  });
}

export function useCreateQuotation() {
  return useOpMutation((dto: CreateQuotationDto) => warehouseOpsApi.createQuotation(dto), [K.quotations], "created");
}

export function useUpdateQuotation() {
  return useOpMutation(
    ({ id, dto }: { id: string; dto: Partial<Omit<CreateQuotationDto, "patientId" | "currencyId">> }) =>
      warehouseOpsApi.updateQuotation(id, dto),
    [K.quotations],
    "saved",
  );
}

export function useApproveQuotation() {
  return useOpMutation((id: string) => warehouseOpsApi.approveQuotation(id), [K.quotations], "approved");
}

export function useAdjustQuotationPrices() {
  return useOpMutation(
    ({ id, dto }: { id: string; dto: AdjustQuotationPricesDto }) => warehouseOpsApi.adjustQuotationPrices(id, dto),
    [K.quotations],
    "saved",
  );
}

export function useSendQuotation() {
  return useOpMutation((id: string) => warehouseOpsApi.sendQuotation(id), [K.quotations], "sent");
}

export function useAcceptQuotation() {
  return useOpMutation(
    ({ id, acceptedByName }: { id: string; acceptedByName?: string }) =>
      warehouseOpsApi.acceptQuotation(id, acceptedByName),
    [K.quotations],
    "accepted",
  );
}

export function useRejectQuotation() {
  return useOpMutation(
    ({ id, reason }: { id: string; reason?: string }) => warehouseOpsApi.rejectQuotation(id, reason),
    [K.quotations],
    "rejected",
  );
}

export function useNewQuotationVersion() {
  return useOpMutation((id: string) => warehouseOpsApi.newQuotationVersion(id), [K.quotations], "created");
}

// ── Sales invoices ──
export function useSalesInvoices(params?: PageParams & { status?: SalesInvoiceStatus; patientId?: string }) {
  return useQuery({
    queryKey: [K.salesInvoices, "list", params],
    queryFn: () => warehouseOpsApi.getSalesInvoices(params),
  });
}

export function useSalesInvoice(id: string) {
  return useQuery({
    queryKey: [K.salesInvoices, "one", id],
    queryFn: () => warehouseOpsApi.getSalesInvoice(id),
    enabled: !!id,
  });
}

export function useCreateSalesInvoice() {
  return useOpMutation(
    (dto: { quotationId: string; paymentMethod?: string; paymentTerms?: string }) =>
      warehouseOpsApi.createSalesInvoice(dto),
    [K.salesInvoices, K.quotations],
    "created",
  );
}

export function useApproveSalesInvoice() {
  return useOpMutation((id: string) => warehouseOpsApi.approveSalesInvoice(id), [K.salesInvoices], "approved");
}

export function useCancelSalesInvoice() {
  return useOpMutation((id: string) => warehouseOpsApi.cancelSalesInvoice(id), [K.salesInvoices], "cancelled");
}

// ── Reports ──
export function useWarehouseReport(key: WarehouseReportKey, params?: WarehouseReportParams) {
  return useQuery({
    queryKey: [K.reports, key, params],
    queryFn: () => warehouseOpsApi.getReport(key, params),
  });
}
