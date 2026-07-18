// Client-only — imported via dynamic import() to avoid SSR issues.
// Full Prosthetics Case Report in the shared VitaSyr PDF style (see pdf-kit.tsx).
// Replaces the plain backend-generated report with a branded, Arabic document.
import React from "react";
import { Document, Page, Text, View, pdf } from "@react-pdf/renderer";
import {
  S, TEXT, MUTED,
  ar, PageHeader, PageFooter, SecHead, F, Bool, InfoGrid,
  ensureAmiriFonts, saveBlob,
} from "./pdf-kit";

// ── Label maps ───────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  INTAKE: "استقبال", ASSESSMENT: "تقييم", COMMITTEE_REVIEW: "مراجعة اللجنة",
  COMMITTEE_APPROVED: "اعتمدت اللجنة", FITTING: "تركيب", GAIT_ANALYSIS: "تحليل مشي",
  FINAL_EVALUATION: "تقييم نهائي", DELIVERED: "تم التسليم", FOLLOW_UP: "متابعة",
  CLOSED: "مغلقة", CANCELLED: "ملغاة",
};
const TYPE_LABEL: Record<string, string> = { UPPER: "طرف علوي", LOWER: "طرف سفلي", BOTH: "علوي وسفلي" };
const SIDE_LABEL: Record<string, string> = { RIGHT: "أيمن", LEFT: "أيسر", BILATERAL: "ثنائي" };
const DECISION_LABEL: Record<string, string> = {
  APPROVED: "مقبول", NEEDS_ADJUSTMENT: "يحتاج تعديل", REJECTED: "مرفوض",
};
const PROSTHETIC_TYPE_LABEL: Record<string, string> = {
  BIONIC: "بيوني", MYOBOCK: "ميوبوك", MECHANIC: "ميكانيكي", COSMETIC: "تجميلي",
};
const CAUSE_LABEL: Record<string, string> = {
  WAR_INJURY: "إصابة حرب", TRAFFIC_ACCIDENT: "حادث سير", DIABETES: "مضاعفات السكري",
  VASCULAR_DISEASE: "مرض وعائي", CONGENITAL: "خلقي", INFECTION: "التهاب / إنتان",
  TUMOR: "ورم", WORK_INJURY: "إصابة عمل", OTHER: "أخرى",
};
const LENGTH_LABEL: Record<string, string> = {
  LONG: "طويل", MEDIUM: "متوسط", SHORT: "قصير", VERY_SHORT: "قصير جداً",
};
const SHAPE_LABEL: Record<string, string> = {
  BONY: "عظمي", SOFT: "طري", NORMAL: "طبيعي", CONICAL_BONY: "مخروطي عظمي", CONICAL_SOFT: "مخروطي طري",
};
const SOURCE_LOCATION_LABEL: Record<string, string> = {
  WAREHOUSE: "مستودع", EXTERNAL: "خارجي", PATIENT_OWNED: "ملك المريض", OTHER: "أخرى", SUPPLIER: "مورد",
};
const REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING: "معلق", APPROVED: "معتمد", DONE: "تم", NOT_AVAILABLE: "لا يوجد",
};

const lbl = (map: Record<string, string>, v?: string | null) => (v ? map[v] ?? v : "");

