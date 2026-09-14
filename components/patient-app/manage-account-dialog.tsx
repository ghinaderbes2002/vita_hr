"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MIN_ACCOUNT_PASSWORD } from "@/components/patient-app/create-account-dialog";
import { useUpdatePatientAppAccount } from "@/lib/hooks/use-patient-app";
import type { PatientAppAccount, PatientAppAccountStatus } from "@/lib/api/patient-app";

export const ACCOUNT_STATUSES: PatientAppAccountStatus[] = ["ACTIVE", "INACTIVE", "BLOCKED"];

/** Labels live under `patientApp.accountStatus`. */
export const ACCOUNT_STATUS_STYLE: Record<PatientAppAccountStatus, string> = {
  ACTIVE:   "bg-green-100 text-green-800 border-green-200",
  INACTIVE: "bg-gray-100 text-gray-700 border-gray-200",
  BLOCKED:  "bg-red-100 text-red-800 border-red-200",
};

export function ManageAccountDialog({
  account,
  patientName,
  onOpenChange,
}: {
  /** Open while set. */
  account: PatientAppAccount | null;
  patientName?: React.ReactNode;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("patientApp.accounts");

  return (
    <Dialog open={!!account} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("manageTitle")}</DialogTitle>
        </DialogHeader>
        {account && (
          <ManageAccountBody
            key={account.id}
            account={account}
            patientName={patientName}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ManageAccountBody({
  account, patientName, onDone,
}: {
  account: PatientAppAccount;
  patientName?: React.ReactNode;
  onDone: () => void;
}) {
  const t = useTranslations("patientApp.accounts");
  const tc = useTranslations("patientApp.common");
  const ts = useTranslations("patientApp.accountStatus");
  const [status, setStatus] = useState<PatientAppAccountStatus>(account.status);
  const [password, setPassword] = useState("");
  const update = useUpdatePatientAppAccount();

  return (
    <div className="space-y-5 py-2">
      <div className="rounded-lg border bg-muted/30 px-3 py-2">
        {patientName && <p className="font-medium">{patientName}</p>}
        <p className="font-mono text-sm text-muted-foreground" dir="ltr">{account.username}</p>
      </div>

      <div className="space-y-1.5">
        <Label>{t("accountStatus")}</Label>
        <div className="flex gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as PatientAppAccountStatus)}>
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACCOUNT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{ts(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={status === account.status || update.isPending}
            onClick={() => update.mutate({ id: account.id, dto: { status } }, { onSuccess: onDone })}
          >
            {t("saveStatus")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("statusHint")}</p>
      </div>

      <div className="space-y-1.5 border-t pt-4">
        <Label className="flex items-center gap-1.5">
          <KeyRound className="h-4 w-4" />
          {t("newPassword")}
        </Label>
        <div className="flex gap-2">
          <Input
            dir="ltr"
            type="password"
            autoComplete="new-password"
            className="flex-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            variant="outline"
            disabled={password.length < MIN_ACCOUNT_PASSWORD || update.isPending}
            onClick={() => update.mutate({ id: account.id, dto: { password } }, { onSuccess: onDone })}
          >
            {update.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("changePassword")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{tc("minPassword", { min: MIN_ACCOUNT_PASSWORD })}</p>
      </div>
    </div>
  );
}
