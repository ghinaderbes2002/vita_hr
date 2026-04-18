"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowRight,
  Download,
  Linkedin,
  Star,
  Phone,
  Mail,
  Building2,
  User,
  ClipboardList,
  Trophy,
  Send,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useJobApplication,
  useUpdateJobApplication,
  useApproveJobApplicationCEO,
} from "@/lib/hooks/use-job-applications";
import { CV_BASE_URL } from "@/lib/api/job-applications";
import { JobApplicationStatus } from "@/types";
import { EmployeeDialog } from "@/components/features/employees/employee-dialog";
import {
  useInterviewEvaluationByApplication,
  useCreateInterviewEvaluation,
  useUpdateInterviewEvaluation,
  useTransferToEmployee,
} from "@/lib/hooks/use-interview-evaluations";
import {
  useInterviewPositions,
  useTechnicalQuestions,
} from "@/lib/hooks/use-interview-positions";
import {
  usePersonalCriteria,
  useComputerCriteria,
} from "@/lib/hooks/use-interview-criteria";
import {
  InterviewDecision,
  CreateInterviewEvaluationData,
} from "@/lib/api/interview-evaluations";
import { usePermissions } from "@/lib/hooks/use-permissions";

const STATUS_CONFIG: Record<
  JobApplicationStatus,
  { bg: string; label: string }
