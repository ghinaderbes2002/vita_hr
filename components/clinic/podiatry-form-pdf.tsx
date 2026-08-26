// Client-only — imported via dynamic import() to avoid SSR issues.
// The printed VitaFoot sheet "نموذج تقييم القدم الاحترافي", in the reader's
// locale: same wording, same order and same tick-boxes as the on-screen tab.
// One sheet per session — the reception data is the same on every copy, the
// FootBalance analysis / clinical plan / signature come from that session.
//
// react-pdf applies no bidi algorithm and breaks long Arabic lines in the wrong
// direction, so Arabic runs are pre-shaped by `ar()` and laid out word by word
// right-to-left by flexbox instead of by the text engine. Latin locales take
// the plain path: one Text node, rows running left to right.
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { ar, ensureAmiriFonts, saveBlob } from "./pdf-kit";
import {
  AffectedSide, FootSymptom, MedicalHistoryItem, PodiatrySession, VisitType,
} from "@/lib/api/clinic-podiatry";
import {
  ARCH_ARCHITECTURE, DEFORMITY_TYPE, EDEMA_TYPE, FOOTWEAR, FOOT_MEASUREMENT_KEYS,
  FormT, JACK_TEST, MAIN_CAUSE, OUTSOLE_WEAR, PAIN_CHARACTERISTIC, PAIN_LOCATION,
  PALPATION_KEYS, REARFOOT_ALIGNMENT, ROM, TOO_MANY_TOES, WALKING_LINE, labelsOf,
} from "./podiatry-session-schema";

// ── VitaFoot theme (teal), distinct from the VitaSyr reports ──────────────────
const TEAL = "#2E9CAB";
const INK = "#1f2937";
const LINE = "#9ca3af";

const s = StyleSheet.create({
  page: {
    fontFamily: "Amiri",
    fontSize: 8.5,
    color: INK,
    paddingTop: 22,
    paddingBottom: 58,
    paddingHorizontal: 26,
    backgroundColor: "#ffffff",
  },
  logoWrap: { alignItems: "center", marginBottom: 2 },
  logoText: { fontSize: 26, fontWeight: "bold", color: TEAL, letterSpacing: 0.5 },
  title: { fontSize: 13, fontWeight: "bold", color: INK, textAlign: "center", marginTop: 8, marginBottom: 8 },
  dateRow: { marginBottom: 6, gap: 3 },
  dateText: { fontSize: 8.5, color: INK },

  columns: { gap: 18 },
  col: { flex: 1 },

  // Section titles print black and bold, like the on-screen form.
  secHead: { marginTop: 8, marginBottom: 4, borderBottomWidth: 0.5, borderBottomColor: LINE, paddingBottom: 2 },
  secHeadText: { fontSize: 9.5, fontWeight: "bold", color: INK },

  fieldRow: { alignItems: "flex-end", marginBottom: 3.5, gap: 3 },
  fieldLabel: { fontSize: 8, color: INK },
  fieldValue: { fontSize: 8, color: INK, flex: 1, borderBottomWidth: 0.5, borderBottomColor: LINE, paddingBottom: 1 },

  chkRow: { alignItems: "center", gap: 4, marginBottom: 3.5 },
  box: {
    width: 8, height: 8, borderWidth: 0.8, borderColor: INK,
    justifyContent: "center", alignItems: "center",
  },
  boxOn: { backgroundColor: TEAL, borderColor: TEAL },
  tick: { fontSize: 5.5, color: "#ffffff", lineHeight: 1 },
  chkText: { fontSize: 8, color: INK },

  vasRow: { alignItems: "center", gap: 3, marginBottom: 3.5, flexWrap: "wrap" },
  vasBox: {
    width: 11, height: 10, borderWidth: 0.8, borderColor: INK,
    justifyContent: "center", alignItems: "center",
  },
  vasNum: { fontSize: 7, color: INK },
  vasNumOn: { color: "#ffffff" },

  signatureImage: { height: 26, width: 80, objectFit: "contain" },

  footer: {
    position: "absolute", bottom: 10, left: 26, right: 26,
    borderTopWidth: 1, borderTopColor: TEAL, paddingTop: 5,
    justifyContent: "space-between",
  },
  footText: { fontSize: 6.5, color: TEAL },
});

