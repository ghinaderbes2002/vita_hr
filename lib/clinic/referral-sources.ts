// How the patient reached the clinic. Some sources carry an extra field: a free
// text name (doctor / hospital / association) or a staff member id.
export const REFERRAL_SOURCES = [
  "SOCIAL_MEDIA",
  "DOCTOR",
  "HOSPITAL",
  "ASSOCIATION",
  "FRIEND",
  "STAFF",
] as const;

export type ReferralSource = (typeof REFERRAL_SOURCES)[number];

export const REFERRAL_SOURCE_LABEL: Record<ReferralSource, string> = {
  SOCIAL_MEDIA: "وسائل التواصل",
  DOCTOR:       "طبيب",
  HOSPITAL:     "مشفى",
  ASSOCIATION:  "جمعية",
  FRIEND:       "صديق",
  STAFF:        "كادر العمل",
};

/** Sources that ask for a name in referralDetails, and what to call that field. */
export const REFERRAL_DETAILS_LABEL: Partial<Record<ReferralSource, string>> = {
  DOCTOR:      "اسم الطبيب",
  HOSPITAL:    "اسم المشفى",
  ASSOCIATION: "اسم الجمعية",
};

export const referralNeedsDetails = (s?: string | null): s is ReferralSource =>
  !!s && s in REFERRAL_DETAILS_LABEL;

export const referralNeedsStaff = (s?: string | null) => s === "STAFF";

/** Values retired when the enum changed — kept so old records still read right. */
const LEGACY_LABEL: Record<string, string> = {
  SELF: "نفسه",
  RELATIVES: "أقارب",
  MEDICAL_REFERRAL: "إحالة طبية",
  OTHER: "أخرى",
};

export const referralSourceLabel = (s?: string | null): string | null =>
  s ? (REFERRAL_SOURCE_LABEL[s as ReferralSource] ?? LEGACY_LABEL[s] ?? s) : null;

/** A stored value the dropdown no longer offers must be re-picked, not resent. */
export const asCurrentReferralSource = (s?: string | null): ReferralSource | "" =>
  REFERRAL_SOURCES.includes(s as ReferralSource) ? (s as ReferralSource) : "";
