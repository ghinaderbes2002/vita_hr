"use client";

// Add / edit a referral source. One dialog for both — pass `source` to edit.
import { useState } from "react";
import { Loader2, Plus, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationMap, LatLng } from "@/components/clinic/location-map";
import { cn } from "@/lib/utils";
import { useClinicCities } from "@/lib/hooks/use-clinic-cities";
import { SYRIA_GOVERNORATES } from "@/lib/clinic/syria-cities";
import { useCreateReferralSource, useUpdateReferralSource } from "@/lib/hooks/use-clinic-referrals";
import {
  CreateReferralSourceDto,
  REFERRAL_SOURCE_TYPES,
  REFERRAL_SOURCE_TYPE_LABEL,
  ReferralSource,
  ReferralSourceType,
} from "@/lib/api/clinic-referrals";

interface FormState {
  type: ReferralSourceType;
  name: string;
  specialty: string;
  city: string;
  region: string;
  street: string;
  landmark: string;
  floor: string;
  address: string;
  clinicPhone: string;
  mobile: string;
  clinicRating: number | null;
  patientDensityRating: number | null;
  interests: string[];
  visitDays: string;
  notes: string;
  location: LatLng | null;
}

const emptyForm = (): FormState => ({
  type: "DOCTOR",
  name: "",
  specialty: "",
  city: "",
  region: "",
  street: "",
  landmark: "",
  floor: "",
  address: "",
  clinicPhone: "",
  mobile: "",
  clinicRating: null,
  patientDensityRating: null,
  interests: [],
  visitDays: "",
  notes: "",
  location: null,
});

const formOf = (s: ReferralSource): FormState => ({
  type: s.type,
  name: s.name ?? "",
  specialty: s.specialty ?? "",
  city: s.city ?? "",
  region: s.region ?? "",
  street: s.street ?? "",
  landmark: s.landmark ?? "",
  floor: s.floor ?? "",
  address: s.address ?? "",
  clinicPhone: s.clinicPhone ?? "",
  mobile: s.mobile ?? "",
  clinicRating: s.clinicRating ?? null,
  patientDensityRating: s.patientDensityRating ?? null,
  interests: s.interests ?? [],
  visitDays: s.visitDays ?? "",
  notes: s.notes ?? "",
  location:
    s.latitude != null && s.longitude != null
      ? { latitude: s.latitude, longitude: s.longitude }
      : null,
});

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          // Clicking the current rating clears it — there is no other way back
          // to "not rated" once a star has been picked.
          onClick={() => onChange(value === n ? null : n)}
          className="p-0.5 transition-transform hover:scale-110"
          aria-label={`${n} من 5`}
        >
          <Star className={cn("h-5 w-5", value != null && n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
        </button>
      ))}
      <span className="ms-1 text-xs text-muted-foreground">{value ?? "—"}</span>
    </div>
  );
}