> = {
  PENDING: { bg: "bg-amber-100 text-amber-800", label: "" },
  INTERVIEW_READY: { bg: "bg-blue-100 text-blue-800", label: "" },
  ACCEPTED: { bg: "bg-green-100 text-green-800", label: "" },
  REJECTED: { bg: "bg-red-100 text-red-800", label: "" },
  HIRED: { bg: "bg-purple-100 text-purple-800", label: "" },
};

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)}>
          <Star
            className={`h-6 w-6 transition-colors ${star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function JobApplicationDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasPermission } = usePermissions();

  const { data: application, isLoading } = useJobApplication(id);
  const updateApplication = useUpdateJobApplication();
  const approveCEO = useApproveJobApplicationCEO();

  // Interview evaluation
  const { data: existingEval } = useInterviewEvaluationByApplication(id);
  const { data: positionsData } = useInterviewPositions();
  const { data: personalCriteria } = usePersonalCriteria();
  const { data: computerCriteria } = useComputerCriteria();
  const createEval = useCreateInterviewEvaluation();
  const updateEval = useUpdateInterviewEvaluation();
  const transferToEmployee = useTransferToEmployee();

  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [evalForm, setEvalForm] = useState<{
    positionId: string;
    decision: InterviewDecision | "";
    generalNotes: string;
    proposedSalary: string;
    personalScores: Record<string, number>;
    computerScores: Record<string, number>;
    technicalScores: Record<string, number>;
  }>({
    positionId: "",
    decision: "",
    generalNotes: "",
    proposedSalary: "",
    personalScores: {},
    computerScores: {},
    technicalScores: {},
  });

  const positions =
    (positionsData as any)?.items || (positionsData as any) || [];
  const evalData = existingEval as any;
  const pCriteria = (personalCriteria as any) || [];
  const cCriteria = (computerCriteria as any) || [];

  const { data: techQuestionsData, isLoading: techQuestionsLoading } =
    useTechnicalQuestions(evalForm.positionId);
  const techQuestions: any[] = (techQuestionsData as any) || [];

  function openEvalDialog() {
    if (evalData) {
      setEvalForm({
        positionId: evalData.positionId || "",
        decision: evalData.decision || "",
        generalNotes: evalData.generalNotes || "",
        proposedSalary: evalData.proposedSalary?.toString() || "",
        personalScores: Object.fromEntries(
          (evalData.personalScores || []).map((s: any) => [
            s.criterionId,
            s.score,
          ]),
        ),
        computerScores: Object.fromEntries(
          (evalData.computerScores || []).map((s: any) => [
            s.criterionId,
            s.score,
          ]),
        ),
        technicalScores: Object.fromEntries(
          (evalData.technicalScores || []).map((s: any) => [
            s.questionId,
            s.score,
          ]),
        ),
      });
    } else {
      setEvalForm({
        positionId: "",
        decision: "",
        generalNotes: "",
        proposedSalary: "",
        personalScores: {},
        computerScores: {},
        technicalScores: {},
      });
    }
    setEvalDialogOpen(true);
  }

  function handleSaveEval() {
    if (!evalForm.positionId || !app) return;
    const payload: CreateInterviewEvaluationData = {
      positionId: evalForm.positionId,
      jobApplicationId: id,
      candidateName: app.fullName,
      decision: (evalForm.decision as InterviewDecision) || undefined,
      generalNotes: evalForm.generalNotes || undefined,
      proposedSalary: evalForm.proposedSalary
        ? Number(evalForm.proposedSalary)
        : undefined,
      personalScores: pCriteria.map((c: any) => ({
        criterionId: c.id,
        score: evalForm.personalScores[c.id] || 1,
      })),
      computerScores: cCriteria.map((c: any) => ({
        criterionId: c.id,
        score: evalForm.computerScores[c.id] || 1,
      })),
      technicalScores: techQuestions.map((q: any) => ({
        questionId: q.id,
        score: evalForm.technicalScores[q.id] || 1,
      })),
    };
    if (evalData) {
      updateEval.mutate(
        { id: evalData.id, data: payload },
        { onSuccess: () => setEvalDialogOpen(false) },
      );
    } else {
      createEval.mutate(payload, { onSuccess: () => setEvalDialogOpen(false) });
    }
  }

  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionNote, setRejectionNote] = useState("");
  const [rating, setRating] = useState(0);
  const [actionStatus, setActionStatus] = useState<Exclude<
    JobApplicationStatus,
    "HIRED"
  > | null>(null);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);

  const RATING_TO_EVALUATION: Record<
    number,
    "EXCELLENT" | "VERY_GOOD" | "GOOD" | "ACCEPTABLE" | "POOR"
  > = {
    5: "EXCELLENT",
    4: "VERY_GOOD",
    3: "GOOD",
    2: "ACCEPTABLE",
    1: "POOR",
  };

  const handleAction = (status: Exclude<JobApplicationStatus, "HIRED">) => {
    setActionStatus(status);
    setReviewNotes("");
    setRejectionNote("");
    setRating(0);
  };

  const handleSubmit = async () => {
    if (!actionStatus) return;
    await updateApplication.mutateAsync({
      id,
      data: {
        status: actionStatus,
        reviewNotes: reviewNotes || undefined,
        rejectionNote: actionStatus === "REJECTED" ? rejectionNote : undefined,
        rating: actionStatus === "ACCEPTED" ? rating : undefined,
      },
    });
    setActionStatus(null);
  };

  const handleCEOApprove = async () => {
    await approveCEO.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!application) return null;

  const app = application as any;
  const statusCfg = STATUS_CONFIG[app.status as JobApplicationStatus];
  const cvUrl = app.cvFileUrl ? `${CV_BASE_URL}${app.cvFileUrl}` : null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{app.fullName}</h1>
          <p className="text-muted-foreground">{app.specialization}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusCfg.bg}`}
        >
          {t(`jobApplications.statuses.${app.status}`)}
        </span>
        {app.rating && (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-medium">{app.rating}/5</span>
          </div>
        )}
        {app.status === "ACCEPTED" && (
          <Button size="sm" onClick={() => setAddEmployeeOpen(true)}>
            إضافة كموظف
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("jobApplications.sections.personalInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{app.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{app.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                {t("jobApplications.fields.education")}: {app.education}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>
                {t("jobApplications.fields.yearsOfExperience")}:{" "}
                {app.yearsOfExperience} {t("common.years")}
              </span>
            </div>
            {app.linkedinUrl && (
              <a
                href={app.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:underline"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            )}
            {cvUrl && (
              <a href={cvUrl} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 w-full mt-2"
                >
                  <Download className="h-4 w-4" />
                  {t("jobApplications.downloadCV")}
                </Button>
              </a>
            )}
          </CardContent>
        </Card>

        {/* Cover Letter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("jobApplications.sections.coverLetter")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {app.coverLetter}
            </p>
          </CardContent>
        </Card>

        {/* Reference 1 */}
        {app.ref1Name && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("jobApplications.sections.reference1")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{app.ref1Name}</p>
              <p className="text-muted-foreground">
                {app.ref1JobTitle} — {app.ref1Company}
              </p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {app.ref1Phone}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reference 2 */}
        {app.ref2Name && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("jobApplications.sections.reference2")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{app.ref2Name}</p>
              <p className="text-muted-foreground">
                {app.ref2JobTitle} — {app.ref2Company}
              </p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {app.ref2Phone}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review notes if exists */}
      {app.reviewNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("jobApplications.fields.reviewNotes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{app.reviewNotes}</p>
          </CardContent>
        </Card>
      )}
      {app.rejectionNote && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-600">
              {t("jobApplications.fields.rejectionNote")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{app.rejectionNote}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("jobApplications.actions.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action buttons */}
          {!actionStatus && (
            <div className="flex flex-wrap gap-2">
              {app.status !== "INTERVIEW_READY" && (
                <Button
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => handleAction("INTERVIEW_READY")}
                >
                  {t("jobApplications.actions.interviewReady")}
                </Button>
              )}
              {app.status !== "ACCEPTED" && (
                <Button
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                  onClick={() => handleAction("ACCEPTED")}
                >
                  {t("jobApplications.actions.accept")}
                </Button>
              )}
              {app.status !== "REJECTED" && (
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => handleAction("REJECTED")}
                >
                  {t("jobApplications.actions.reject")}
                </Button>
              )}
              {/* زر موافقة المدير التنفيذي */}
              {app.status === "ACCEPTED" &&
                hasPermission("job-applications:ceo-approve") && (
                  <Button
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    variant="outline"
                    onClick={handleCEOApprove}
                    disabled={approveCEO.isPending}
                  >
                    {approveCEO.isPending
                      ? "جاري المعالجة..."
                      : t("jobApplications.actions.ceoApprove")}
                  </Button>
                )}
            </div>
          )}

          {/* Action form */}
          {actionStatus && (
            <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
              <p className="font-medium">
                {t(`jobApplications.statuses.${actionStatus}`)}
              </p>

              {actionStatus === "ACCEPTED" && (
                <div className="space-y-2">
                  <Label>{t("jobApplications.fields.rating")} *</Label>
                  <StarRating value={rating} onChange={setRating} />
                </div>
              )}

              {actionStatus === "REJECTED" && (
                <div className="space-y-2">
                  <Label>{t("jobApplications.fields.rejectionNote")} *</Label>
                  <Textarea
                    rows={3}
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    placeholder={t(
                      "jobApplications.fields.rejectionNotePlaceholder",
                    )}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  {t("jobApplications.fields.reviewNotes")} (
                  {t("common.optional")})
                </Label>
                <Textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={
                    updateApplication.isPending ||
                    (actionStatus === "ACCEPTED" && rating === 0) ||
                    (actionStatus === "REJECTED" && !rejectionNote.trim())
                  }
                >
                  {t("common.save")}
                </Button>
                <Button variant="outline" onClick={() => setActionStatus(null)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interview Evaluation Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            تقييم المقابلة
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-7 text-xs ms-auto"
              onClick={openEvalDialog}
            >
              {evalData ? "تعديل التقييم" : "إنشاء تقييم"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!evalData ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              لم يتم إجراء تقييم رسمي للمقابلة بعد
            </p>
          ) : (
            <div className="space-y-3">
              {/* Scores */}
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "شخصي (40)", value: evalData.personalScore },
                  { label: "تقني (40)", value: evalData.technicalScore },
                  { label: "حاسوبي (20)", value: evalData.computerScore },
                  {
                    label: "المجموع",
                    value: evalData.totalScore,
                    highlight: true,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-lg border p-3 text-center ${item.highlight ? "border-primary/30 bg-primary/5" : ""}`}
                  >
                    <p className="text-xs text-muted-foreground">
                      {item.label}
                    </p>
                    <p
                      className={`text-xl font-bold mt-0.5 ${item.highlight ? "text-primary" : ""}`}
                    >
                      {item.value != null ? item.value.toFixed(1) : "—"}
                    </p>
                  </div>
                ))}
              </div>
              {/* Decision */}
              {evalData.decision && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">القرار:</span>
                  <Badge
                    className={`text-xs ${
                      evalData.decision === "ACCEPTED"
                        ? "bg-green-100 text-green-700"
                        : evalData.decision === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {
                      {
                        ACCEPTED: "مقبول",
                        REFERRED_TO_OTHER: "مرشح لشاغر آخر",
                        DEFERRED: "مؤجل",
                        REJECTED: "مرفوض",
                      }[evalData.decision as string]
                    }
                  </Badge>
                </div>
              )}
              {evalData.proposedSalary && (
                <p className="text-sm text-muted-foreground">
                  الراتب المقترح:{" "}
                  <strong>
                    ${Number(evalData.proposedSalary).toLocaleString("en-US")}
                  </strong>
                </p>
              )}
              {/* Transfer button */}
              {evalData.decision === "ACCEPTED" && !evalData.isTransferred && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs border-green-300 text-green-700 hover:bg-green-50"
                  onClick={() => transferToEmployee.mutate(evalData.id)}
                  disabled={transferToEmployee.isPending}
                >
                  <Send className="h-3.5 w-3.5" />
                  نقل النتيجة لسجل الموظف
                </Button>
              )}
              {evalData.isTransferred && (
                <Badge variant="default" className="bg-green-600 gap-1 text-xs">
                  <Trophy className="h-3 w-3" />
                  تم النقل لسجل الموظف
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {t("jobApplications.fields.createdAt")}:{" "}
        {format(new Date(app.createdAt), "yyyy/MM/dd HH:mm")}
      </p>

      {/* Evaluation Dialog */}
      <Dialog open={evalDialogOpen} onOpenChange={setEvalDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {evalData ? "تعديل تقييم المقابلة" : "إنشاء تقييم المقابلة"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Position */}
            <div className="space-y-1.5">
              <Label>الشاغر الوظيفي *</Label>
              <Select
                value={evalForm.positionId}
                onValueChange={(v) =>
                  setEvalForm({
                    ...evalForm,
                    positionId: v,
                    technicalScores: {},
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الشاغر" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.jobTitle} — {p.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Personal Criteria */}
            {pCriteria.length > 0 && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">
                  الصفات الشخصية (من 5 لكل معيار)
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {pCriteria.map((c: any) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <Label className="text-xs flex-1">{c.nameAr}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={c.maxScore}
                        value={evalForm.personalScores[c.id] ?? ""}
                        onChange={(e) =>
                          setEvalForm({
                            ...evalForm,
                            personalScores: {
                              ...evalForm.personalScores,
                              [c.id]: Number(e.target.value),
                            },
                          })
                        }
                        className="w-16 h-7 text-center text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Questions */}
            {evalForm.positionId && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">الأسئلة الاختصاصية</p>
                {techQuestionsLoading ? (
                  <p className="text-xs text-muted-foreground py-2">
                    جاري تحميل الأسئلة...
                  </p>
                ) : techQuestions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    لا توجد أسئلة تقنية لهذا الشاغر
                  </p>
                ) : (
                  <div className="space-y-2">
                    {techQuestions.map((q: any) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <Label className="text-xs flex-1">{q.question}</Label>
                        <span className="text-xs text-muted-foreground shrink-0">
                          /{q.maxScore}
                        </span>
                        <Input
                          type="number"
                          min={1}
                          max={q.maxScore}
                          value={evalForm.technicalScores[q.id] ?? ""}
                          onChange={(e) =>
                            setEvalForm({
                              ...evalForm,
                              technicalScores: {
                                ...evalForm.technicalScores,
                                [q.id]: Number(e.target.value),
                              },
                            })
                          }
                          className="w-16 h-7 text-center text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Computer Criteria */}
            {cCriteria.length > 0 && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">
                  المهارات الحاسوبية (من 5 لكل معيار)
                </p>
                <div className="space-y-2">
                  {cCriteria.map((c: any) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <Label className="text-xs flex-1">{c.nameAr}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={c.maxScore}
                        value={evalForm.computerScores[c.id] ?? ""}
                        onChange={(e) =>
                          setEvalForm({
                            ...evalForm,
                            computerScores: {
                              ...evalForm.computerScores,
                              [c.id]: Number(e.target.value),
                            },
                          })
                        }
                        className="w-16 h-7 text-center text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision + notes */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>القرار</Label>
                <Select
                  value={evalForm.decision || "none"}
                  onValueChange={(v) =>
                    setEvalForm({
                      ...evalForm,
                      decision: v === "none" ? "" : (v as InterviewDecision),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القرار" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="ACCEPTED">مقبول</SelectItem>
                    <SelectItem value="REFERRED_TO_OTHER">
                      مرشح لشاغر آخر
                    </SelectItem>
                    <SelectItem value="DEFERRED">مؤجل</SelectItem>
                    <SelectItem value="REJECTED">مرفوض</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>الراتب المقترح ($)</Label>
                <Input
                  type="number"
                  value={evalForm.proposedSalary}
                  onChange={(e) =>
                    setEvalForm({ ...evalForm, proposedSalary: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات عامة</Label>
              <Textarea
                rows={3}
                value={evalForm.generalNotes}
                onChange={(e) =>
                  setEvalForm({ ...evalForm, generalNotes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvalDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSaveEval}
              disabled={
                !evalForm.positionId ||
                createEval.isPending ||
                updateEval.isPending
              }
            >
              {evalData ? "حفظ التعديلات" : "حفظ التقييم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmployeeDialog
        open={addEmployeeOpen}
        onOpenChange={setAddEmployeeOpen}
        defaultInterviewEvaluation={
          app.rating ? RATING_TO_EVALUATION[app.rating] : undefined
        }
      />
    </div>
  );
}