// ── Data types ───────────────────────────────────────────────────────────────────
export interface CasePdfAssessment {
  region: string;            // "طرف علوي" / "طرف سفلي"
  side?: string | null;
  residualLimbLength?: string | null;
  residualLimbShape?: string | null;
  activityLevel?: string | null;  // K-level
  painPresent?: boolean | null;
  painIntensity?: number | null;
  examinedAt?: string | null;
  notes?: string | null;
}
export interface CasePdfComponent {
  partName?: string | null; partCode?: string | null;
  sourceLocation?: string | null; supplier?: string | null;
  reason?: string | null; requestStatus?: string | null;
}
export interface CasePdfGaitItem { sessionDate?: string | null; mainProblem?: string | null; symmetry?: string | null }
export interface CasePdfData {
  patient: {
    firstName?: string; lastName?: string; patientNumber?: string;
    dateOfBirth?: string; gender?: string; phone?: string;
    heightCm?: number | string | null; weightKg?: number | string | null; bmi?: number | string | null;
  };
  caseId: string;
  status?: string | null;
  createdAt?: string | null;
  amputation: {
    types: string[]; side?: string | null; level?: string | null; date?: string | null;
    cause?: string | null; causeOther?: string | null; count?: number | string | null;
  };
  currentlyUsingProsthesis?: boolean | null;
  previouslyUsedProsthesis?: boolean | null;
  previousProsthesisSystemDetail?: string | null;
  clinical: {
    hasChronicDiseases?: boolean | null; chronicDiseases?: string | null;
    hasPhysicalTherapy?: boolean | null; physicalTherapyDetails?: string | null;
    hasPreviousProsthesis?: boolean | null; previousProsthesisDetails?: string | null;
    previousProsthesisWhen?: string | null; previousProsthesisWhere?: string | null;
    previousProsthesisType?: string | null;
    hasRevisionSurgery?: boolean | null; revisionDetails?: string | null;
  };
  team: { prosthetist?: string; physiotherapist?: string; supervisingDoctor?: string; workshopSupervisor?: string };
  assessments: CasePdfAssessment[];
  committee?: {
    prosthetistOpinion?: string | null; physiotherapistOpinion?: string | null;
    doctorOpinion?: string | null; committeeHeadOpinion?: string | null; expertOpinion?: string | null;
    finalDecision?: string | null; finalSummary?: string | null;
  } | null;
  proposed: {
    proposedProstheticType?: string | null; prosthesisType?: string | null;
    prosthesisCompleted?: boolean | null; prosthesisSuitable?: boolean | null;
    proposedProsthesisType?: string | null;
  };
  components: CasePdfComponent[];
  gait: CasePdfGaitItem[];
  finalEval?: {
    residualLimbCondition?: string | null; suspensionSystemUsed?: string | null;
    socksDelivered?: number | null; linersDelivered?: number | null; fittingDate?: string | null;
    physioOpinion?: string | null; departmentHeadOpinion?: string | null;
    prosthetistOpinion?: string | null; committeeHeadOpinion?: string | null; expertOpinion?: string | null;
    readyForDelivery?: boolean | null; needsFollowUp?: boolean | null; followUpPlan?: string | null;
    generalNotes?: string | null;
  } | null;
  followUps: { date?: string | null; notes?: string | null; kLevel?: string | null; painLevel?: number | null }[];
}

const dt = (v?: string | null) => (v ? new Date(v).toLocaleDateString("en-GB") : "—");
const numOrDash = (v: unknown) => (v !== "" && v != null ? String(v) : "—");

// Long free-text block (opinions, summaries) — wraps naturally.
const Para = ({ label, value }: { label?: string; value?: string | null }) => {
  const v = (value ?? "").trim();
  if (!v) return null;
  return (
    <View style={{ marginBottom: 4 }}>
      {label && <Text style={{ fontSize: 8.5, color: TEXT, marginBottom: 1, textAlign: "right", fontWeight: "bold" }}>{ar(label)}</Text>}
      <Text style={S.fieldValue}>{ar(v)}</Text>
    </View>
  );
};

