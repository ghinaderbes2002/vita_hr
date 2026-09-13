"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Pencil, Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useSaveTaxonomy, useTaxonomy } from "@/lib/hooks/use-patient-app";
import { localizedName, type TaxonomyItem, type TaxonomyKind } from "@/lib/api/patient-app";

type KindKey = "bodyRegions" | "targetRegions" | "subTargetRegions" | "goals";

/** Tab order; `key` is the entry under `patientApp.taxonomy.kinds`. */
export const TAXONOMY_KINDS: { kind: TaxonomyKind; key: KindKey }[] = [
  { kind: "body-regions",       key: "bodyRegions" },
  { kind: "target-regions",     key: "targetRegions" },
  { kind: "sub-target-regions", key: "subTargetRegions" },
  { kind: "goals",              key: "goals" },
];

const ALL = "__all__";

const bySortOrder = (a: TaxonomyItem, b: TaxonomyItem) =>
  (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.nameAr.localeCompare(b.nameAr, "ar");

export function TaxonomyTab({ kind }: { kind: TaxonomyKind }) {
  const t = useTranslations("patientApp.taxonomy");
  const tc = useTranslations("patientApp.common");
  const locale = useLocale();
  const key = TAXONOMY_KINDS.find((k) => k.kind === kind)!.key;
  const label = t(`kinds.${key}.label`);
  const singular = t(`kinds.${key}.singular`);
  const hasBodyParent = kind === "target-regions" || kind === "sub-target-regions";
  const hasTargetParent = kind === "sub-target-regions";

  const [bodyFilter, setBodyFilter] = useState(ALL);
  const [targetFilter, setTargetFilter] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaxonomyItem | null>(null);

  const { data: bodyRegions = [] } = useTaxonomy("body-regions", undefined, hasBodyParent);
  const { data: allTargets = [] } = useTaxonomy("target-regions", undefined, hasTargetParent);

  // The API filters target regions by body region and sub-targets by target
  // region only; a body-region filter on sub-targets is applied here instead.
  const params =
    kind === "target-regions" && bodyFilter !== ALL ? { bodyRegionId: bodyFilter }
    : kind === "sub-target-regions" && targetFilter !== ALL ? { targetRegionId: targetFilter }
    : undefined;
  const { data = [], isLoading } = useTaxonomy(kind, params);

  const targetOptions = bodyFilter === ALL ? allTargets : allTargets.filter((x) => x.bodyRegionId === bodyFilter);
  const items = [...data]
    .filter((i) =>
      kind !== "sub-target-regions" || bodyFilter === ALL || targetFilter !== ALL ||
      targetOptions.some((x) => x.id === i.targetRegionId))
    .sort(bySortOrder);

  const nameOf = (list: TaxonomyItem[], id?: string | null) =>
    localizedName(list.find((x) => x.id === id), locale) || "—";

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item: TaxonomyItem) => { setEditing(item); setDialogOpen(true); };

  const colCount = 4 + (hasBodyParent ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {hasBodyParent && (
          <Select value={bodyFilter} onValueChange={(v) => { setBodyFilter(v); setTargetFilter(ALL); }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allBodyRegions")}</SelectItem>
              {[...bodyRegions].sort(bySortOrder).map((r) => (
                <SelectItem key={r.id} value={r.id}>{localizedName(r, locale)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasTargetParent && (
          <Select value={targetFilter} onValueChange={setTargetFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allTargetRegions")}</SelectItem>
              {[...targetOptions].sort(bySortOrder).map((r) => (
                <SelectItem key={r.id} value={r.id}>{localizedName(r, locale)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex-1" />
        <ActionGuard permission={PERMISSIONS.PATIENT_APP.MANAGE_TAXONOMY}>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("addItem", { name: singular })}
          </Button>
        </ActionGuard>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc("nameAr")}</TableHead>
              <TableHead>{tc("nameEn")}</TableHead>
              {hasBodyParent && (
                <TableHead>{hasTargetParent ? t("targetRegion") : t("bodyRegion")}</TableHead>
              )}
              <TableHead className="w-24">{tc("sortOrder")}</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: colCount }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount}>
                  <EmptyState
                    icon={<Tags className="h-8 w-8 text-muted-foreground" />}
                    title={t("emptyTitle", { name: label })}
                    description={t("emptyDescription")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium" dir="rtl">{item.nameAr}</TableCell>
                  <TableCell dir="ltr" className="text-start">{item.nameEn}</TableCell>
                  {hasBodyParent && (
                    <TableCell className="text-sm">
                      {hasTargetParent ? nameOf(allTargets, item.targetRegionId) : nameOf(bodyRegions, item.bodyRegionId)}
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-muted-foreground">{item.sortOrder ?? "—"}</TableCell>
                  <TableCell>
                    <ActionGuard permission={PERMISSIONS.PATIENT_APP.MANAGE_TAXONOMY}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </ActionGuard>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TaxonomyDialog
        kind={kind}
        singular={singular}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editing}
        bodyRegions={bodyRegions}
        allTargets={allTargets}
      />
    </div>
  );
}

const emptyForm = { nameAr: "", nameEn: "", sortOrder: "", bodyRegionId: "", targetRegionId: "" };

function TaxonomyDialog({
  kind, singular, open, onOpenChange, item, bodyRegions, allTargets,
}: {
  kind: TaxonomyKind;
  singular: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TaxonomyItem | null;
  bodyRegions: TaxonomyItem[];
  allTargets: TaxonomyItem[];
}) {
  const t = useTranslations("patientApp.taxonomy");
  const tc = useTranslations("patientApp.common");
  const locale = useLocale();
  const hasBodyParent = kind === "target-regions" || kind === "sub-target-regions";
  const hasTargetParent = kind === "sub-target-regions";
  const [form, setForm] = useState(emptyForm);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const save = useSaveTaxonomy(kind);

  // Reset on open (adjusting state on prop change, as React prefers over an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(item
        ? {
            nameAr: item.nameAr ?? "",
            nameEn: item.nameEn ?? "",
            sortOrder: item.sortOrder != null ? String(item.sortOrder) : "",
            // A sub-target stores only its target; the body region is just a narrowing aid.
            bodyRegionId: hasTargetParent
              ? allTargets.find((x) => x.id === item.targetRegionId)?.bodyRegionId ?? ""
              : item.bodyRegionId ?? "",
            targetRegionId: item.targetRegionId ?? "",
          }
        : emptyForm);
    }
  }

  const targetOptions = form.bodyRegionId
    ? allTargets.filter((x) => x.bodyRegionId === form.bodyRegionId)
    : allTargets;

  const missing =
    !form.nameAr.trim() || !form.nameEn.trim() ||
    (kind === "target-regions" && !form.bodyRegionId) ||
    (hasTargetParent && !form.targetRegionId);

  const handleSave = async () => {
    if (missing) return;
    const sortOrder = Number(form.sortOrder);
    await save.mutateAsync({
      id: item?.id,
      dto: {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        ...(form.sortOrder.trim() && !Number.isNaN(sortOrder) ? { sortOrder } : {}),
        ...(kind === "target-regions" ? { bodyRegionId: form.bodyRegionId } : {}),
        ...(hasTargetParent ? { targetRegionId: form.targetRegionId } : {}),
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!save.isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? t("editItem", { name: singular }) : t("addItem", { name: singular })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {hasBodyParent && (
            <div className="space-y-1.5">
              <Label>
                {t("bodyRegion")} {kind === "target-regions" && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={form.bodyRegionId || undefined}
                onValueChange={(v) => set({ bodyRegionId: v, targetRegionId: "" })}
              >
                <SelectTrigger><SelectValue placeholder={tc("choose")} /></SelectTrigger>
                <SelectContent>
                  {[...bodyRegions].sort(bySortOrder).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{localizedName(r, locale)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {hasTargetParent && (
            <div className="space-y-1.5">
              <Label>{t("targetRegion")} <span className="text-destructive">*</span></Label>
              <Select value={form.targetRegionId || undefined} onValueChange={(v) => set({ targetRegionId: v })}>
                <SelectTrigger><SelectValue placeholder={tc("choose")} /></SelectTrigger>
                <SelectContent>
                  {[...targetOptions].sort(bySortOrder).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{localizedName(r, locale)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{tc("nameAr")} <span className="text-destructive">*</span></Label>
            <Input dir="rtl" value={form.nameAr} onChange={(e) => set({ nameAr: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{tc("nameEn")} <span className="text-destructive">*</span></Label>
            <Input dir="ltr" value={form.nameEn} onChange={(e) => set({ nameEn: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{tc("sortOrder")}</Label>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              className="w-32"
              value={form.sortOrder}
              onChange={(e) => set({ sortOrder: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={missing || save.isPending}>
            {save.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {item ? tc("save") : tc("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
