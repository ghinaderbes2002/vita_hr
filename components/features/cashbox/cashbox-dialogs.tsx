"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronDown, Loader2, Plus } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { EmployeeFilterCombobox } from "@/components/shared/employee-filter-combobox";
import { Field, OptionSelect, useWarehouseFormat } from "@/components/features/warehouse/shared";
import { ClientKind, ClientPicker } from "@/components/features/warehouse/patient-combobox";
import {
  useCashBalances, useCashBoxes, useCashCurrencies, useCreateCashBox, useCreateCashCount,
  useCreateCashCurrency, useCreateCashTransaction, useUpdateCashBox,
} from "@/lib/hooks/use-cashbox";
import type { CashBox, CashBoxType, CashTransactionType } from "@/lib/api/cashbox";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";

/** A positive amount from text input, else undefined. */
const positive = (v: string) => {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && n > 0 ? n : undefined;
};

// ── Box ──────────────────────────────────────────────────────────────────────

export function CashBoxDialog({
  open, onOpenChange, box,
}: { open: boolean; onOpenChange: (o: boolean) => void; box?: CashBox | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <CashBoxForm box={box} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CashBoxForm({ box, onDone }: { box?: CashBox | null; onDone: () => void }) {
  const t = useTranslations("cashbox");
  const create = useCreateCashBox();
  const update = useUpdateCashBox();
  const { data: boxes = [] } = useCashBoxes();
  const isEdit = !!box;
  const [name, setName] = useState(box?.name ?? "");
  const [custodianId, setCustodianId] = useState(box?.custodianEmployeeId ?? "");
  const [type, setType] = useState<CashBoxType>("SUB");
  const [isActive, setIsActive] = useState(box?.isActive !== false);
  const currentMain = boxes.find((b) => b.type === "MAIN");

  const valid = !!name.trim() && !!custodianId;
  const pending = create.isPending || update.isPending;

  const submit = async () => {
    if (!valid) return;
    try {
      if (isEdit) {
        await update.mutateAsync({ id: box.id, dto: { name: name.trim(), custodianEmployeeId: custodianId, isActive } });
      } else {
        await create.mutateAsync({ name: name.trim(), custodianEmployeeId: custodianId, type });
      }
      onDone();
    } catch {
      // Toasted by the hook.
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? t("box.editTitle") : t("box.addTitle")}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <Field label={t("fields.name")} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t("fields.custodian")} required>
          <EmployeeFilterCombobox
            value={custodianId}
            onChange={setCustodianId}
            placeholder={t("box.searchEmployee")}
            allLabel={t("box.selectEmployee")}
            emptyLabel={t("box.noEmployees")}
          />
        </Field>
        {!isEdit && (
          <Field label={t("fields.boxType")}>
            <OptionSelect
              value={type}
              onChange={(v) => setType(v as CashBoxType)}
              options={[
                { value: "SUB", label: t("boxType.SUB") },
                { value: "MAIN", label: t("boxType.MAIN") },
              ]}
            />
            {/* There is only ever one main box. */}
            {type === "MAIN" && currentMain && (
              <p className="flex gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t("box.mainReplaces", { name: currentMain.name })}
              </p>
            )}
          </Field>
        )}
        {isEdit && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
            {t("box.active")}
          </label>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={pending}>{t("cancel")}</Button>
        <Button onClick={submit} disabled={!valid || pending}>
          {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t("save")}
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Currency ─────────────────────────────────────────────────────────────────

export function CashCurrencyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {open && <CashCurrencyForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CashCurrencyForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("cashbox");
  const create = useCreateCashCurrency();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const valid = code.trim().length >= 2 && !!name.trim();
  const submit = async () => {
    if (!valid) return;
    try {
      await create.mutateAsync({ code: code.trim().toUpperCase(), name: name.trim() });
      onDone();
    } catch {
      // Toasted by the hook.
    }
  };
  return (
    <>
      <DialogHeader><DialogTitle>{t("currency.addTitle")}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <Field label={t("fields.code")} required hint={t("currency.codeHint")}>
          <Input dir="ltr" value={code} maxLength={5} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="USD" />
        </Field>
        <Field label={t("fields.name")} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={create.isPending}>{t("cancel")}</Button>
        <Button onClick={submit} disabled={!valid || create.isPending}>
          {create.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t("save")}
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Transactions ─────────────────────────────────────────────────────────────

export function CashTransactionDialog({
  type, onClose, defaultBoxId,
}: {
  /** Which of the four to record; null closes the dialog. */
  type: CashTransactionType | null;
  onClose: () => void;
  defaultBoxId?: string;
}) {
  return (
    <Dialog open={!!type} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        {type && <CashTransactionForm key={type} type={type} defaultBoxId={defaultBoxId} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function CashTransactionForm({
  type, defaultBoxId, onDone,
}: { type: CashTransactionType; defaultBoxId?: string; onDone: () => void }) {
  const t = useTranslations("cashbox");
  const fmt = useWarehouseFormat();
  const { data: boxes = [] } = useCashBoxes();
  const { data: currencies = [] } = useCashCurrencies();
  const create = useCreateCashTransaction();

  // Moves between boxes start from a SUB box; the main box is the other end,
  // found by the server.
  const betweenBoxes = type === "HANDOVER" || type === "REFILL";
  const eligible = boxes.filter((b) => b.isActive !== false && (!betweenBoxes || b.type === "SUB"));
  const mainBox = boxes.find((b) => b.type === "MAIN");
  const startBox = eligible.some((b) => b.id === defaultBoxId) ? defaultBoxId! : "";

  const [boxId, setBoxId] = useState(startBox);
  const [currencyId, setCurrencyId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [clientKind, setClientKind] = useState<ClientKind>("patient");
  const [clientId, setClientId] = useState("");

  // The money leaves this box: the picked box, or for a refill the main box.
  // Money coming in (receipt, deposit) has no balance to check against.
  const sourceBoxId = type === "REFILL" ? mainBox?.id ?? "" : type === "RECEIPT" || type === "DEPOSIT" ? "" : boxId;
  const { data: sourceBalances } = useCashBalances(sourceBoxId);
  const currencyCode = currencies.find((c) => c.id === currencyId)?.code;
  const available = sourceBoxId && currencyId
    ? sourceBalances?.find((b) => b.currency.id === currencyId)?.balance ?? 0
    : undefined;
  const amountNumber = positive(amount);
  // The server refuses a balance below zero; the same check, said up front.
  const exceeds = available !== undefined && amountNumber !== undefined && amountNumber > available;

  const valid = !!boxId && !!currencyId && amountNumber !== undefined && !!reason.trim() && !exceeds &&
    (type !== "DISBURSEMENT" || !!employeeId) &&
    (type !== "RECEIPT" || !!clientId) &&
    (type !== "REFILL" || !!mainBox);

  const submit = async () => {
    if (!valid || amountNumber === undefined) return;
    const base = { cashBoxId: boxId, currencyId, amount: amountNumber, reason: reason.trim() };
    try {
      if (type === "DISBURSEMENT") await create.mutateAsync({ type, dto: { ...base, targetEmployeeId: employeeId } });
      else if (type === "RECEIPT") {
        await create.mutateAsync({
          type,
          dto: clientKind === "customer" ? { ...base, customerId: clientId } : { ...base, patientId: clientId },
        });
      } else if (type === "HANDOVER") await create.mutateAsync({ type, dto: base });
      else if (type === "DEPOSIT") await create.mutateAsync({ type, dto: base });
      else await create.mutateAsync({ type, dto: base });
      onDone();
    } catch {
      // Toasted by the hook (e.g. the balance changed meanwhile).
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t(`txTitle.${type}`)}</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">{t(`txHint.${type}`)}</p>
      <div className="space-y-4">
        <Field label={betweenBoxes ? t("fields.subBox") : t("fields.box")} required>
          <OptionSelect
            value={boxId}
            onChange={setBoxId}
            placeholder={t("selectBox")}
            options={eligible.map((b) => ({ value: b.id, label: b.type === "MAIN" ? `${b.name} (${t("boxType.MAIN")})` : b.name }))}
          />
          {betweenBoxes && (
            <p className="text-xs text-muted-foreground">
              {mainBox ? t("mainBoxIs", { name: mainBox.name }) : t("noMainBox")}
            </p>
          )}
        </Field>

        {type === "DISBURSEMENT" && (
          <Field label={t("fields.targetEmployee")} required>
            <EmployeeFilterCombobox
              value={employeeId}
              onChange={setEmployeeId}
              placeholder={t("box.searchEmployee")}
              allLabel={t("box.selectEmployee")}
              emptyLabel={t("box.noEmployees")}
            />
          </Field>
        )}
        {type === "RECEIPT" && (
          <Field label={t("fields.payer")} required>
            <ClientPicker kind={clientKind} onKindChange={setClientKind} value={clientId} onChange={setClientId} />
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("fields.currency")} required>
            <OptionSelect
              value={currencyId}
              onChange={setCurrencyId}
              placeholder={t("selectCurrency")}
              options={currencies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
            />
          </Field>
          <Field label={t("fields.amount")} required>
            <Input type="number" min={0} step="any" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        </div>
        {available !== undefined && (
          <p className={cn("text-xs", exceeds ? "text-destructive" : "text-muted-foreground")}>
            {exceeds
              ? t("exceedsBalance", { balance: fmt.money(available, currencyCode) })
              : t("availableBalance", { balance: fmt.money(available, currencyCode) })}
          </p>
        )}

        <Field label={t("fields.reason")} required>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={create.isPending}>{t("cancel")}</Button>
        <Button onClick={submit} disabled={!valid || create.isPending}>
          {create.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t("confirm")}
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Count ────────────────────────────────────────────────────────────────────

export function CashCountDialog({
  open, onOpenChange, defaultBoxId,
}: { open: boolean; onOpenChange: (o: boolean) => void; defaultBoxId?: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <CashCountForm defaultBoxId={defaultBoxId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CashCountForm({ defaultBoxId, onDone }: { defaultBoxId?: string; onDone: () => void }) {
  const t = useTranslations("cashbox");
  const fmt = useWarehouseFormat();
  const { data: boxes = [] } = useCashBoxes();
  const { data: currencies = [] } = useCashCurrencies();
  const create = useCreateCashCount();
  const [boxId, setBoxId] = useState(defaultBoxId ?? "");
  const [currencyId, setCurrencyId] = useState("");
  const [actual, setActual] = useState("");
  const [notes, setNotes] = useState("");

  const { data: balances } = useCashBalances(boxId);
  const currencyCode = currencies.find((c) => c.id === currencyId)?.code;
  const expected = boxId && currencyId ? balances?.find((b) => b.currency.id === currencyId)?.balance ?? 0 : undefined;
  const actualNumber = Number(actual);
  const actualValid = actual.trim() !== "" && Number.isFinite(actualNumber) && actualNumber >= 0;
  // The server records its own figures; this is only a preview of them.
  const variance = expected !== undefined && actualValid ? actualNumber - expected : undefined;

  const valid = !!boxId && !!currencyId && actualValid;
  const submit = async () => {
    if (!valid) return;
    try {
      await create.mutateAsync({ cashBoxId: boxId, currencyId, actualBalance: actualNumber, ...(notes.trim() ? { notes: notes.trim() } : {}) });
      onDone();
    } catch {
      // Toasted by the hook.
    }
  };

  return (
    <>
      <DialogHeader><DialogTitle>{t("count.addTitle")}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("fields.box")} required>
            <OptionSelect value={boxId} onChange={setBoxId} placeholder={t("selectBox")}
              options={boxes.map((b) => ({ value: b.id, label: b.name }))} />
          </Field>
          <Field label={t("fields.currency")} required>
            <OptionSelect value={currencyId} onChange={setCurrencyId} placeholder={t("selectCurrency")}
              options={currencies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} />
          </Field>
        </div>
        <Field label={t("fields.actual")} required hint={t("count.actualHint")}>
          <Input type="number" min={0} step="any" dir="ltr" value={actual} onChange={(e) => setActual(e.target.value)} />
        </Field>
        {expected !== undefined && (
          <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/50 p-3 text-sm">
            <span className="text-muted-foreground">{t("fields.expected")}</span>
            <span className="text-end font-medium tabular-nums">{fmt.money(expected, currencyCode)}</span>
            <span className="text-muted-foreground">{t("fields.variance")}</span>
            <span className={cn(
              "text-end font-semibold tabular-nums",
              variance === undefined ? "" : variance === 0 ? "text-green-700" : variance > 0 ? "text-amber-700" : "text-destructive",
            )}>
              {variance === undefined ? "—" : `${variance > 0 ? "+" : ""}${fmt.money(variance, currencyCode)}`}
            </span>
          </div>
        )}
        <Field label={t("fields.notes")}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={create.isPending}>{t("cancel")}</Button>
        <Button onClick={submit} disabled={!valid || create.isPending}>
          {create.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t("save")}
        </Button>
      </DialogFooter>
    </>
  );
}

// ── "New transaction" button ─────────────────────────────────────────────────

/** A button opening the four transaction kinds, each in its own dialog. */
export function NewTransactionMenu({ defaultBoxId, boxType }: {
  defaultBoxId?: string;
  /** On a box's own page: a main box neither hands over nor gets refilled. */
  boxType?: CashBoxType;
}) {
  const t = useTranslations("cashbox");
  const { hasPermission, isAdmin } = usePermissions();
  const canCreate = isAdmin() || hasPermission(PERMISSIONS.CASHBOX.TRANSACTIONS_CREATE);
  // A deposit has its own permission (the finance manager), apart from the rest.
  const canDeposit = isAdmin() || hasPermission(PERMISSIONS.CASHBOX.TRANSACTIONS_DEPOSIT);
  const [type, setType] = useState<CashTransactionType | null>(null);
  const kinds: CashTransactionType[] = [
    ...(canDeposit ? ["DEPOSIT" as const] : []),
    ...(canCreate
      ? (boxType === "MAIN" ? ["DISBURSEMENT", "RECEIPT"] as const : ["DISBURSEMENT", "RECEIPT", "HANDOVER", "REFILL"] as const)
      : []),
  ];
  if (kinds.length === 0) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t("newTransaction")}
            <ChevronDown className="h-4 w-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {kinds.map((k) => (
            <DropdownMenuItem key={k} onClick={() => setType(k)}>{t(`txTitle.${k}`)}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <CashTransactionDialog type={type} onClose={() => setType(null)} defaultBoxId={defaultBoxId} />
    </>
  );
}