// ── PDF Document ─────────────────────────────────────────────────────────────────
const ProstheticsCasePdfDoc = ({ data, age }: { data: CasePdfData; age: string }) => {
  const p = data.patient;
  const fullName = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "—";
  const gender = p.gender === "MALE" ? "ذكر" : p.gender === "FEMALE" ? "أنثى" : "—";
  const ampTypes = data.amputation.types.map((tt) => TYPE_LABEL[tt] ?? tt).join(" / ") || "—";
  const c = data.committee;
  const committeeHasContent = !!c && (c.prosthetistOpinion || c.physiotherapistOpinion || c.doctorOpinion ||
    c.committeeHeadOpinion || c.expertOpinion || c.finalDecision || c.finalSummary);
  const fe = data.finalEval;
  const feHasContent = !!fe && Object.values(fe).some((v) => v != null && v !== "");

  return (
    <Document title={`تقرير حالة أطراف صناعية — ${fullName}`} author="Vita HR System" language="ar">
      <Page size="A4" style={S.page}>
        <PageHeader />
        <PageFooter />

        {/* ── معلومات المريض ── */}
        <SecHead label="تقرير حالة الأطراف الصناعية" />
        <InfoGrid
          items={[
            { label: "اسم المريض", value: fullName },
            { label: "رقم تعريف المريض", value: p.patientNumber || "—" },
            { label: "العمر", value: age },
            { label: "الجنس", value: gender },
            { label: "رقم الهاتف", value: p.phone || "—" },
            { label: "تاريخ الميلاد", value: dt(p.dateOfBirth) },
            { label: "الطول", value: p.heightCm ? `${p.heightCm} cm` : "—" },
            { label: "الوزن", value: p.weightKg ? `${p.weightKg} kg` : "—" },
            { label: "مؤشر الكتلة", value: p.bmi ? Number(p.bmi).toFixed(1) : "—" },
          ]}
        />

        {/* ── معلومات الحالة ── */}
        <SecHead label="معلومات الحالة" />
        <View style={{ flexDirection: "row-reverse", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <F label="حالة الملف" value={lbl(STATUS_LABEL, data.status)} />
            <F label="تاريخ الإنشاء" value={dt(data.createdAt)} />
            <F label="نوع البتر" value={ampTypes} />
            <F label="جهة البتر" value={lbl(SIDE_LABEL, data.amputation.side)} />
          </View>
          <View style={{ flex: 1 }}>
            <F label="مستوى البتر" value={data.amputation.level} />
            <F label="تاريخ البتر" value={dt(data.amputation.date)} />
            <F label="سبب البتر" value={lbl(CAUSE_LABEL, data.amputation.cause)} />
            <F label="عدد عمليات البتر" value={numOrDash(data.amputation.count)} />
          </View>
        </View>
        {data.amputation.causeOther && <F label="تفاصيل سبب البتر" value={data.amputation.causeOther} />}
        <Bool label="يستخدم طرفاً صناعياً حالياً" value={data.currentlyUsingProsthesis} />
        <Bool label="استخدم طرفاً صناعياً سابقاً" value={data.previouslyUsedProsthesis} />
        {data.previousProsthesisSystemDetail && <F label="تفاصيل النظام السابق" value={data.previousProsthesisSystemDetail} />}

        {/* ── الفريق الطبي ── */}
        <SecHead label="الفريق الطبي" />
        <F label="أخصائي الأطراف الصناعية" value={data.team.prosthetist} />
        <F label="أخصائي العلاج الفيزيائي" value={data.team.physiotherapist} />
        <F label="الطبيب المشرف" value={data.team.supervisingDoctor} />
        {data.team.workshopSupervisor && <F label="مشرف الورشة" value={data.team.workshopSupervisor} />}

        {/* ── السوابق السريرية ── */}
        <SecHead label="السوابق السريرية" break />
        <Bool label="أمراض مزمنة" value={data.clinical.hasChronicDiseases} />
        {data.clinical.chronicDiseases && <F label="التفاصيل" value={data.clinical.chronicDiseases} />}
        <Bool label="خضع لعلاج فيزيائي" value={data.clinical.hasPhysicalTherapy} />
        {data.clinical.physicalTherapyDetails && <F label="التفاصيل" value={data.clinical.physicalTherapyDetails} />}
        <Bool label="طرف صناعي سابق" value={data.clinical.hasPreviousProsthesis} />
        {data.clinical.previousProsthesisDetails && <F label="تفاصيل الطرف السابق" value={data.clinical.previousProsthesisDetails} />}
        {data.clinical.previousProsthesisWhen && <F label="متى" value={data.clinical.previousProsthesisWhen} />}
        {data.clinical.previousProsthesisWhere && <F label="أين" value={data.clinical.previousProsthesisWhere} />}
        {data.clinical.previousProsthesisType && <F label="نوع الطرف السابق" value={data.clinical.previousProsthesisType} />}
        <Bool label="عملية مراجعة / تعديل جراحي" value={data.clinical.hasRevisionSurgery} />
        {data.clinical.revisionDetails && <F label="تفاصيل التعديل الجراحي" value={data.clinical.revisionDetails} />}

        {/* ── التقييم ── */}
        <SecHead label="التقييم" break />
        {data.assessments.length === 0 ? (
          <Text style={S.note}>{ar("لا يوجد تقييم مسجّل")}</Text>
        ) : (
          <View style={S.table}>
            <View style={S.tableHeaderRow} fixed>
              <Text style={[S.tableCellHead, { flex: 1.2 }]}>{ar("الطرف")}</Text>
              <Text style={[S.tableCellHead, { flex: 0.8 }]}>{ar("الجهة")}</Text>
              <Text style={[S.tableCellHead, { flex: 1 }]}>{ar("طول الجذمور")}</Text>
              <Text style={[S.tableCellHead, { flex: 1 }]}>{ar("شكل الجذمور")}</Text>
              <Text style={[S.tableCellHead, { flex: 0.9 }]}>{ar("مستوى النشاط")}</Text>
              <Text style={[S.tableCellHead, { flex: 0.8 }]}>{ar("الألم")}</Text>
              <Text style={[S.tableCellHead, { flex: 1 }]}>{ar("التاريخ")}</Text>
            </View>
            {data.assessments.map((a, i) => (
              <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
                <Text style={[S.tableCell, { flex: 1.2 }]}>{ar(a.region)}</Text>
                <Text style={[S.tableCell, { flex: 0.8 }]}>{ar(lbl(SIDE_LABEL, a.side)) || "—"}</Text>
                <Text style={[S.tableCell, { flex: 1 }]}>{ar(lbl(LENGTH_LABEL, a.residualLimbLength)) || "—"}</Text>
                <Text style={[S.tableCell, { flex: 1 }]}>{ar(lbl(SHAPE_LABEL, a.residualLimbShape)) || "—"}</Text>
                <Text style={[S.tableCell, { flex: 0.9 }]}>{a.activityLevel || "—"}</Text>
                <Text style={[S.tableCell, { flex: 0.8 }]}>
                  {a.painPresent ? (a.painIntensity != null ? `${a.painIntensity}/10` : ar("نعم")) : ar("لا")}
                </Text>
                <Text style={[S.tableCell, { flex: 1 }]}>{dt(a.examinedAt)}</Text>
              </View>
            ))}
          </View>
        )}
        {data.assessments.filter((a) => a.notes).map((a, i) => (
          <F key={i} label={`ملاحظات — ${a.region}${a.side ? ` (${lbl(SIDE_LABEL, a.side)})` : ""}`} value={a.notes} />
        ))}

        {/* ── مراجعة اللجنة ── */}
        <SecHead label="مراجعة اللجنة" break />
        {!committeeHasContent ? (
          <Text style={S.note}>{ar("لم تُسجّل مراجعة اللجنة بعد")}</Text>
        ) : (
          <>
            <Para label="رأي أخصائي الأطراف الصناعية" value={c?.prosthetistOpinion} />
            <Para label="رأي أخصائي العلاج الفيزيائي" value={c?.physiotherapistOpinion} />
            <Para label="رأي الطبيب" value={c?.doctorOpinion} />
            <Para label="رأي رئيس اللجنة" value={c?.committeeHeadOpinion} />
            <Para label="رأي الخبير" value={c?.expertOpinion} />
            {c?.finalDecision && (
              <View style={S.divider} />
            )}
            {c?.finalDecision && <F label="قرار اللجنة النهائي" value={lbl(DECISION_LABEL, c.finalDecision)} />}
            <Para label="الملخص النهائي" value={c?.finalSummary} />
          </>
        )}

        {/* ── الطرف الصناعي المقترح ── */}
        <SecHead label="الطرف الصناعي المقترح" />
        <F label="النوع المقترح" value={lbl(PROSTHETIC_TYPE_LABEL, data.proposed.proposedProstheticType)} />
        <F label="النوع المعتمد" value={lbl(PROSTHETIC_TYPE_LABEL, data.proposed.prosthesisType)} />
        {data.proposed.proposedProsthesisType && <F label="وصف النوع المقترح" value={data.proposed.proposedProsthesisType} />}
        <Bool label="اكتمل تصنيع الطرف" value={data.proposed.prosthesisCompleted} />
        <Bool label="الطرف مناسب للمريض" value={data.proposed.prosthesisSuitable} />

        {/* ── المكوّنات ── */}
        <SecHead label="المكوّنات" break />
        {data.components.length === 0 ? (
          <Text style={S.note}>{ar("لا توجد مكوّنات مسجّلة")}</Text>
        ) : (
          <View style={S.table}>
            <View style={S.tableHeaderRow} fixed>
              <Text style={[S.tableCellHead, { flex: 1.6 }]}>{ar("اسم القطعة")}</Text>
              <Text style={[S.tableCellHead, { flex: 1 }]}>{ar("الكود")}</Text>
              <Text style={[S.tableCellHead, { flex: 1 }]}>{ar("المصدر")}</Text>
              <Text style={[S.tableCellHead, { flex: 1.4 }]}>{ar("السبب")}</Text>
              <Text style={[S.tableCellHead, { flex: 0.9 }]}>{ar("حالة الطلب")}</Text>
            </View>
            {data.components.map((cp, i) => (
              <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
                <Text style={[S.tableCell, { flex: 1.6 }]}>{ar(cp.partName ?? "") || "—"}</Text>
                <Text style={[S.tableCell, { flex: 1 }]}>{cp.partCode || "—"}</Text>
                <Text style={[S.tableCell, { flex: 1 }]}>{ar(lbl(SOURCE_LOCATION_LABEL, cp.sourceLocation)) || "—"}</Text>
                <Text style={[S.tableCell, { flex: 1.4 }]}>{ar(cp.reason ?? "") || "—"}</Text>
                <Text style={[S.tableCell, { flex: 0.9 }]}>{ar(lbl(REQUEST_STATUS_LABEL, cp.requestStatus)) || "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── تحليل المشي ── */}
        <SecHead label="تحليل المشي" break />
        {data.gait.length === 0 ? (
          <Text style={S.note}>{ar("لا توجد جلسات تحليل مشي مسجّلة")}</Text>
        ) : (
          <View style={S.table}>
            <View style={S.tableHeaderRow} fixed>
              <Text style={[S.tableCellHead, { flex: 0.4 }]}>#</Text>
              <Text style={[S.tableCellHead, { flex: 1 }]}>{ar("التاريخ")}</Text>
              <Text style={[S.tableCellHead, { flex: 2.5 }]}>{ar("المشكلة الأساسية")}</Text>
            </View>
            {data.gait.map((g, i) => (
              <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
                <Text style={[S.tableCell, { flex: 0.4 }]}>{i + 1}</Text>
                <Text style={[S.tableCell, { flex: 1 }]}>{dt(g.sessionDate)}</Text>
                <Text style={[S.tableCell, { flex: 2.5 }]}>{ar(g.mainProblem ?? "") || "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── التقييم النهائي ── */}
        <SecHead label="التقييم النهائي" break />
        {!feHasContent ? (
          <Text style={S.note}>{ar("لم يُسجّل التقييم النهائي بعد")}</Text>
        ) : (
          <>
            <F label="حالة الجذمور" value={fe?.residualLimbCondition} />
            <F label="نظام التعليق المستخدم" value={fe?.suspensionSystemUsed} />
            <F label="عدد الجوارب المسلّمة" value={numOrDash(fe?.socksDelivered)} />
            <F label="عدد البطانات المسلّمة" value={numOrDash(fe?.linersDelivered)} />
            <F label="تاريخ التركيب" value={dt(fe?.fittingDate)} />
            <Bool label="جاهز للتسليم" value={fe?.readyForDelivery} />
            <Bool label="يحتاج متابعة" value={fe?.needsFollowUp} />
            {fe?.followUpPlan && <F label="خطة المتابعة" value={fe.followUpPlan} />}
            <Para label="رأي أخصائي العلاج الفيزيائي" value={fe?.physioOpinion} />
            <Para label="رأي رئيس القسم" value={fe?.departmentHeadOpinion} />
            <Para label="رأي أخصائي الأطراف الصناعية" value={fe?.prosthetistOpinion} />
            <Para label="رأي رئيس اللجنة" value={fe?.committeeHeadOpinion} />
            <Para label="رأي الخبير" value={fe?.expertOpinion} />
            <Para label="ملاحظات عامة" value={fe?.generalNotes} />
          </>
        )}

        {/* ── المتابعة ── */}
        {data.followUps.length > 0 && (
          <>
            <SecHead label="جلسات المتابعة" />
            <View style={S.table}>
              <View style={S.tableHeaderRow} fixed>
                <Text style={[S.tableCellHead, { flex: 1 }]}>{ar("التاريخ")}</Text>
                <Text style={[S.tableCellHead, { flex: 0.7 }]}>{ar("مستوى K")}</Text>
                <Text style={[S.tableCellHead, { flex: 0.7 }]}>{ar("الألم")}</Text>
                <Text style={[S.tableCellHead, { flex: 2 }]}>{ar("ملاحظات")}</Text>
              </View>
              {data.followUps.map((f, i) => (
                <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
                  <Text style={[S.tableCell, { flex: 1 }]}>{dt(f.date)}</Text>
                  <Text style={[S.tableCell, { flex: 0.7 }]}>{f.kLevel || "—"}</Text>
                  <Text style={[S.tableCell, { flex: 0.7 }]}>{f.painLevel != null ? `${f.painLevel}/10` : "—"}</Text>
                  <Text style={[S.tableCell, { flex: 2 }]}>{ar(f.notes ?? "") || "—"}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── توقيعات ── */}
        <View style={{ marginTop: 30, flexDirection: "row-reverse", justifyContent: "space-around" }}>
          {["توقيع فني الأطراف الصناعية", "توقيع الطبيب المشرف", "توقيع رئيس القسم"].map((label, i) => (
            <View key={i} style={{ alignItems: "center", gap: 6 }}>
              <View style={{ width: 100, borderBottomWidth: 0.5, borderBottomColor: TEXT }} />
              <Text style={{ fontSize: 8.5, color: MUTED, textAlign: "center" }}>{ar(label)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

// ── Public export ────────────────────────────────────────────────────────────────
export async function downloadProstheticsCasePdf(data: CasePdfData): Promise<void> {
  ensureAmiriFonts();
  const dob = data.patient.dateOfBirth;
  const age = dob
    ? `${Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} سنة`
    : "—";
  const blob = await pdf(<ProstheticsCasePdfDoc data={data} age={age} />).toBlob();
  const tag = data.patient.patientNumber?.trim() || data.caseId.slice(-8);
  saveBlob(blob, `prosthetics-case-${tag}.pdf`);
}
