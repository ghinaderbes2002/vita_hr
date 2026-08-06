"use client";

// Full medical-history form — mirrors the physiotherapy case's medical-history
// tab exactly (same questions, order, and sub-sections). Self-contained: it
// hydrates from `initial`, keeps its own state, and emits the full DTO on save.
// Reuses the `clinic.physio.case` translations so labels are identical.
import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clinicPatientsApi } from "@/lib/api/clinic-patients";
import { ImagingProcedures } from "@/components/clinic/imaging-procedures";
import { ChronicCondition, CHRONIC_CONDITION_LABELS, TestType } from "@/lib/api/clinic-physio";

const CHRONIC_CONDITIONS = Object.keys(CHRONIC_CONDITION_LABELS) as ChronicCondition[];
const TEST_LABELS: Partial<Record<TestType, string>> = {
  MRI: "التصوير بالرنين المغناطيسي / MRI",
  MYELOGRAM: "تصوير النخاع / Scan Myelogram",
  XRAY: "الأشعة السينية / X-Ray",
  CT: "التصوير المقطعي المحوسب / CT",
  OTHER: "أخرى / Other",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <Card dir={dir}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-base ${dir === "rtl" ? "text-right" : "text-left"}`}>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-sm transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"
      }`}
    >
      {label}
    </button>
  );
}

type ImagingProc = { imageUrl: string; description: string };

const EMPTY = {
  lifeType: "", smokes: false, hasSmokedBefore: false, smokingFrequency: "",
  hasPacemaker: false, pacemakerDetail: "", allergies: "",
  adhesiveAllergy: false, adhesiveAllergyDetail: "", chronicConditionsOther: "",
  isPregnant: false, maritalStatus: "", lastMenstrualPeriod: "",
  currentMedications: "", prescriptionDrugs: false, herbalSupplements: false, supplementsList: "",
  previousDiagnoses: "", previousComplaintsSurgeries: "",
  hasOtherHealthProblems: false, otherConditions: "",
  hasDoctorRestrictions: false, doctorRestrictions: "",
  hadPTSameProblem: false, ptSameProblemDetail: "",
  receivingOtherTreatment: false, otherTreatmentDetail: "",
  testsOther: "", testResults: "",
  newAnalysis: "", newAnalysisDate: "", newAnalysisAttachment: "",
  oldAnalysis: "", oldAnalysisDate: "", oldAnalysisAttachment: "",
  boneDensityTest: false, boneDensityDetail: "",
  hospitalizedLastYear: false, hospitalizedDetail: "",
  imagingProcedures: [] as ImagingProc[],
  diagnosis: "", hadSurgeries: false, surgeriesDetail: "",
};

export interface MedicalHistoryFormProps {
  initial?: Record<string, any> | null;
  patientId?: string;
  gender?: string | null;
  canEdit: boolean;
  saving: boolean;
  onSave: (dto: Record<string, any>) => void;
}