// ── Direction-aware building blocks ──────────────────────────────────────────
// Every row's direction comes from the sheet's locale, so one set of components
// prints both an RTL Arabic sheet and an LTR English or Turkish one.
interface Dir {
  rtl: boolean;
  /** The flex direction a row of this sheet runs in. */
  row: "row" | "row-reverse";
}

const Txt = ({ t: text, style, dir }: { t: string; style: Style | Style[]; dir: Dir }) => {
  if (!dir.rtl || !text) return <Text style={style}>{text}</Text>;
  // Arabic never joins across a space, so shaping word by word is lossless —
  // and it lets flexbox, not react-pdf, decide the reading order.
  return (
    <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 2.5 }}>
      {text.split(" ").filter(Boolean).map((w, i) => (
        <Text key={i} style={style}>{ar(w)}</Text>
      ))}
    </View>
  );
};

const SecHead = ({ label, dir }: { label: string; dir: Dir }) => (
  <View style={[s.secHead, { flexDirection: dir.row }]}>
    <Txt t={label} style={s.secHeadText} dir={dir} />
  </View>
);

// Children of a row-reverse row are placed right-to-left in source order, so
// the colon must be its own node AFTER the label — appended to the string it
// would render at the label's right edge instead of its left.
const Field = ({
  label, value, dir,
}: {
  label: string;
  value?: string | number | null;
  dir: Dir;
}) => {
  const v = value == null ? "" : String(value).trim();
  return (
    <View style={[s.fieldRow, { flexDirection: dir.row }]} wrap={false}>
      <Txt t={label} style={s.fieldLabel} dir={dir} />
      <Text style={[s.fieldLabel, dir.rtl ? { marginRight: -2 } : { marginLeft: -2 }]}>{":"}</Text>
      <View style={s.fieldValue}>
        <Txt t={v} style={s.fieldLabel} dir={dir} />
      </View>
    </View>
  );
};

const Box = ({ on }: { on: boolean }) => (
  <View style={on ? [s.box, s.boxOn] : s.box}>
    {on && <Text style={s.tick}>{"✓"}</Text>}
  </View>
);

const Chk = ({ on, label, dir }: { on: boolean; label: string; dir: Dir }) => (
  <View style={[s.chkRow, { flexDirection: dir.row }]} wrap={false}>
    <Box on={on} />
    <Txt t={label} style={s.chkText} dir={dir} />
  </View>
);

/** Right foot first on the Arabic sheet, left first on the Latin ones. */
const SIDE_KEYS = ["Right", "Left"] as const;

const SideHead = ({ label, dir }: { label: string; dir: Dir }) => (
  <View style={{ flexDirection: dir.row, marginTop: 2, marginBottom: 2 }}>
    <Txt t={label} style={[s.chkText, { fontWeight: "bold" }]} dir={dir} />
  </View>
);

const AFFECTED_SIDE_KEYS: AffectedSide[] = ["R", "L", "BILATERAL"];
const VISIT_TYPE_KEYS: VisitType[] = [
  "FOOT_PAIN", "FOOTBALANCE_ASSESSMENT", "CUSTOM_INSOLES",
  "PERFORMANCE_OPTIMIZATION", "FOLLOW_UP",
];
const MEDICAL_HISTORY_KEYS: MedicalHistoryItem[] = [
  "DIABETES", "HYPERTENSION", "NEUROLOGICAL", "VASCULAR", "ARTHRITIS", "OTHER",
];
const FOOT_SYMPTOM_KEYS: FootSymptom[] = [
  "PAIN", "NUMBNESS", "SWELLING", "INSTABILITY", "FATIGUE",
];

// The sheet ticks the affected side inline on one row.
const SideRow = ({ sides, t, dir }: { sides: AffectedSide[]; t: FormT; dir: Dir }) => (
  <View style={[s.fieldRow, { flexDirection: dir.row }]} wrap={false}>
    <Txt t={t("pdf.affectedFoot")} style={s.fieldLabel} dir={dir} />
    <Text style={[s.fieldLabel, dir.rtl ? { marginRight: -2 } : { marginLeft: -2 }]}>{":"}</Text>
    <View style={{ flexDirection: dir.row, gap: 8, flex: 1 }}>
      {AFFECTED_SIDE_KEYS.map((v) => (
        <View key={v} style={{ flexDirection: dir.row, alignItems: "center", gap: 3 }}>
          <Box on={sides.includes(v)} />
          <Txt t={t(`enums.affectedSide.${v}`)} style={s.chkText} dir={dir} />
        </View>
      ))}
    </View>
  </View>
);

