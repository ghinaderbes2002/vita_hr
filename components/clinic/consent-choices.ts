// The three tick-boxes printed on the Pro-002 consent form. They map one-to-one
// onto the API's DOCUMENTATION consent decisions, so the same mapping is used
// wherever the choice is offered or read back — the registration wizard, the
// edit form and the patient record.
import { ConsentDecision } from "@/lib/api/clinic-patients";

export type ConsentChoiceKey = "OFFICIAL_ONLY" | "SOCIAL_MEDIA" | "REFUSED";

export const CONSENT_CHOICES: { key: ConsentChoiceKey; decision: ConsentDecision }[] = [
  { key: "OFFICIAL_ONLY", decision: "FUNDER_ONLY" },
  { key: "SOCIAL_MEDIA",  decision: "FUNDER_AND_SOCIAL" },
  { key: "REFUSED",       decision: "REFUSED" },
];

/** Which printed choice a stored decision corresponds to, if any. */
export function consentChoiceOf(decision?: ConsentDecision | null): ConsentChoiceKey | null {
  return CONSENT_CHOICES.find((c) => c.decision === decision)?.key ?? null;
}

/** The decision to store for a given printed choice. */
export function decisionOfChoice(key: ConsentChoiceKey): ConsentDecision {
  return CONSENT_CHOICES.find((c) => c.key === key)!.decision;
}

/**
 * Value for the API's required `signedByPatient` string.
 *
 * UNCONFIRMED: the API only says it must be a string, and the name is ambiguous
 * between the signature image and the signer's name. The drawn signature is sent
 * for now because that is what the previous code meant to persist. If the API
 * turns out to want the name, change this one function — nothing else needs to.
 */
export function consentSignedByValue(signatureBase64: string, patientName: string): string {
  return signatureBase64 || patientName;
}
