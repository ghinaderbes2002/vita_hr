"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateRequest, useSubmitRequest } from "@/lib/hooks/use-requests";
import { useDepartments } from "@/lib/hooks/use-departments";
import { RequestType } from "@/types";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const REQUEST_TYPES: RequestType[] = [
  "PERMISSION",
  "TRANSFER",
  "ADVANCE",
  "RESIGNATION",
  "JOB_CHANGE",
  "RIGHTS",
  "REWARD",
  "SPONSORSHIP",
  "OTHER",
];

const RIGHTS_TYPES = ["OVERTIME", "HOUSING_ALLOWANCE", "TRANSPORT_ALLOWANCE", "OTHER"];

const formSchema = z.object({
  type: z.enum([
    "TRANSFER", "PERMISSION", "ADVANCE", "RESIGNATION",
    "JOB_CHANGE", "RIGHTS", "REWARD", "SPONSORSHIP", "OTHER",
  ] as [RequestType, ...RequestType[]]),
  reason: z.string().min(1),
  notes: z.string().optional(),
  // PERMISSION
  permissionDate: z.string().optional(),
  exitTime: z.string().optional(),
  returnTime: z.string().optional(),
  // TRANSFER
  toDepartmentId: z.string().optional(),
  proposedDate: z.string().optional(),
  // ADVANCE
  amount: z.string().optional(),
  currency: z.string().optional(),
  repaymentMonths: z.string().optional(),
  // RESIGNATION
  resignationDate: z.string().optional(),
  lastWorkingDay: z.string().optional(),
  handoverPlan: z.string().optional(),
  // JOB_CHANGE
  requestedTitle: z.string().optional(),
  justification: z.string().optional(),
  // RIGHTS
  rightType: z.string().optional(),
  rightDescription: z.string().optional(),
  rightAmount: z.string().optional(),
  // REWARD
  period: z.string().optional(),
  suggestedAmount: z.string().optional(),
  // SPONSORSHIP
  personName: z.string().optional(),
  relationship: z.string().optional(),
  sponsorshipPurpose: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewRequestDialog({ open, onOpenChange }: NewRequestDialogProps) {
  const t = useTranslations();
  const [submitMode, setSubmitMode] = useState<"draft" | "submit">("draft");
  const createRequest = useCreateRequest();
  const submitRequest = useSubmitRequest();
  const { data: deptData } = useDepartments({ limit: 100 });

  const departments: any[] = (deptData as any)?.data?.items || (deptData as any)?.data || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "PERMISSION",
      reason: "",
      notes: "",
      currency: "SAR",
      repaymentMonths: "1",
    },
  });

  const selectedType = form.watch("type");

  const buildDetails = (data: FormData): Record<string, any> | undefined => {
    const d: Record<string, any> = {};
    switch (data.type) {
      case "PERMISSION":
        if (data.permissionDate) d.date = data.permissionDate;
        if (data.exitTime) d.exitTime = data.exitTime;
        if (data.returnTime) d.returnTime = data.returnTime;
        break;
      case "TRANSFER":
        if (data.toDepartmentId) d.toDepartmentId = data.toDepartmentId;
        if (data.proposedDate) d.proposedDate = data.proposedDate;
        break;
      case "ADVANCE":
        if (data.amount) d.amount = Number(data.amount);
        if (data.currency) d.currency = data.currency;
        if (data.repaymentMonths) d.repaymentMonths = Number(data.repaymentMonths);
        break;
      case "RESIGNATION":
        if (data.resignationDate) d.resignationDate = data.resignationDate;
        if (data.lastWorkingDay) d.lastWorkingDay = data.lastWorkingDay;
        if (data.handoverPlan) d.handoverPlan = data.handoverPlan;
        break;
      case "JOB_CHANGE":
        if (data.requestedTitle) d.requestedTitle = data.requestedTitle;
        if (data.justification) d.justification = data.justification;
        break;
      case "RIGHTS":
        if (data.rightType) d.rightType = data.rightType;
        if (data.rightDescription) d.description = data.rightDescription;
        if (data.rightAmount) d.amount = Number(data.rightAmount);
        break;
      case "REWARD":
        if (data.period) d.period = data.period;
        if (data.suggestedAmount) d.suggestedAmount = Number(data.suggestedAmount);
        break;
      case "SPONSORSHIP":
        if (data.personName) d.personName = data.personName;
        if (data.relationship) d.relationship = data.relationship;
        if (data.sponsorshipPurpose) d.purpose = data.sponsorshipPurpose;
        break;
    }
    return Object.keys(d).length > 0 ? d : undefined;
  };

  const onSubmit = async (data: FormData) => {
    try {
      const created = await createRequest.mutateAsync({
        type: data.type,
        reason: data.reason,
        notes: data.notes || undefined,
        details: buildDetails(data),
      });
      if (submitMode === "submit" && created?.id) {
        await submitRequest.mutateAsync(created.id);
      }
      onOpenChange(false);
      form.reset({ type: "PERMISSION", reason: "", notes: "", currency: "SAR", repaymentMonths: "1" });
    } catch {
      // Error handled by mutation
    }
  };

  const isLoading = createRequest.isPending || submitRequest.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-130 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("requests.newRequest")}</DialogTitle>
          <DialogDescription>{t("requests.newRequestDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* نوع الطلب */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("requests.fields.type")}</FormLabel>
                  <Select value={field.value} onValueChange={(v) => { field.onChange(v); form.clearErrors(); }}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REQUEST_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`requests.types.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── PERMISSION: إذن إداري ── */}
            {selectedType === "PERMISSION" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <FormField
                  control={form.control}
                  name="permissionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.details.date")}</FormLabel>
                      <FormControl><Input {...field} type="date" /></FormControl>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="exitTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("requests.details.exitTime")}</FormLabel>
                        <FormControl><Input {...field} type="time" /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="returnTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("requests.details.returnTime")}</FormLabel>
                        <FormControl><Input {...field} type="time" /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* ── TRANSFER: نقل قسم ── */}
            {selectedType === "TRANSFER" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <FormField
                  control={form.control}
                  name="toDepartmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.details.toDepartment")}</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("departments.selectParent")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((d: any) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.nameAr} ({d.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="proposedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.details.proposedDate")}</FormLabel>
                      <FormControl><Input {...field} type="date" /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* ── ADVANCE: سلفة ── */}
            {selectedType === "ADVANCE" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("requests.fields.amount")}</FormLabel>
                        <FormControl><Input {...field} type="number" min={0} placeholder="5000" /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("requests.details.currency")}</FormLabel>
                        <FormControl><Input {...field} placeholder="SAR" /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="repaymentMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.details.repaymentMonths")}</FormLabel>
                      <FormControl><Input {...field} type="number" min={1} max={24} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* ── RESIGNATION: استقالة ── */}
            {selectedType === "RESIGNATION" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="resignationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("requests.details.resignationDate")}</FormLabel>
                        <FormControl><Input {...field} type="date" /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastWorkingDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("requests.details.lastWorkingDay")}</FormLabel>
                        <FormControl><Input {...field} type="date" /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="handoverPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.details.handoverPlan")}</FormLabel>
                      <FormControl><Textarea {...field} rows={2} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* ── JOB_CHANGE: تغيير وظيفة ── */}
            {selectedType === "JOB_CHANGE" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <FormField
                  control={form.control}
                  name="requestedTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.details.requestedTitle")}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="justification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.details.justification")}</FormLabel>
                      <FormControl><Textarea {...field} rows={2} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* ── RIGHTS: حقوق وظيفية ── */}
            {selectedType === "RIGHTS" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <FormField
                  control={form.control}
                  name="rightType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.details.rightType")}</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("requests.details.rightType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RIGHTS_TYPES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {t(`requests.details.rightsTypes.${r}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rightDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.details.rightDescription")}</FormLabel>
                      <FormControl><Textarea {...field} rows={2} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rightAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.fields.amount")} ({t("common.optional")})</FormLabel>
                      <FormControl><Input {...field} type="number" min={0} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* ── REWARD: مكافأة ── */}
            {selectedType === "REWARD" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.details.period")}</FormLabel>
                      <FormControl><Input {...field} placeholder="Q1 2026" /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="suggestedAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.details.suggestedAmount")} ({t("common.optional")})</FormLabel>
                      <FormControl><Input {...field} type="number" min={0} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* ── SPONSORSHIP: كفالة ── */}
            {selectedType === "SPONSORSHIP" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="personName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("requests.details.personName")}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="relationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("requests.details.relationship")}</FormLabel>
                        <FormControl><Input {...field} placeholder={t("requests.details.relationshipPlaceholder")} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="sponsorshipPurpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.details.sponsorshipPurpose")}</FormLabel>
                      <FormControl><Textarea {...field} rows={2} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* السبب (مشترك لكل الأنواع) */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("requests.fields.reason")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder={t("requests.fields.reasonPlaceholder")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ملاحظات */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("requests.fields.notes")} ({t("common.optional")})</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={isLoading}
                onClick={() => setSubmitMode("draft")}
              >
                {t("requests.saveAsDraft")}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                onClick={() => setSubmitMode("submit")}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                {t("requests.submitRequest")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