export interface PodiatryFormPdfData {
  /** Sheet date — defaults to the session's date, else today. */
  date?: string;
  patientName?: string;
  dateOfBirth?: string | null;
  gender?: "MALE" | "FEMALE" | null;
  phone?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  occupation?: string | null;
  activities?: string | null;
  problemDescription?: string | null;
  historyOfSymptoms?: string | null;
  affectedSide?: AffectedSide[] | null;
  footSymptoms?: FootSymptom[] | null;
  visitTypes?: VisitType[] | null;
  /** Filled instead of the shared pair when both feet are affected. */
  footSymptomsRight?: FootSymptom[] | null;
  footSymptomsLeft?: FootSymptom[] | null;
  visitTypesRight?: VisitType[] | null;
  visitTypesLeft?: VisitType[] | null;
  medicalHistory?: MedicalHistoryItem[] | null;
  medicalHistoryOther?: string | null;
  vasScore?: number | null;
  /** The session this sheet is for; its analysis fills the left column. */
  session?: PodiatrySession | null;
  /** Both live on the reception, each on its own endpoint. */
  reviews?: string[];
  doctorDecision?: string | null;
}

const d = (v?: string | null) => (v ? new Date(v).toLocaleDateString("en-GB") : "");

const PodiatryFormPdfDoc = ({
  data, t, dir,
}: {
  data: PodiatryFormPdfData;
  t: FormT;
  dir: Dir;
}) => {
  const se = data.session;
  const sub = se?.subjectiveHistory ?? {};
  const vis = se?.visualInspection ?? {};
  const pal = se?.palpation ?? {};
  const rom = se?.rangeOfMotion ?? {};
  const dyn = se?.dynamicAnalysis ?? {};
  const shoe = se?.shoeWearPattern ?? {};
  const meas = (se?.footMeasurements ?? {}) as Record<string, string | undefined>;

  // The VAS lives on the assessment now; older receptions still carry their own.
  const vasScore = Number(sub.vasScore) || data.vasScore || 0;

  const sep = dir.rtl ? "، " : ", ";
  const list = <T extends string>(o: Parameters<typeof labelsOf<T>>[1], vs?: readonly string[] | null) =>
    labelsOf(t, o, vs, sep);

  // Every per-foot finding prints on one line, right foot first like the sheet.
  const pair = (r?: string, l?: string) =>
    [r ? `${t("pdf.right")}: ${r}` : "", l ? `${t("pdf.left")}: ${l}` : ""]
      .filter(Boolean).join("   —   ");

  const measRows = FOOT_MEASUREMENT_KEYS
    .map((k) => [k, pair(meas[`${k}Right`], meas[`${k}Left`])] as const)
    .filter(([, v]) => v);

  // Both feet affected → the symptoms and the visit types print per foot.
  const bilateral = (data.affectedSide ?? []).includes("BILATERAL");

  const sig = se?.clinicianSignature ?? "";
  const sigIsImage = sig.startsWith("data:") || sig.startsWith("http");

  const sideLabel = (side: "Right" | "Left") =>
    t(side === "Right" ? "labels.rightFoot" : "labels.leftFoot");

  return (
    <Document>
      <Page size="A4" style={[s.page, { direction: dir.rtl ? "rtl" : "ltr" }]}>
        {/* Masthead — text stand-in for the VitaFoot logo until the artwork is supplied. */}
        <View style={s.logoWrap}>
          <Text style={s.logoText}>VitaFoot</Text>
        </View>
        <View style={{ alignItems: "center", marginTop: 8, marginBottom: 8 }}>
          <Txt t={t("pdf.title")} style={s.title} dir={dir} />
        </View>

        <View style={[s.dateRow, { flexDirection: dir.row }]}>
          <Txt t={t("pdf.date")} style={s.dateText} dir={dir} />
          <Text style={[s.dateText, dir.rtl ? { marginRight: -2 } : { marginLeft: -2 }]}>{":"}</Text>
          <Text style={s.dateText}>{d(data.date) || new Date().toLocaleDateString("en-GB")}</Text>
        </View>

        <View style={[s.columns, { flexDirection: dir.row }]}>
          {/* ── Leading column ───────────────────────────────────────────── */}
          <View style={s.col}>
            <SecHead label={t("pdf.personalInfo")} dir={dir} />
            <Field label={t("pdf.patientName")} value={data.patientName} dir={dir} />
            <Field label={t("pdf.dateOfBirth")} value={d(data.dateOfBirth)} dir={dir} />
            <Field
              label={t("pdf.gender")}
              value={data.gender === "MALE" ? t("pdf.male") : data.gender === "FEMALE" ? t("pdf.female") : ""}
              dir={dir}
            />
            <Field label={t("pdf.phone")} value={data.phone} dir={dir} />
            <Field label={t("pdf.height")} value={data.heightCm ?? ""} dir={dir} />
            <Field label={t("pdf.weight")} value={data.weightKg ?? ""} dir={dir} />
            <Field label={t("pdf.occupation")} value={data.occupation} dir={dir} />
            <Field label={t("pdf.activities")} value={data.activities} dir={dir} />

            <SecHead label={t("pdf.chiefComplaint")} dir={dir} />
            <Field label={t("pdf.problemDesc")} value={data.problemDescription} dir={dir} />
            <Field label={t("pdf.symptomHistory")} value={data.historyOfSymptoms} dir={dir} />
            <SideRow sides={data.affectedSide ?? []} t={t} dir={dir} />

            <SecHead label={t("pdf.footSymptoms")} dir={dir} />
            {bilateral ? (
              SIDE_KEYS.map((side) => (
                <View key={side} wrap={false}>
                  <SideHead label={sideLabel(side)} dir={dir} />
                  {FOOT_SYMPTOM_KEYS.map((v) => (
                    <Chk
                      key={v}
                      on={((side === "Right" ? data.footSymptomsRight : data.footSymptomsLeft) ?? []).includes(v)}
                      label={t(`enums.footSymptom.${v}`)}
                      dir={dir}
                    />
                  ))}
                </View>
              ))
            ) : (
              FOOT_SYMPTOM_KEYS.map((v) => (
                <Chk key={v} on={(data.footSymptoms ?? []).includes(v)} label={t(`enums.footSymptom.${v}`)} dir={dir} />
              ))
            )}
          </View>

          {/* ── Trailing column ──────────────────────────────────────────── */}
          <View style={s.col}>
            <SecHead label={t("pdf.visitType")} dir={dir} />
            {bilateral ? (
              SIDE_KEYS.map((side) => (
                <View key={side} wrap={false}>
                  <SideHead label={sideLabel(side)} dir={dir} />
                  {VISIT_TYPE_KEYS.map((v) => (
                    <Chk
                      key={v}
                      on={((side === "Right" ? data.visitTypesRight : data.visitTypesLeft) ?? []).includes(v)}
                      label={t(`enums.visitType.${v}`)}
                      dir={dir}
                    />
                  ))}
                </View>
              ))
            ) : (
              VISIT_TYPE_KEYS.map((v) => (
                <Chk key={v} on={(data.visitTypes ?? []).includes(v)} label={t(`enums.visitType.${v}`)} dir={dir} />
              ))
            )}

            <SecHead label={t("pdf.medicalHistory")} dir={dir} />
            {MEDICAL_HISTORY_KEYS.map((v) => (
              <Chk key={v} on={(data.medicalHistory ?? []).includes(v)} label={t(`enums.medicalHistory.${v}`)} dir={dir} />
            ))}
            {data.medicalHistoryOther && (
              <Field label={t("pdf.details")} value={data.medicalHistoryOther} dir={dir} />
            )}

            <SecHead label={t("pdf.painScale")} dir={dir} />
            <View style={[s.vasRow, { flexDirection: dir.row }]}>
              <Txt t={t("pdf.painScore")} style={s.chkText} dir={dir} />
              <Text style={[s.chkText, dir.rtl ? { marginRight: -2 } : { marginLeft: -2 }]}>{":"}</Text>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <View key={n} style={vasScore === n ? [s.vasBox, s.boxOn] : s.vasBox}>
                  <Text style={vasScore === n ? [s.vasNum, s.vasNumOn] : s.vasNum}>{n}</Text>
                </View>
              ))}
            </View>

            <SecHead label={t("pdf.signature")} dir={dir} />
            <Field label={t("pdf.clinicianName")} value={se?.clinicianName} dir={dir} />
            <Field label={t("pdf.filledBy")} value={se?.createdByName} dir={dir} />
            <Field label={t("pdf.installedOn")} value={d(se?.installedAt)} dir={dir} />
            <View style={[s.fieldRow, { flexDirection: dir.row }]} wrap={false}>
              <Txt t={t("pdf.signature")} style={s.fieldLabel} dir={dir} />
              <Text style={[s.fieldLabel, dir.rtl ? { marginRight: -2 } : { marginLeft: -2 }]}>{":"}</Text>
              <View style={s.fieldValue}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an <img> */}
                {sigIsImage ? <Image src={sig} style={s.signatureImage} /> : <Txt t={sig} style={s.fieldLabel} dir={dir} />}
              </View>
            </View>
          </View>
        </View>

        {/* The assessment, printed full width under the two columns. */}
        <SecHead label={t("sections.subjective")} dir={dir} />
        <Field label={t("labels.mainCause")} value={list(MAIN_CAUSE, sub.mainCause)} dir={dir} />
        <Field label={t("labels.painLocation")} value={list(PAIN_LOCATION, sub.painLocation)} dir={dir} />
        <Field label={t("labels.painNature")} value={list(PAIN_CHARACTERISTIC, sub.painCharacteristics)} dir={dir} />

        <SecHead label={t("sections.visual")} dir={dir} />
        <Field label={t("labels.rearfootAlignment")} dir={dir} value={pair(
          list(REARFOOT_ALIGNMENT, vis.rightRearfootAlignment),
          list(REARFOOT_ALIGNMENT, vis.leftRearfootAlignment),
        )} />
        <Field label={t("labels.tooManyToes")} dir={dir} value={pair(
          [list(TOO_MANY_TOES, vis.rightTooManyToes), vis.rightTooManyToesCount].filter(Boolean).join(" "),
          [list(TOO_MANY_TOES, vis.leftTooManyToes), vis.leftTooManyToesCount].filter(Boolean).join(" "),
        )} />
        <Field label={t("labels.archArchitecture")} dir={dir} value={pair(
          list(ARCH_ARCHITECTURE, vis.rightArchArchitecture),
          list(ARCH_ARCHITECTURE, vis.leftArchArchitecture),
        )} />
        <Chk on={!!vis.halluxValgus} label={t("findings.halluxValgus")} dir={dir} />
        {vis.halluxValgus && vis.halluxValgusType?.length ? (
          <Field label={t("labels.type")} value={list(DEFORMITY_TYPE, vis.halluxValgusType)} dir={dir} />
        ) : null}
        <Chk on={!!vis.tailorsBunion} label={t("findings.tailorsBunion")} dir={dir} />
        {vis.tailorsBunion && vis.tailorsBunionType?.length ? (
          <Field label={t("labels.type")} value={list(DEFORMITY_TYPE, vis.tailorsBunionType)} dir={dir} />
        ) : null}
        <Chk on={!!vis.hammerToes} label={t("findings.hammerToes")} dir={dir} />
        {vis.hammerToes && vis.hammerToesAffected ? (
          <Field label={t("labels.affectedToes")} value={vis.hammerToesAffected} dir={dir} />
        ) : null}
        <Chk on={!!vis.clawToes} label={t("findings.clawToes")} dir={dir} />
        {vis.clawToes && vis.clawToesAffected ? (
          <Field label={t("labels.affectedToes")} value={vis.clawToesAffected} dir={dir} />
        ) : null}
        <Chk on={!!vis.malletToes} label={t("findings.malletToes")} dir={dir} />
        {vis.malletToes && vis.malletToesAffected ? (
          <Field label={t("labels.affectedToes")} value={vis.malletToesAffected} dir={dir} />
        ) : null}
        <Chk on={!!vis.hyperkeratosisCallus} label={t("findings.hyperkeratosis")} dir={dir} />
        {vis.hyperkeratosisCallus && vis.hyperkeratosisLocation ? (
          <Field label={t("labels.location")} value={vis.hyperkeratosisLocation} dir={dir} />
        ) : null}
        <Chk on={!!vis.preTrophicLesions} label={t("findings.preUlcerative")} dir={dir} />
        {vis.preTrophicLesions && vis.preTrophicLesionsNotes ? (
          <Field label={t("labels.notes")} value={vis.preTrophicLesionsNotes} dir={dir} />
        ) : null}
        <Chk on={!!vis.edema} label={t("findings.edema")} dir={dir} />
        {vis.edema && vis.edemaType?.length ? (
          <Field label={t("labels.type")} value={list(EDEMA_TYPE, vis.edemaType)} dir={dir} />
        ) : null}

        <SecHead label={t("sections.palpation")} dir={dir} />
        <View style={{ marginBottom: 3, flexDirection: dir.row }}>
          <Txt t={t("labels.palpationHint")} style={s.chkText} dir={dir} />
        </View>
        {PALPATION_KEYS.map((k) => (
          <Chk key={k} on={!!pal[k]} label={t(`palpation.${k}`)} dir={dir} />
        ))}

        <SecHead label={t("sections.rom")} dir={dir} />
        <Field label={t("labels.ankleDorsiflexion")} value={list(ROM, rom.ankleDorsiflexion)} dir={dir} />
        <Field label={t("labels.anklePlantarflexion")} value={list(ROM, rom.anklePlantarflexion)} dir={dir} />

        <SecHead label={t("sections.dynamic")} dir={dir} />
        <Field label={t("labels.jackTest")} dir={dir} value={pair(
          list(JACK_TEST, dyn.rightJackTest),
          list(JACK_TEST, dyn.leftJackTest),
        )} />
        <Field label={t("labels.walkingLine")} dir={dir} value={pair(
          list(WALKING_LINE, dyn.rightWalkingLine),
          list(WALKING_LINE, dyn.leftWalkingLine),
        )} />

        <SecHead label={t("sections.shoe")} dir={dir} />
        <Field label={t("labels.currentFootwear")} value={list(FOOTWEAR, shoe.currentFootwear)} dir={dir} />
        <Field label={t("labels.outsoleWear")} value={list(OUTSOLE_WEAR, shoe.outsoleWear)} dir={dir} />

        {measRows.length > 0 && (
          <>
            <SecHead label={t("sections.measurements")} dir={dir} />
            {measRows.map(([k, v]) => (
              <Field key={k} label={t(`measurements.${k}`)} value={v} dir={dir} />
            ))}
          </>
        )}

        <SecHead label={t("pdf.insoleDecision")} dir={dir} />
        <Field label={t("labels.insoleType")} value={(se?.insoleType ?? []).join(" / ")} dir={dir} />
        <Field label={t("labels.notes")} value={se?.notes} dir={dir} />
        {(data.reviews ?? []).length > 0 ? (
          (data.reviews ?? []).map((r, i) => (
            <Field key={i} label={`${t("pdf.review")} ${i + 1}`} value={r} dir={dir} />
          ))
        ) : (
          <Field label={t("pdf.review")} value="" dir={dir} />
        )}
        <Field label={t("pdf.doctorDecision")} value={data.doctorDecision} dir={dir} />

        <Footer dir={dir} />
      </Page>
    </Document>
  );
};