export function MedicalHistoryForm({ initial, patientId, gender, canEdit, saving, onSave }: MedicalHistoryFormProps) {
  const t = useTranslations("clinic.physio.case");

  const [history, setHistory] = useState({ ...EMPTY });
  const [chronicConditions, setChronicConditions] = useState<ChronicCondition[]>([]);
  const [testsHad, setTestsHad] = useState<TestType[]>([]);
  const [surgeries, setSurgeries] = useState([
    { name: "", type: "", date: "" }, { name: "", type: "", date: "" }, { name: "", type: "", date: "" },
  ]);
  const [attachmentUploading, setAttachmentUploading] = useState<"new" | "old" | null>(null);
  const [attachmentDownloading, setAttachmentDownloading] = useState<"new" | "old" | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!initial || hydrated) return;
    const mh = initial;
    setHistory({
      ...EMPTY,
      lifeType: mh.lifeType ?? "",
      smokes: mh.smokes ?? false,
      hasSmokedBefore: mh.hasSmokedBefore ?? false,
      smokingFrequency: mh.smokingFrequency ?? "",
      hasPacemaker: mh.hasPacemaker ?? false,
      pacemakerDetail: mh.pacemakerDetail ?? "",
      allergies: mh.allergies ?? "",
      adhesiveAllergy: mh.adhesiveAllergy ?? false,
      adhesiveAllergyDetail: mh.adhesiveAllergyDetail ?? "",
      chronicConditionsOther: mh.chronicConditionsOther ?? "",
      isPregnant: mh.isPregnant ?? false,
      maritalStatus: mh.maritalStatus ?? "",
      lastMenstrualPeriod: mh.lastMenstrualPeriod ?? "",
      currentMedications: mh.currentMedications ?? "",
      prescriptionDrugs: mh.prescriptionDrugs ?? false,
      herbalSupplements: mh.herbalSupplements ?? false,
      supplementsList: mh.supplementsList ?? "",
      previousDiagnoses: mh.previousDiagnoses ?? "",
      previousComplaintsSurgeries: mh.previousComplaintsSurgeries ?? "",
      hasOtherHealthProblems: mh.hasOtherHealthProblems ?? false,
      otherConditions: mh.otherConditions ?? "",
      hasDoctorRestrictions: mh.hasDoctorRestrictions ?? false,
      doctorRestrictions: mh.doctorRestrictions ?? "",
      hadPTSameProblem: mh.hadPTSameProblem ?? false,
      ptSameProblemDetail: mh.ptSameProblemDetail ?? "",
      receivingOtherTreatment: mh.receivingOtherTreatment ?? false,
      otherTreatmentDetail: mh.otherTreatmentDetail ?? "",
      testsOther: mh.testsOther ?? "",
      testResults: mh.testResults ?? "",
      newAnalysis: mh.newAnalysis ?? "",
      newAnalysisDate: mh.newAnalysisDate ?? "",
      newAnalysisAttachment: mh.newAnalysisAttachment ?? "",
      oldAnalysis: mh.oldAnalysis ?? "",
      oldAnalysisDate: mh.oldAnalysisDate ?? "",
      oldAnalysisAttachment: mh.oldAnalysisAttachment ?? "",
      boneDensityTest: mh.boneDensityTest ?? false,
      boneDensityDetail: mh.boneDensityDetail ?? "",
      hospitalizedLastYear: mh.hospitalizedLastYear ?? false,
      hospitalizedDetail: mh.hospitalizedDetail ?? "",
      imagingProcedures: Array.isArray(mh.imagingProcedures) ? mh.imagingProcedures : [],
      diagnosis: mh.diagnosis ?? "",
      hadSurgeries: mh.hadSurgeries ?? false,
      surgeriesDetail: mh.surgeriesDetail ?? "",
    });
    if (Array.isArray(mh.chronicConditions)) setChronicConditions(mh.chronicConditions);
    if (Array.isArray(mh.tests)) setTestsHad(mh.tests);
    if (Array.isArray(mh.surgeries) && mh.surgeries.length) {
      setSurgeries([0, 1, 2].map((i) => mh.surgeries[i] ?? { name: "", type: "", date: "" }));
    }
    setHydrated(true);
  }, [initial, hydrated]);

  const toggleArr = <T extends string>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const handleSave = () => {
    const h = history;
    onSave({
      lifeType: h.lifeType || undefined,
      smokes: h.smokes,
      hasSmokedBefore: h.hasSmokedBefore,
      smokingFrequency: h.smokingFrequency || undefined,
      hasPacemaker: h.hasPacemaker,
      pacemakerDetail: h.hasPacemaker ? h.pacemakerDetail || undefined : undefined,
      allergies: h.allergies || undefined,
      adhesiveAllergy: h.adhesiveAllergy,
      adhesiveAllergyDetail: h.adhesiveAllergy ? h.adhesiveAllergyDetail || undefined : undefined,
      chronicConditions,
      chronicConditionsOther: chronicConditions.includes("OTHER" as ChronicCondition) ? h.chronicConditionsOther || undefined : undefined,
      isPregnant: h.isPregnant,
      maritalStatus: h.maritalStatus || undefined,
      lastMenstrualPeriod: h.lastMenstrualPeriod || undefined,
      prescriptionDrugs: h.prescriptionDrugs,
      currentMedications: h.prescriptionDrugs ? h.currentMedications || undefined : undefined,
      herbalSupplements: h.herbalSupplements,
      supplementsList: h.herbalSupplements ? h.supplementsList || undefined : undefined,
      previousDiagnoses: h.previousDiagnoses || undefined,
      previousComplaintsSurgeries: h.previousComplaintsSurgeries || undefined,
      hasOtherHealthProblems: h.hasOtherHealthProblems,
      otherConditions: h.hasOtherHealthProblems ? h.otherConditions || undefined : undefined,
      hasDoctorRestrictions: h.hasDoctorRestrictions,
      doctorRestrictions: h.hasDoctorRestrictions ? h.doctorRestrictions || undefined : undefined,
      hadPTSameProblem: h.hadPTSameProblem,
      ptSameProblemDetail: h.hadPTSameProblem ? h.ptSameProblemDetail || undefined : undefined,
      receivingOtherTreatment: h.receivingOtherTreatment,
      otherTreatmentDetail: h.receivingOtherTreatment ? h.otherTreatmentDetail || undefined : undefined,
      tests: testsHad,
      testsOther: testsHad.includes("OTHER" as TestType) ? h.testsOther || undefined : undefined,
      testResults: h.testResults || undefined,
      newAnalysis: h.newAnalysis || undefined,
      newAnalysisDate: h.newAnalysisDate || undefined,
      newAnalysisAttachment: h.newAnalysisAttachment || undefined,
      oldAnalysis: h.oldAnalysis || undefined,
      oldAnalysisDate: h.oldAnalysisDate || undefined,
      oldAnalysisAttachment: h.oldAnalysisAttachment || undefined,
      boneDensityTest: h.boneDensityTest,
      boneDensityDetail: h.boneDensityTest ? h.boneDensityDetail || undefined : undefined,
      hospitalizedLastYear: h.hospitalizedLastYear,
      hospitalizedDetail: h.hospitalizedLastYear ? h.hospitalizedDetail || undefined : undefined,
      imagingProcedures: (() => {
        const rows = h.imagingProcedures.filter((p) => p.imageUrl || p.description.trim());
        return rows.length ? rows : undefined;
      })(),
      diagnosis: h.diagnosis || undefined,
      hadSurgeries: h.hadSurgeries,
      surgeries: h.hadSurgeries ? surgeries.filter((s) => s.name || s.type || s.date) : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <Section title={t("medicalHistory.title")}>
        <div className="space-y-4">
          {/* الأدوية الموصوفة حالياً */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("medicalHistory.prescriptionDrugs")}</Label>
              <div className="flex items-center gap-2 shrink-0 mr-2">
                <span className="text-xs text-muted-foreground">{t("no")}</span>
                <Switch checked={history.prescriptionDrugs} onCheckedChange={(v) => setHistory((h) => ({ ...h, prescriptionDrugs: v }))} disabled={!canEdit} />
                <span className="text-xs text-muted-foreground">{t("yes")}</span>
              </div>
            </div>
            {history.prescriptionDrugs && (
              <Input className="mr-4" value={history.currentMedications} onChange={(e) => setHistory((h) => ({ ...h, currentMedications: e.target.value }))} placeholder={t("medicalHistory.currentMedicationsPlaceholder")} disabled={!canEdit} />
            )}
          </div>

          {/* التشخيصات السابقة / الأدوية السابقة */}
          <div className="space-y-1.5">
            <Label>{t("medicalHistory.previousDiagnoses")}</Label>
            <Textarea rows={2} value={history.previousDiagnoses} onChange={(e) => setHistory((h) => ({ ...h, previousDiagnoses: e.target.value }))} disabled={!canEdit} />
          </div>

          {/* المستحضرات العشبية / الفيتامينات */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("medicalHistory.herbalSupplements")}</Label>
              <div className="flex items-center gap-2 shrink-0 mr-2">
                <span className="text-xs text-muted-foreground">{t("no")}</span>
                <Switch checked={history.herbalSupplements} onCheckedChange={(v) => setHistory((h) => ({ ...h, herbalSupplements: v }))} disabled={!canEdit} />
                <span className="text-xs text-muted-foreground">{t("yes")}</span>
              </div>
            </div>
            {history.herbalSupplements && (
              <Input className="mr-4" value={history.supplementsList} onChange={(e) => setHistory((h) => ({ ...h, supplementsList: e.target.value }))} placeholder={t("medicalHistory.supplementsListPlaceholder")} disabled={!canEdit} />
            )}
          </div>

          {/* مشاكل صحية أخرى */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("medicalHistory.hasOtherHealthProblems")}</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("no")}</span>
                <Switch checked={history.hasOtherHealthProblems} onCheckedChange={(v) => setHistory((h) => ({ ...h, hasOtherHealthProblems: v }))} disabled={!canEdit} />
                <span className="text-xs text-muted-foreground">{t("yes")}</span>
              </div>
            </div>
            {history.hasOtherHealthProblems && (
              <Input className="mr-4" value={history.otherConditions} onChange={(e) => setHistory((h) => ({ ...h, otherConditions: e.target.value }))} placeholder={t("medicalHistory.otherConditionsPlaceholder")} disabled={!canEdit} />
            )}
          </div>

          {/* قيود الطبيب */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("medicalHistory.hasDoctorRestrictions")}</Label>
              <div className="flex items-center gap-2 shrink-0 mr-2">
                <span className="text-xs text-muted-foreground">{t("no")}</span>
                <Switch checked={history.hasDoctorRestrictions} onCheckedChange={(v) => setHistory((h) => ({ ...h, hasDoctorRestrictions: v, doctorRestrictions: v ? h.doctorRestrictions : "" }))} disabled={!canEdit} />
                <span className="text-xs text-muted-foreground">{t("yes")}</span>
              </div>
            </div>
            {history.hasDoctorRestrictions && (
              <Input value={history.doctorRestrictions} onChange={(e) => setHistory((h) => ({ ...h, doctorRestrictions: e.target.value }))} placeholder={t("medicalHistory.doctorRestrictionsPlaceholder")} disabled={!canEdit} />
            )}
          </div>

          {/* هل تدخن */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("medicalHistory.smokes")}</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("no")}</span>
                <Switch checked={history.smokes} onCheckedChange={(v) => setHistory((h) => ({ ...h, smokes: v }))} disabled={!canEdit} />
                <span className="text-xs text-muted-foreground">{t("yes")}</span>
              </div>
            </div>
            {history.smokes && (
              <div className="mr-4 space-y-1.5">
                <Label className="text-sm">{t("medicalHistory.smokingFrequency")}</Label>
                <Input value={history.smokingFrequency} onChange={(e) => setHistory((h) => ({ ...h, smokingFrequency: e.target.value }))} placeholder={t("medicalHistory.smokingFrequencyPlaceholder")} disabled={!canEdit} />
              </div>
            )}
          </div>

          {/* هل سبق لك أن دخنت */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("medicalHistory.hasSmokedBefore")}</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("no")}</span>
                <Switch checked={history.hasSmokedBefore} onCheckedChange={(v) => setHistory((h) => ({ ...h, hasSmokedBefore: v }))} disabled={!canEdit} />
                <span className="text-xs text-muted-foreground">{t("yes")}</span>
              </div>
            </div>
            {history.hasSmokedBefore && (
              <div className="mr-4 space-y-1.5">
                <Label className="text-sm">{t("medicalHistory.smokingFrequency")}</Label>
                <Input value={history.smokingFrequency} onChange={(e) => setHistory((h) => ({ ...h, smokingFrequency: e.target.value }))} placeholder={t("medicalHistory.smokingFrequencyPlaceholder")} disabled={!canEdit} />
              </div>
            )}
          </div>

          {/* جهاز تنظيم ضربات القلب */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("medicalHistory.hasPacemaker")}</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("no")}</span>
                <Switch checked={history.hasPacemaker} onCheckedChange={(v) => setHistory((h) => ({ ...h, hasPacemaker: v }))} disabled={!canEdit} />
                <span className="text-xs text-muted-foreground">{t("yes")}</span>
              </div>
            </div>
            {history.hasPacemaker && (
              <Input className="mr-4" value={history.pacemakerDetail} onChange={(e) => setHistory((h) => ({ ...h, pacemakerDetail: e.target.value }))} placeholder={t("medicalHistory.pacemakerDetail")} disabled={!canEdit} />
            )}
          </div>

          {/* للإناث: الحمل */}
          {gender === "FEMALE" && (
            <>
              <div className="flex items-center justify-between">
                <Label>{t("medicalHistory.isPregnant")}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t("no")}</span>
                  <Switch checked={history.isPregnant} onCheckedChange={(v) => setHistory((h) => ({ ...h, isPregnant: v }))} disabled={!canEdit} />
                  <span className="text-xs text-muted-foreground">{t("yes")}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("medicalHistory.maritalStatus")}</Label>
                <Input value={history.maritalStatus} onChange={(e) => setHistory((h) => ({ ...h, maritalStatus: e.target.value }))} disabled={!canEdit} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("medicalHistory.lastMenstrualPeriod")}</Label>
                <Input value={history.lastMenstrualPeriod} onChange={(e) => setHistory((h) => ({ ...h, lastMenstrualPeriod: e.target.value }))} disabled={!canEdit} />
              </div>
            </>
          )}

          {/* نمط الحياة */}
          <div className="space-y-1.5">
            <Label>{t("medicalHistory.lifeType")}</Label>
            <Select value={history.lifeType} onValueChange={(v) => setHistory((h) => ({ ...h, lifeType: v }))}>
              <SelectTrigger><SelectValue placeholder={t("select")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SEDENTARY">{t("medicalHistory.SEDENTARY")}</SelectItem>
                <SelectItem value="NORMAL">{t("medicalHistory.LIFE_NORMAL")}</SelectItem>
                <SelectItem value="ABNORMAL">{t("medicalHistory.ABNORMAL")}</SelectItem>
                <SelectItem value="PROFESSIONAL">{t("medicalHistory.PROFESSIONAL")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* الحساسية */}
          <div className="space-y-1.5">
            <Label>{t("medicalHistory.allergies")}</Label>
            <Input value={history.allergies} onChange={(e) => setHistory((h) => ({ ...h, allergies: e.target.value }))} placeholder={t("medicalHistory.allergiesPlaceholder")} disabled={!canEdit} />
          </div>

          {/* حساسية المواد اللاصقة */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("medicalHistory.adhesiveAllergy")}</Label>
              <div className="flex items-center gap-2 shrink-0 mr-2">
                <span className="text-xs text-muted-foreground">{t("no")}</span>
                <Switch checked={history.adhesiveAllergy} onCheckedChange={(v) => setHistory((h) => ({ ...h, adhesiveAllergy: v }))} disabled={!canEdit} />
                <span className="text-xs text-muted-foreground">{t("yes")}</span>
              </div>
            </div>
            {history.adhesiveAllergy && (
              <Input className="mr-4" value={history.adhesiveAllergyDetail} onChange={(e) => setHistory((h) => ({ ...h, adhesiveAllergyDetail: e.target.value }))} placeholder={t("medicalHistory.adhesiveAllergyDetail")} disabled={!canEdit} />
            )}
          </div>

          {/* الشكاوى والعمليات السابقة */}
          <div className="space-y-1.5">
            <Label>{t("medicalHistory.previousComplaintsSurgeries")}</Label>
            <Textarea rows={2} value={history.previousComplaintsSurgeries} onChange={(e) => setHistory((h) => ({ ...h, previousComplaintsSurgeries: e.target.value }))} disabled={!canEdit} />
          </div>

          {/* هل خضعت لأي عمليات جراحية */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("medicalHistory.hadSurgeries")}</Label>
              <div className="flex items-center gap-2 shrink-0 mr-2">
                <span className="text-xs text-muted-foreground">{t("no")}</span>
                <Switch checked={history.hadSurgeries} onCheckedChange={(v) => setHistory((h) => ({ ...h, hadSurgeries: v }))} disabled={!canEdit} />
                <span className="text-xs text-muted-foreground">{t("yes")}</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {history.hadSurgeries && (
        <Section title={t("medicalHistory.surgeriesTitle")}>
          <div className="space-y-3">
            {surgeries.map((s, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">{t("medicalHistory.surgeryName")} {i + 1}</Label>
                  <Input value={s.name} onChange={(e) => setSurgeries((arr) => arr.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder={t("medicalHistory.surgeryNamePlaceholder")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("medicalHistory.surgeryType")}</Label>
                  <Input value={s.type} onChange={(e) => setSurgeries((arr) => arr.map((x, j) => j === i ? { ...x, type: e.target.value } : x))} placeholder={t("medicalHistory.surgeryTypePlaceholder")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("medicalHistory.surgeryDate")}</Label>
                  <Input value={s.date} onChange={(e) => setSurgeries((arr) => arr.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={t("medicalHistory.ptOtherTreatmentsTitle")}>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("medicalHistory.hadPTSameProblem")}</Label>
              <div className="flex items-center gap-2 shrink-0 mr-2">
                <span className="text-xs text-muted-foreground">{t("no")}</span>
                <Switch checked={history.hadPTSameProblem} onCheckedChange={(v) => setHistory((h) => ({ ...h, hadPTSameProblem: v }))} disabled={!canEdit} />
                <span className="text-xs text-muted-foreground">{t("yes")}</span>
              </div>
            </div>
            {history.hadPTSameProblem && (
              <Input className="mr-4" value={history.ptSameProblemDetail} onChange={(e) => setHistory((h) => ({ ...h, ptSameProblemDetail: e.target.value }))} disabled={!canEdit} />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("medicalHistory.receivingOtherTreatment")}</Label>
              <div className="flex items-center gap-2 shrink-0 mr-2">
                <span className="text-xs text-muted-foreground">{t("no")}</span>
                <Switch checked={history.receivingOtherTreatment} onCheckedChange={(v) => setHistory((h) => ({ ...h, receivingOtherTreatment: v }))} disabled={!canEdit} />
                <span className="text-xs text-muted-foreground">{t("yes")}</span>
              </div>
            </div>
            {history.receivingOtherTreatment && (
              <Input className="mr-4" value={history.otherTreatmentDetail} onChange={(e) => setHistory((h) => ({ ...h, otherTreatmentDetail: e.target.value }))} placeholder={t("medicalHistory.otherTreatmentPlaceholder")} disabled={!canEdit} />
            )}
          </div>
        </div>
      </Section>

      <Section title={t("medicalHistory.testsTitle")}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="block">{t("medicalHistory.imagingType")}</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(TEST_LABELS) as [TestType, string][]).map(([tk, l]) => (
                <ToggleChip key={tk} label={l} active={testsHad.includes(tk)} onClick={() => toggleArr(testsHad, tk, setTestsHad)} />
              ))}
            </div>
            {testsHad.includes("OTHER" as TestType) && (
              <Input value={history.testsOther} onChange={(e) => setHistory((h) => ({ ...h, testsOther: e.target.value }))} placeholder={t("other")} disabled={!canEdit} />
            )}
          </div>
          <div className="space-y-1.5">
            <Label>{t("medicalHistory.testResults")}</Label>
            <Textarea rows={2} value={history.testResults} onChange={(e) => setHistory((h) => ({ ...h, testResults: e.target.value }))} disabled={!canEdit} />
          </div>
          <Label className="block font-medium">{t("medicalHistory.analysisTitle")}</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">{t("medicalHistory.newAnalysis")}</Label>
              <Input value={history.newAnalysis} onChange={(e) => setHistory((h) => ({ ...h, newAnalysis: e.target.value }))} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{t("medicalHistory.newAnalysisDate")}</Label>
              <Input value={history.newAnalysisDate} onChange={(e) => setHistory((h) => ({ ...h, newAnalysisDate: e.target.value }))} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{t("medicalHistory.oldAnalysis")}</Label>
              <Input value={history.oldAnalysis} onChange={(e) => setHistory((h) => ({ ...h, oldAnalysis: e.target.value }))} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{t("medicalHistory.oldAnalysisDate")}</Label>
              <Input value={history.oldAnalysisDate} onChange={(e) => setHistory((h) => ({ ...h, oldAnalysisDate: e.target.value }))} disabled={!canEdit} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["new", "old"] as const).map((kind) => {
              const label = kind === "new" ? t("medicalHistory.newAttachment") : t("medicalHistory.oldAttachment");
              const attachKey = kind === "new" ? "newAnalysisAttachment" : "oldAnalysisAttachment";
              const docId = history[attachKey];
              const isUploading = attachmentUploading === kind;
              const isDownloading = attachmentDownloading === kind;
              return (
                <div key={kind} className="space-y-1.5">
                  <Label className="text-sm">{label}</Label>
                  {docId ? (
                    <div className="flex items-center gap-2">
                      <button type="button" disabled={isDownloading}
                        className="text-xs text-primary underline truncate flex-1 text-right disabled:opacity-40"
                        onClick={async () => {
                          if (!patientId) return;
                          setAttachmentDownloading(kind);
                          try {
                            const blob = await clinicPatientsApi.downloadDocument(patientId, docId);
                            const blobUrl = URL.createObjectURL(blob);
                            window.open(blobUrl, "_blank");
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                          } catch { toast.error(t("uploadFailed")); }
                          finally { setAttachmentDownloading(null); }
                        }}>
                        {isDownloading ? <Loader2 className="h-3 w-3 animate-spin inline" /> : t("viewFile")}
                      </button>
                      {canEdit && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive" onClick={() => setHistory((h) => ({ ...h, [attachKey]: "" }))}>{t("deleteFile")}</Button>
                      )}
                    </div>
                  ) : (
                    <label className={`flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-dashed text-sm cursor-pointer transition-colors ${isUploading ? "opacity-50 pointer-events-none" : "hover:bg-muted"}`}>
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {isUploading ? t("uploading") : t("chooseFile")}
                      <input type="file" className="hidden" disabled={!canEdit || !!attachmentUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !patientId) return;
                          setAttachmentUploading(kind);
                          try {
                            const doc = await clinicPatientsApi.uploadDocument(patientId, file, "MEDICAL_REPORT");
                            setHistory((h) => ({ ...h, [attachKey]: doc.id ?? "" }));
                          } catch { toast.error(t("uploadFailed")); }
                          finally { setAttachmentUploading(null); e.target.value = ""; }
                        }}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("medicalHistory.boneDensityTest")}</Label>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{t("no")}</span>
                <Switch checked={history.boneDensityTest} onCheckedChange={(v) => setHistory((h) => ({ ...h, boneDensityTest: v }))} disabled={!canEdit} />
                <span className="text-xs text-muted-foreground">{t("yes")}</span>
              </div>
            </div>
            {history.boneDensityTest && (
              <Input className="mr-4" value={history.boneDensityDetail} onChange={(e) => setHistory((h) => ({ ...h, boneDensityDetail: e.target.value }))} disabled={!canEdit} />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("medicalHistory.hospitalizedLastYear")}</Label>
              <div className="flex items-center gap-2 shrink-0 mr-2">
                <span className="text-xs text-muted-foreground">{t("no")}</span>
                <Switch checked={history.hospitalizedLastYear} onCheckedChange={(v) => setHistory((h) => ({ ...h, hospitalizedLastYear: v }))} disabled={!canEdit} />
                <span className="text-xs text-muted-foreground">{t("yes")}</span>
              </div>
            </div>
            {history.hospitalizedLastYear && (
              <Input className="mr-4" value={history.hospitalizedDetail} onChange={(e) => setHistory((h) => ({ ...h, hospitalizedDetail: e.target.value }))} disabled={!canEdit} />
            )}
          </div>

          {/* الإجراءات التصويرية — تُقرأ من مستندات المريض مباشرة */}
          {patientId && <ImagingProcedures patientId={patientId} canEdit={canEdit} />}
        </div>
      </Section>

      <Section title={t("medicalHistory.chronicConditionsTitle")}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          {CHRONIC_CONDITIONS.map((cond) => (
            <label key={cond} htmlFor={`cc-${cond}`} className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" id={`cc-${cond}`} checked={chronicConditions.includes(cond)} onChange={() => toggleArr(chronicConditions, cond, setChronicConditions)} disabled={!canEdit} className="mt-0.5 h-4 w-4 accent-primary shrink-0" />
              <span className="text-sm leading-snug">{CHRONIC_CONDITION_LABELS[cond]}</span>
            </label>
          ))}
        </div>
        {chronicConditions.includes("OTHER" as ChronicCondition) && (
          <div className="mt-3">
            <Input value={history.chronicConditionsOther} onChange={(e) => setHistory((h) => ({ ...h, chronicConditionsOther: e.target.value }))} placeholder={t("other")} disabled={!canEdit} />
          </div>
        )}
      </Section>

      <Section title={t("medicalHistory.diagnosisTitle")}>
        <Textarea rows={4} value={history.diagnosis} onChange={(e) => setHistory((h) => ({ ...h, diagnosis: e.target.value }))} placeholder={t("medicalHistory.diagnosisPlaceholder")} disabled={!canEdit} />
      </Section>

      {canEdit && (
        <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {t("save")}
        </Button>
      )}
    </div>
  );
}
