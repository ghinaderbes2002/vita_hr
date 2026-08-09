"use client";

// The referral source plus whatever extra field it asks for. Shared by the
// create wizard and the edit form so both send the same shape.
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers } from "@/lib/hooks/use-users";
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

  // Switching source drops the field the previous one owned, so a doctor's name
  // never rides along with a "friend" referral.
  const setSource = (source: ReferralSource | "") =>
    onChange({ referralSource: source, referralDetails: "", referralStaffId: "" });

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
          <Input
            value={value.referralDetails}
            onChange={(e) => onChange({ ...value, referralDetails: e.target.value })}
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

/** Only the field the chosen source owns is sent. */
export const referralDto = (v: ReferralValue) => ({
  referralSource: v.referralSource || undefined,
  referralDetails: referralNeedsDetails(v.referralSource) ? v.referralDetails || undefined : undefined,
  referralStaffId: referralNeedsStaff(v.referralSource) ? v.referralStaffId || undefined : undefined,
});
