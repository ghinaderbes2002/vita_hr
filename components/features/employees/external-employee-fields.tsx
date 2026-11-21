"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateExternalEmployeeType, useExternalEmployeeTypes } from "@/lib/hooks/use-employees";

/**
 * "Employee from outside the company" + its type (consultant, lawyer…).
 * The type is required once the box is ticked; unticking hides it and the
 * backend clears the saved type by itself. New types are added inline.
 */
export function ExternalEmployeeFields({
  isExternal, externalTypeId, onIsExternalChange, onTypeChange, error, includeInactive = false,
}: {
  isExternal: boolean;
  externalTypeId: string;
  onIsExternalChange: (v: boolean) => void;
  onTypeChange: (id: string) => void;
  error?: string;
  /** Editing: keep a disabled type visible so an older employee's type doesn't vanish. */
  includeInactive?: boolean;
}) {
  const { data: types = [], isLoading } = useExternalEmployeeTypes(includeInactive, isExternal);
  const createType = useCreateExternalEmployeeType();
  const [adding, setAdding] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");

  const addType = async () => {
    if (!nameAr.trim()) return;
    const created = await createType.mutateAsync({ nameAr: nameAr.trim(), nameEn: nameEn.trim() || undefined });
    onTypeChange(created.id);
    setAdding(false);
    setNameAr("");
    setNameEn("");
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Checkbox id="isExternal" checked={isExternal} onCheckedChange={(v) => onIsExternalChange(v === true)} />
        <Label htmlFor="isExternal" className="cursor-pointer">موظف من خارج الشركة</Label>
      </div>

      {isExternal && (
        <div className="space-y-1.5">
          <Label>نوع الموظف الخارجي <span className="text-destructive">*</span></Label>
          <div className="flex gap-2">
            <Select value={externalTypeId || undefined} onValueChange={onTypeChange} disabled={isLoading}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={isLoading ? "جارٍ التحميل..." : "اختاري النوع"} />
              </SelectTrigger>
              <SelectContent>
                {types.map((tp) => (
                  <SelectItem key={tp.id} value={tp.id}>
                    {tp.nameAr}{tp.isActive === false ? " (معطّل)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!adding && (
              <Button type="button" variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => setAdding(true)}>
                <Plus className="h-3.5 w-3.5" /> نوع جديد
              </Button>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}

          {adding && (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 p-2">
              <Input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="الاسم بالعربي (مثلاً: مستشار مالي)"
                className="h-8 flex-1 min-w-40 text-sm"
                autoFocus
              />
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="English name"
                dir="ltr"
                className="h-8 flex-1 min-w-32 text-sm"
              />
              <Button type="button" size="sm" onClick={addType} disabled={!nameAr.trim() || createType.isPending}>
                {createType.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "إضافة"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>إلغاء</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
