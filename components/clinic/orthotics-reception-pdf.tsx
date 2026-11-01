// Client-only — imported via dynamic import() to avoid SSR issues.
// The whole orthotics reception as one VitaSyr document: every tab of the page,
// in the page's order and the reader's locale. Cairo carries real Arabic shaping,
// so the text here does not go through ar() — only the shared footer does.
import React from "react";
import { Document, Image, Page, Text, View, pdf } from "@react-pdf/renderer";
import { BORDER, BRAND, BRAND_LIGHT, MUTED, PageFooter, PageHeader, TEXT, ensureAmiriFonts, freshCairoFamily, saveBlob } from "./pdf-kit";
import { ORTHOTICS_MEASUREMENT_FIELDS, ORTHOTICS_MEASUREMENT_IMAGE } from "@/lib/clinic/orthotics-measurement-fields";
import type {
  OrthoticsMeasurement, OrthoticsMeasurementSheet, OrthoticsReception,
} from "@/lib/api/clinic-orthotics";
import {
  ACTIVITY_LEVELS, ANKLE_ROM, ASSISTIVE_DEVICES, CEREBRAL_PALSY_TYPES, DAILY_USE_SETTINGS, DEFORMITY_FLEXIBILITY,
  DEFORMITY_STATUS, DIAGNOSIS_TYPES, GAIT_PROBLEMS, HIP_ROM, KNEE_ROM, LIMB_TYPES, MOBILITY_LEVELS,
  MUSCLE_MOVEMENT_GROUPS, MUSCLE_STRENGTHS, MUSCLE_TONES, RECOMMENDED_DEVICES, SENSATIONS, SIDES, SKIN_CONDITIONS,
  TRUNK_MOVEMENTS, TRUNK_SCALE, TRUNK_SCALE_FIELDS, UPPER_LIMB_ROM,
  doctorAssessmentOf, labelOf, physioAssessmentOf, prosthetistAssessmentOf, type Options,
} from "./orthotics-labels";

type Translate = (key: string, values?: Record<string, string | number>) => string;

export interface OrthoticsPdfPatient {
  number?: string | null;
  name: string;
  dob?: string | null;
  age?: string | null;
  gender?: string | null;
  nationalId?: string | null;
  phone?: string | null;
  address?: string | null;
  height?: string | null;
  weight?: string | null;
}

export interface OrthoticsPdfData {
  reception: OrthoticsReception;
  patient: OrthoticsPdfPatient;
  practitioners: string[];
  measurements: OrthoticsMeasurement[];
  /** Each sheet's drawing as an image; a sheet missing here prints as a plain list. */
  sheetImages: Partial<Record<OrthoticsMeasurementSheet, string>>;
  t: Translate;
  rtl: boolean;
}

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const SHEET_WIDTH = 500;
const SHEET_ASPECT: Record<OrthoticsMeasurementSheet, number> = {
  BELOW_KNEE: 670 / 891, FULL_LEG: 724 / 806, FOOT_ACCESSORIES: 497 / 801,
};

const Rtl = React.createContext(true);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View>
    <View minPresenceAhead={120} style={{ backgroundColor: BRAND, paddingVertical: 4, paddingHorizontal: 10, marginTop: 12, marginBottom: 6, borderRadius: 3 }}>
      <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 11, textAlign: "center" }}>{title}</Text>
    </View>
    {children}
  </View>
);

// Long free text gets the full width; short values share a two-column grid.
const Value = ({ label, value, half }: { label: string; value?: string | number | null; half?: boolean }) => {
  const textAlign = React.useContext(Rtl) ? "right" : "left";
  return (
    <View wrap={false} style={{ width: half ? "50%" : "100%", paddingHorizontal: 4, marginBottom: 5 }}>
      <Text style={{ fontSize: 8, color: MUTED, textAlign }}>{label}</Text>
      <Text style={{ fontSize: 9.5, color: TEXT, textAlign }}>{value === 0 ? "0" : value || "—"}</Text>
    </View>
  );
};

const Grid = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: React.useContext(Rtl) ? "row-reverse" : "row", flexWrap: "wrap" }}>{children}</View>
);

// A sub-heading never stays alone at the foot of a page: it moves with its fields.
const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View wrap={false}>
    <View style={{ backgroundColor: BRAND_LIGHT, paddingVertical: 2, paddingHorizontal: 8, marginTop: 6, marginBottom: 4, borderRadius: 2 }}>
      <Text style={{ color: BRAND, fontWeight: "bold", fontSize: 9.5, textAlign: React.useContext(Rtl) ? "right" : "left" }}>{title}</Text>
    </View>
    <Grid>{children}</Grid>
  </View>
);

