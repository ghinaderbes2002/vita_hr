"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Loader2, Save, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { useAssignPodiatryPractitioners } from "@/lib/hooks/use-clinic-podiatry";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";

interface StaffRow {
  id: string;
  firstNameAr: string;
  lastNameAr: string;
  employeeNumber?: string;
  department?: { nameAr?: string };
  employmentStatus?: string;
}
type StaffEnvelope = { data?: { items?: StaffRow[] }; items?: StaffRow[] };

// The same clinical pool the assessment form draws "اسم الأخصائي" from.
const CLINICAL_DEPTS = [
  "الإدارة الطبية", "الادارة الطبية",
  "العلاج الفيزيائي",
  "الأطراف الصناعية", "الاطراف الصناعية",
  "طب الأقدام", "طب الاقدام",
];

const sortedKey = (ids: string[]) => [...ids].sort().join(",");

/**
 * فريق المعالجين المعيّنين على حالة طب الأقدام.
 *
 * The API replaces the team wholesale on every PATCH, so the draft below is
 * always the complete list — removing a chip and saving is what unassigns
 * someone, and adding one still sends the people who were already there.
 */
export function PodiatryPractitionersCard({
  receptionId,
  practitionerIds,
}: {
  receptionId: string;
  practitionerIds: string[];
}) {
  const t = useTranslations("clinic.podiatry.practitioners");
  const { hasPermission, isAdmin } = usePermissions();
  const canEdit = isAdmin() || hasPermission(PERMISSIONS.CLINIC_PODIATRY.RECEPTION_EDIT);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(practitionerIds);
  const assign = useAssignPodiatryPractitioners();

  // The saved team is the source of truth: re-sync when the reception reloads
  // so a change made elsewhere doesn't leave a stale draft on screen.
  const savedKey = sortedKey(practitionerIds);
  useEffect(() => {
    setSelected(practitionerIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const { data: staffData } = useEmployeesBasicList();
  const staff = staffData as StaffRow[] | StaffEnvelope | undefined;
  const staffList: StaffRow[] = Array.isArray(staff) ? staff : staff?.data?.items ?? staff?.items ?? [];
  const clinicalStaff = staffList.filter(
    (e) =>
      e.employmentStatus === "ACTIVE" &&
      CLINICAL_DEPTS.some((d) => e.department?.nameAr?.includes(d)),
  );

  // Assigned ids are employee ids. Anyone who has since left the clinical pool
  // still shows — by name when we can resolve them, by id when we cannot.
  const nameOf = (id: string) => {
    const e = staffList.find((x) => x.id === id);
    return e ? `${e.firstNameAr} ${e.lastNameAr}`.trim() || id : id;
  };

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const dirty = savedKey !== sortedKey(selected);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t("title")}</CardTitle>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" />
                    {t("assign")}
                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <Command filter={(v, s) => (v.toLowerCase().includes(s.toLowerCase()) ? 1 : 0)}>
                    <CommandInput placeholder={t("searchPlaceholder")} />
                    <CommandList>
                      <CommandEmpty>
                        <span className="py-2 block text-sm text-muted-foreground">{t("noResults")}</span>
                      </CommandEmpty>
                      <CommandGroup>
                        {clinicalStaff.map((e) => {
                          const label = `${e.firstNameAr} ${e.lastNameAr}`.trim();
                          const checked = selected.includes(e.id);
                          return (
                            <CommandItem
                              key={e.id}
                              value={`${label} ${e.employeeNumber ?? ""}`}
                              onSelect={() => toggle(e.id)}
                            >
                              <Check className={cn("me-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                              <span className="flex-1 truncate">{label}</span>
                              {e.department?.nameAr && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-24">
                                  {e.department.nameAr}
                                </span>
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
                disabled={!dirty || assign.isPending}
                onClick={() => assign.mutate({ id: receptionId, practitionerIds: selected })}
              >
                {assign.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {t("save")}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((pid) => (
              <Badge key={pid} variant="secondary" className="gap-1 py-1 ps-2.5 pe-1.5">
                {nameOf(pid)}
                {canEdit && (
                  <button
                    type="button"
                    aria-label={t("remove")}
                    className="rounded-full p-0.5 hover:bg-background/60"
                    onClick={() => toggle(pid)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
        {dirty && <p className="mt-2 text-xs text-amber-600">{t("unsaved")}</p>}
      </CardContent>
    </Card>
  );
}
