"use client";

// The referral source plus whatever extra field it asks for. Shared by the
// create wizard and the edit form so both send the same shape.
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers } from "@/lib/hooks/use-users";
import { ReferralSourceCombobox } from "@/components/clinic/referral-source-combobox";
import { ReferralSourceType } from "@/lib/api/clinic-referrals";
import {
  REFERRAL_SOURCES,
  REFERRAL_SOURCE_LABEL,
  REFERRAL_DETAILS_LABEL,
  ReferralSource,
  referralNeedsDetails,
  referralNeedsStaff,
} from "@/lib/clinic/referral-sources";

export interface ReferralValue {
  referralSource: ReferralSource | "";
  referralDetails: string;
  /** Set only when the name was picked from the sources directory. */
  referralSourceId: string | null;
  referralStaffId: string;
}

export function ReferralSourceFields({
  value, onChange, label = "طريقة الوصول",
}: {
  value: ReferralValue;
  onChange: (v: ReferralValue) => void;
  label?: string;
}) {
  const { data: usersData } = useUsers({ limit: 200 });
  const users: { id: string; fullName: string }[] =
    (usersData as any)?.data?.items ?? (usersData as any)?.items ?? [];

  // Switching source drops the fields the previous one owned, so a doctor's name
  // never rides along with a "friend" referral.
  const setSource = (source: ReferralSource | "") =>
    onChange({ referralSource: source, referralDetails: "", referralSourceId: null, referralStaffId: "" });

  return (
    <>
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <Select value={value.referralSource} onValueChange={(v) => setSource(v as ReferralSource)}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {REFERRAL_SOURCES.map((v) => (
              <SelectItem key={v} value={v}>{REFERRAL_SOURCE_LABEL[v]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {referralNeedsDetails(value.referralSource) && (
        <div className="space-y-1.5">
          <Label>{REFERRAL_DETAILS_LABEL[value.referralSource]}</Label>
          <ReferralSourceCombobox
            // DOCTOR / HOSPITAL / ASSOCIATION are exactly the source types the
            // referrals directory holds, so the enum value doubles as the filter.
            type={value.referralSource as ReferralSourceType}
            value={{ referralSourceId: value.referralSourceId, referralDetails: value.referralDetails }}
            onChange={(pick) => onChange({ ...value, ...pick })}
            placeholder={REFERRAL_DETAILS_LABEL[value.referralSource]}
          />
        </div>
      )}

      {referralNeedsStaff(value.referralSource) && (
        <div className="space-y-1.5">
          <Label>الموظف</Label>
          <Select
            value={value.referralStaffId}
            onValueChange={(v) => onChange({ ...value, referralStaffId: v })}
          >
            <SelectTrigger><SelectValue placeholder="اختر الموظف..." /></SelectTrigger>
            <SelectContent>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}

/** Only the fields the chosen source owns are sent. */
export const referralDto = (v: ReferralValue) => ({
  referralSource: v.referralSource || undefined,
  referralDetails: referralNeedsDetails(v.referralSource) ? v.referralDetails || undefined : undefined,
  // Sent as an explicit null (not undefined) for a freehand name, so an edit
  // that replaces a linked source with typed text clears the old link.
  referralSourceId: referralNeedsDetails(v.referralSource) ? v.referralSourceId : undefined,
  referralStaffId: referralNeedsStaff(v.referralSource) ? v.referralStaffId || undefined : undefined,
});