export const OrthoticsReceptionDoc = ({ data, fontFamily }: { data: OrthoticsPdfData; fontFamily: string }) => {
  const { reception: r, patient: p, t, rtl } = data;
  const d = doctorAssessmentOf(r);
  const ph = physioAssessmentOf(r);
  const pr = prosthetistAssessmentOf(r);

  const one = <T extends string>(options: Options<T>, v?: T | null) => (v ? t(labelOf(options, v)) : "");
  const many = <T extends string>(options: Options<T>, v?: T[] | null) =>
    (v ?? []).map((x) => t(labelOf(options, x))).join("، ");
  const sideOf = (region: string, side: string) =>
    `${t(`options.BODY_REGIONS.${region}`)} — ${t(`options.SIDES.${side}`)}`;

  const toneLines = (d.muscleToneDetails ?? []).map((e) =>
    `${sideOf(e.region, e.side)}: ${one(MUSCLE_TONES, e.tone) || "—"}${e.spasticityLevel ? ` (${t("doctor.spasticity")}: ${e.spasticityLevel})` : ""}`);
  const sensationLines = (d.sensationDetails ?? []).map((e) =>
    `${sideOf(e.region, e.side)}: ${one(SENSATIONS, e.sensation) || "—"}`);
  const previousTone = d.muscleTone
    ? `${t("doctor.previousValue")}: ${one(MUSCLE_TONES, d.muscleTone)}${d.spasticityLevel ? ` — ${t("doctor.spasticity")}: ${d.spasticityLevel}` : ""}`
    : "";
  const previousSensation = d.sensation ? `${t("doctor.previousValue")}: ${one(SENSATIONS, d.sensation)}` : "";
  const graded = (options: Options<string>, ticked?: string[] | null, grades?: Record<string, number | undefined> | null) =>
    options.filter((o) => ticked?.includes(o.value))
      .map((o) => `${t(o.label)}: ${grades?.[o.value] ?? "—"}`).join("، ");

  const counts = r.deviceUsageCounts ?? {};
  const devices = (r.recommendedDeviceTypes ?? []).map((x) =>
    `${t(labelOf(RECOMMENDED_DEVICES, x))}${counts[x] ? ` (${counts[x]})` : ""}`).join("، ");

  return (
    <Document title={`${t("page.pdfTitle")} - ${p.name}`}>
      <Rtl.Provider value={rtl}>
      <Page size="A4" style={{ fontFamily, fontSize: 10, color: TEXT, paddingTop: 82, paddingBottom: 62, paddingHorizontal: 24 }}>
        <PageHeader />
        <Text style={{ fontSize: 14, fontWeight: "bold", color: BRAND, textAlign: "center" }}>{t("page.pdfTitle")}</Text>
        <Text style={{ fontSize: 8.5, color: MUTED, textAlign: "center" }}>{fmt(r.createdAt)}</Text>

        <Section title={t("tabs.reception")}>
          <Block title={t("patient.title")}>
            <Value half label={t("patient.fullName")} value={p.name} />
            <Value half label={t("patient.number")} value={p.number} />
            <Value half label={t("patient.dob")} value={p.dob} />
            <Value half label={t("patient.age")} value={p.age} />
            <Value half label={t("patient.gender")} value={p.gender} />
            <Value half label={t("patient.nationalId")} value={p.nationalId} />
            <Value half label={t("patient.phone")} value={p.phone} />
            <Value half label={t("patient.address")} value={p.address} />
            <Value half label={t("patient.height")} value={p.height} />
            <Value half label={t("patient.weight")} value={p.weight} />
          </Block>
          <Block title={t("guardian.title")}>
            <Value half label={t("guardian.name")} value={r.guardianName} />
            <Value half label={t("guardian.relation")} value={r.guardianRelation} />
            <Value half label={t("guardian.phone")} value={r.guardianPhone} />
            <Value half label={t("page.practitioners")} value={data.practitioners.join("، ")} />
          </Block>
        </Section>

        <Section title={t("doctor.title")}>
          <Block title={t("doctor.medicalHistory")}>
            <Value label={t("doctor.diagnosis")} value={many(DIAGNOSIS_TYPES, d.diagnosisTypes)} />
            {d.cerebralPalsyType && <Value half label={t("doctor.cpType")} value={one(CEREBRAL_PALSY_TYPES, d.cerebralPalsyType)} />}
            {d.footDropCause && <Value half label={t("doctor.footDropCause")} value={d.footDropCause} />}
            {d.diagnosisOther && <Value half label={t("common.other")} value={d.diagnosisOther} />}
            <Value half label={t("doctor.injuryDate")} value={d.injuryStartDate} />
            <Value half label={t("doctor.chiefComplaint")} value={d.chiefComplaint} />
            <Value label={t("doctor.surgicalHistory")} value={d.surgicalHistory} />
            <Value label={t("doctor.familyHistory")} value={d.familyHistory} />
          </Block>
          <Block title={t("doctor.clinicalExam")}>
            <Value label={t("doctor.muscleTone")} value={[...toneLines, previousTone].filter(Boolean).join("\n")} />
            <Value label={t("doctor.sensation")} value={[...sensationLines, previousSensation].filter(Boolean).join("\n")} />
            <Value half label={t("doctor.thigh")} value={one(MUSCLE_STRENGTHS, d.thighMuscleStrength)} />
            <Value half label={t("doctor.legFoot")} value={one(MUSCLE_STRENGTHS, d.legFootMuscleStrength)} />
            <Value half label={t("doctor.forearm")} value={one(MUSCLE_STRENGTHS, d.forearmMuscleStrength)} />
            <Value half label={t("doctor.upperArm")} value={one(MUSCLE_STRENGTHS, d.upperArmMuscleStrength)} />
          </Block>
          <Block title={t("doctor.skin")}>
            <Value label={t("doctor.skin")} value={many(SKIN_CONDITIONS, d.skinConditions)} />
            {d.pressurePointsLocation && <Value label={t("doctor.pressureLocation")} value={d.pressurePointsLocation} />}
          </Block>
          <Block title={t("doctor.finalOpinion")}><Value label={t("doctor.opinion")} value={d.doctorOpinion} /></Block>
        </Section>

        <Section title={t("physio.title")}>
          <Block title={t("physio.gait")}>
            <Value half label={t("physio.mobility")} value={one(MOBILITY_LEVELS, ph.mobilityLevel)} />
            <Value half label={t("physio.assistive")} value={many(ASSISTIVE_DEVICES, ph.assistiveDevices)} />
            <Value label={t("physio.gaitProblems")} value={many(GAIT_PROBLEMS, ph.gaitProblems)} />
          </Block>
          <Block title={t("physio.rom")}>
            <Value half label={t("physio.hip")} value={one(HIP_ROM, ph.hipROM)} />
            <Value half label={t("physio.knee")} value={one(KNEE_ROM, ph.kneeROM)} />
            <Value half label={t("physio.ankle")} value={one(ANKLE_ROM, ph.ankleROM)} />
            <Value half label={t("physio.wrist")} value={one(UPPER_LIMB_ROM, ph.wristROM)} />
            <Value half label={t("physio.elbow")} value={one(UPPER_LIMB_ROM, ph.elbowROM)} />
          </Block>
          <Block title={t("physio.mmt")}>
            {MUSCLE_MOVEMENT_GROUPS.map((g) => (
              <Value key={g.label} half label={t(g.label)} value={graded(g.options, ph.muscleStrengthMovements, ph.muscleStrengthGrades)} />
            ))}
            <Value half label={t("physio.deformityFlexibility")} value={one(DEFORMITY_FLEXIBILITY, ph.deformityFlexibility)} />
            <Value half label={t("physio.deformityStatus")} value={one(DEFORMITY_STATUS, ph.deformityStatus)} />
          </Block>
          <Block title={t("physio.trunk")}>
            <Value label={t("physio.trunkStrength")} value={graded(TRUNK_MOVEMENTS, ph.trunkStrengthMovements, ph.trunkStrengthGrades)} />
            {TRUNK_SCALE_FIELDS.map((f) => (
              <Value key={f.key} half label={t(f.label)} value={one(TRUNK_SCALE, ph[f.key])} />
            ))}
          </Block>
          <Block title={t("physio.activityOpinion")}>
            <Value half label={t("physio.activity")} value={one(ACTIVITY_LEVELS, ph.activityLevel)} />
            <Value half label={t("device.hours")} value={ph.dailyWearHours} />
            <Value label={t("physio.opinion")} value={ph.physioOpinion} />
          </Block>
        </Section>

        <Section title={t("prosthetist.title")}>
          <Grid><Value label={t("prosthetist.opinion")} value={pr.prosthetistOpinion} /></Grid>
        </Section>

        <Section title={t("history.title")}>
          <Grid>
            <Value label={t("history.birth")} value={d.birthHistory} />
            <Value half label={t("doctor.appliancesCount")} value={d.appliancesCount} />
            <Value half label={t("doctor.affectedLimbType")} value={one(LIMB_TYPES, d.affectedLimbType)} />
            <Value half label={t("doctor.affectedSide")} value={one(SIDES, d.affectedSide)} />
            <Value half label={t("doctor.soundLimb")} value={d.soundLimbDescription} />
            <Value half label={t("history.previousUse")} value={d.previousOrthosisUse == null ? "" : t(`options.YES_NO.${d.previousOrthosisUse ? "YES" : "NO"}`)} />
            {d.previousOrthosisDetails && <Value half label={t("history.previousDetails")} value={d.previousOrthosisDetails} />}
            <Value label={t("history.medical")} value={d.medicalHistory} />
            <Value label={t("history.goals")} value={(d.functionalGoals ?? []).filter(Boolean).join("\n")} />
            <Value label={t("history.dailyUse")} value={[many(DAILY_USE_SETTINGS, d.dailyUseSettings), d.dailyUseOther].filter(Boolean).join(" — ")} />
          </Grid>
          <Block title={t("device.title")}>
            <Value label={t("device.type")} value={[devices, r.recommendedDeviceOther].filter(Boolean).join(" — ")} />
            <Value label={t("device.notes")} value={r.additionalNotes} />
          </Block>
        </Section>

        {data.measurements.map((m, i) => {
          const image = data.sheetImages[m.sheet];
          const fields = ORTHOTICS_MEASUREMENT_FIELDS[m.sheet] ?? [];
          const height = SHEET_WIDTH * SHEET_ASPECT[m.sheet];
          return (
            <View key={m.id} wrap={false} break={i === 0}>
              <Section title={`${t("measurement.title")} — ${t(`measurement.sheets.${m.sheet}`)}`}>
                <Grid>
                  <Value half label={t("measurement.side")} value={one(SIDES, m.side)} />
                  <Value half label={t("page.measuredOn")} value={fmt(m.examinedAt)} />
                  {m.notes && <Value label={t("measurement.notes")} value={m.notes} />}
                </Grid>
                {image ? (
                  <View style={{ position: "relative", width: SHEET_WIDTH, height, alignSelf: "center" }}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
                    <Image src={image} style={{ width: SHEET_WIDTH, height }} />
                    {fields.filter((f) => m.values?.[f.key]).map((f) => (
                      <Text
                        key={f.key}
                        style={{
                          position: "absolute",
                          left: (SHEET_WIDTH * (f.cx - f.w / 2)) / 100,
                          top: (height * (f.cy - f.h / 2)) / 100,
                          width: (SHEET_WIDTH * f.w) / 100,
                          fontSize: 8,
                          fontWeight: "bold",
                          color: BRAND,
                          backgroundColor: "#ffffff",
                          borderWidth: 0.5,
                          borderColor: BORDER,
                          textAlign: "center",
                        }}
                      >
                        {m.values[f.key]}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Grid>
                    {fields.filter((f) => m.values?.[f.key]).map((f) => (
                      <Value key={f.key} half label={f.key} value={m.values[f.key]} />
                    ))}
                  </Grid>
                )}
              </Section>
            </View>
          );
        })}

        <PageFooter fontFamily="Amiri" />
      </Page>
      </Rtl.Provider>
    </Document>
  );
};

/**
 * Draws an SVG sheet to a canvas, since react-pdf cannot read these drawings directly.
 * The drawings' input boxes are <foreignObject>s, which taint the canvas and make
 * toDataURL throw, so they are stripped first; the PDF prints the values itself.
 */
async function rasterizeSheet(sheet: OrthoticsMeasurementSheet): Promise<string | undefined> {
  let objectUrl: string | undefined;
  try {
    const source = await (await fetch(ORTHOTICS_MEASUREMENT_IMAGE[sheet])).text();
    const drawing = source.replace(/<foreignObject[\s\S]*?<\/foreignObject>/g, "");
    objectUrl = URL.createObjectURL(new Blob([drawing], { type: "image/svg+xml" }));
    const img = new window.Image();
    img.src = objectUrl;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = Math.round(1400 * SHEET_ASPECT[sheet]);
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch (e) {
    console.error("Could not draw the measurement sheet", sheet, e);
    return undefined;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export async function downloadOrthoticsReceptionPdf(data: Omit<OrthoticsPdfData, "sheetImages">): Promise<void> {
  ensureAmiriFonts();
  const fontFamily = freshCairoFamily();
  const sheets = [...new Set(data.measurements.map((m) => m.sheet))];
  const images = await Promise.all(sheets.map(rasterizeSheet));
  const sheetImages = Object.fromEntries(sheets.map((s, i) => [s, images[i]]));
  const blob = await pdf(<OrthoticsReceptionDoc data={{ ...data, sheetImages }} fontFamily={fontFamily} />).toBlob();
  saveBlob(blob, `orthotics-${data.patient.number ?? data.reception.id}.pdf`);
}