function InterestsField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const tag = draft.trim();
    if (!tag || value.includes(tag)) { setDraft(""); return; }
    onChange([...value, tag]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // Enter adds a tag instead of submitting the whole dialog form.
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="مثال: أطراف، فيزيائي..."
        />
        <Button type="button" variant="outline" size="icon" onClick={add} disabled={!draft.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pe-1">
              {tag}
              <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20" aria-label={`إزالة ${tag}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReferralSourceFormDialog({
  open,
  onOpenChange,
  source,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit mode. */
  source?: ReferralSource | null;
  onSaved?: (s: ReferralSource) => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [tab, setTab] = useState("basic");
  const create = useCreateReferralSource();
  const update = useUpdateReferralSource();
  const saving = create.isPending || update.isPending;

  // The city is stored as a plain name, so the options come from the static
  // Syrian governorate list rather than the clinic `/cities` table (which is
  // keyed by id and returns nothing on the current deployment). Any extra city
  // the API does return is appended under "أخرى" so nothing is lost.
  const { data: apiCities = [] } = useClinicCities();
  const cityGroups = (() => {
    const known = new Set(SYRIA_GOVERNORATES.flatMap((g) => g.cities));
    const extra: string[] = [];
    const push = (name?: string | null) => {
      if (name && !known.has(name) && !extra.includes(name)) extra.push(name);
    };
    for (const c of apiCities) push(c.name);
    // A city saved before it appeared in this list (or typed by hand) must still
    // show up, otherwise the trigger falls back to the placeholder and the edit
    // silently drops the value.
    push(form.city);
    return extra.length
      ? [...SYRIA_GOVERNORATES, { governorate: "أخرى", cities: extra }]
      : SYRIA_GOVERNORATES;
  })();

  // Reload the form when the dialog transitions to open, so a cancelled edit
  // never leaks into the next one — done during render rather than in an
  // effect, which would flash the previous values first.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(source ? formOf(source) : emptyForm());
      setTab("basic");
    }
  }

  const set = <K extends keyof FormState>(key: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: v }));

  const buildDto = (): CreateReferralSourceDto => {
    const text = (v: string) => (v.trim() ? v.trim() : undefined);
    return {
      type: form.type,
      name: form.name.trim(),
      // Specialty belongs to doctors only — switching away from DOCTOR must not
      // carry a stale specialty into the payload.
      specialty: form.type === "DOCTOR" ? text(form.specialty) : undefined,
      city: text(form.city),
      region: text(form.region),
      street: text(form.street),
      landmark: text(form.landmark),
      floor: text(form.floor),
      address: text(form.address),
      clinicPhone: text(form.clinicPhone),
      mobile: text(form.mobile),
      clinicRating: form.clinicRating ?? undefined,
      patientDensityRating: form.patientDensityRating ?? undefined,
      interests: form.interests.length ? form.interests : undefined,
      visitDays: text(form.visitDays),
      notes: text(form.notes),
      latitude: form.location?.latitude,
      longitude: form.location?.longitude,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const dto = buildDto();
    const saved = source
      ? await update.mutateAsync({ id: source.id, dto })
      : await create.mutateAsync(dto);
    onOpenChange(false);
    onSaved?.(saved);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{source ? "تعديل المصدر" : "إضافة مصدر إحالة"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={tab} onValueChange={setTab} dir="rtl">
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1">بيانات أساسية</TabsTrigger>
              <TabsTrigger value="address" className="flex-1">العنوان والموقع</TabsTrigger>
              <TabsTrigger value="extra" className="flex-1">التقييم والاهتمامات</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>النوع <span className="text-destructive">*</span></Label>
                  <Select value={form.type} onValueChange={(v) => set("type", v as ReferralSourceType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REFERRAL_SOURCE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{REFERRAL_SOURCE_TYPE_LABEL[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>الاسم <span className="text-destructive">*</span></Label>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)}
                    placeholder="مثال: د. أحمد الحربي" />
                </div>
                {form.type === "DOCTOR" && (
                  <div className="space-y-1.5">
                    <Label>التخصص</Label>
                    <Input value={form.specialty} onChange={(e) => set("specialty", e.target.value)}
                      placeholder="مثال: جراحة عظمية" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>هاتف العيادة</Label>
                  <Input value={form.clinicPhone} onChange={(e) => set("clinicPhone", e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>الجوال</Label>
                  <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label>أيام الزيارة</Label>
                  <Input value={form.visitDays} onChange={(e) => set("visitDays", e.target.value)}
                    placeholder="مثال: الأحد والثلاثاء" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </TabsContent>

            <TabsContent value="address" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>المدينة</Label>
                  <Select value={form.city} onValueChange={(v) => set("city", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر المدينة..." /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {cityGroups.map((g) => (
                        <SelectGroup key={g.governorate}>
                          <SelectLabel>{g.governorate}</SelectLabel>
                          {g.cities.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>المنطقة</Label>
                  <Input value={form.region} onChange={(e) => set("region", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>الشارع</Label>
                  <Input value={form.street} onChange={(e) => set("street", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>أقرب معلم</Label>
                  <Input value={form.landmark} onChange={(e) => set("landmark", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>الطابق</Label>
                  <Input value={form.floor} onChange={(e) => set("floor", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>العنوان التفصيلي</Label>
                  <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>الموقع على الخريطة</Label>
                <LocationMap value={form.location} onChange={(v) => set("location", v)} />
              </div>
            </TabsContent>

            <TabsContent value="extra" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>تقييم العيادة</Label>
                  <StarRating value={form.clinicRating} onChange={(v) => set("clinicRating", v)} />
                </div>
                <div className="space-y-1.5">
                  <Label>كثافة المرضى</Label>
                  <StarRating value={form.patientDensityRating} onChange={(v) => set("patientDensityRating", v)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>الاهتمامات</Label>
                <InterestsField value={form.interests} onChange={(v) => set("interests", v)} />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" disabled={!form.name.trim() || saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {source ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