// Shared footer used on every sheet. The address is the clinic's own, so it
// stays Arabic whatever the sheet's locale is.
const Footer = ({ dir }: { dir: Dir }) => (
  <View style={[s.footer, { flexDirection: dir.row }]} fixed>
    <View style={{ alignItems: "flex-end", gap: 1.5 }}>
      <Text style={s.footText}>{ar("سوريا - حلب - حي حلب الجديدة شمالي")}</Text>
      <Text style={s.footText}>{ar("خلف فيلا العقاد - شارع إيكاردا")}</Text>
    </View>
    <View style={{ alignItems: "center", gap: 1.5 }}>
      <Text style={s.footText}>vitafoot@vitaxir.com</Text>
    </View>
    <View style={{ alignItems: "flex-start", gap: 1.5 }}>
      <Text style={s.footText}>MOB: +963 935 813 333</Text>
      <Text style={s.footText}>TEL: +963 21 522 6391  |  FAX: +963 21 522 6392</Text>
    </View>
  </View>
);

// ── Public export ────────────────────────────────────────────────────────────
/**
 * @param t      a translator scoped to `clinic.podiatry.form`
 * @param locale the sheet's locale — only Arabic prints right-to-left
 */
export async function downloadPodiatryFormPdf(
  data: PodiatryFormPdfData,
  t: FormT,
  locale: string,
): Promise<void> {
  ensureAmiriFonts();
  const rtl = locale === "ar";
  const dir: Dir = { rtl, row: rtl ? "row-reverse" : "row" };
  const blob = await pdf(<PodiatryFormPdfDoc data={data} t={t} dir={dir} />).toBlob();
  const tag = (data.patientName ?? "").trim().replace(/\s+/g, "-") || "patient";
  saveBlob(blob, `footbalance-${tag}.pdf`);
}
