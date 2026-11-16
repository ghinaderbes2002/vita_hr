"use client";

import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowRight, Download, EyeOff, Lock, Paperclip, Save, Send, Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScorePicker, TaskStatusBadge } from "@/components/appraisal/appraisal-ui";
import {
  useAppraisalQuestions,
  useAppraisalSubmission,
  useAppraisalTasks,
  useDownloadAchievementFile,
  useSaveAppraisalSubmission,
  useSubmitAppraisalSubmission,
  useUploadAchievementFile,
} from "@/lib/hooks/use-appraisal";
import { ANONYMOUS_AXES, AppraisalInputAxis, SaveSubmissionData } from "@/lib/api/appraisal";

const INPUT_AXES: AppraisalInputAxis[] = ["SELF", "MANAGER", "UPWARD", "PEER"];
const ACHIEVEMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx";
const ACHIEVEMENT_MAX_BYTES = 10 * 1024 * 1024;

export default function AppraisalFormPage() {
  const t = useTranslations("appraisal");
  const router = useRouter();
  const params = useParams<{ cycleId: string; axis: string; evaluateeId: string }>();
  const cycleId = params.cycleId;
  const evaluateeId = params.evaluateeId;
  const axis = (INPUT_AXES.includes(params.axis as AppraisalInputAxis) ? params.axis : undefined) as
    | AppraisalInputAxis
    | undefined;

  const { data: tasksData, isLoading: tasksLoading } = useAppraisalTasks(cycleId);
  const { data: allQuestions, isLoading: questionsLoading } = useAppraisalQuestions();
  const { data: submission, isLoading: submissionLoading } = useAppraisalSubmission(cycleId, axis, evaluateeId);

  const saveMutation = useSaveAppraisalSubmission(cycleId);
  const submitMutation = useSubmitAppraisalSubmission(cycleId);
  const uploadMutation = useUploadAchievementFile(cycleId);
  const downloadMutation = useDownloadAchievementFile();

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");
  const [achievementNote, setAchievementNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [initialized, setInitialized] = useState(false);

  // تعبئة النموذج من التقييم المحفوظ مرة وحدة عند التحميل — إعادة الجلب لاحقاً
  // (بعد رفع المرفق مثلاً) لا تمسح تعديلات المستخدم غير المحفوظة.
  if (!initialized && !submissionLoading) {
    setInitialized(true);
    if (submission) {
      setAnswers(Object.fromEntries(submission.answers.map((a) => [a.questionId, a.score])));
      setComments(submission.comments ?? "");
      setAchievementNote(submission.achievementNote ?? "");
    }
  }

  const questions = useMemo(
    () => (allQuestions ?? []).filter((q) => q.axis === axis).sort((a, b) => a.displayOrder - b.displayOrder),
    [allQuestions, axis],
  );

  const task = tasksData?.tasks.find((x) => x.axis === axis && x.evaluateeId === evaluateeId);
  const isSubmitted = submission?.status === "SUBMITTED" || task?.status === "SUBMITTED";
  const readOnly = !tasksData?.canEdit || isSubmitted;
  const busy = saveMutation.isPending || submitMutation.isPending;
  const anonymous = axis ? ANONYMOUS_AXES.includes(axis) : false;
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;

  const backToList = () => router.push("/evaluations/360");

  if (!axis) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">{t("form.invalid")}</CardContent>
      </Card>
    );
  }

  if (tasksLoading || questionsLoading || submissionLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={backToList}>
          <ArrowRight className="me-2 h-4 w-4 ltr:rotate-180" />
          {t("form.back")}
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">{t("form.notFound")}</CardContent>
        </Card>
      </div>
    );
  }

  const buildPayload = (): SaveSubmissionData => {
    const payload: SaveSubmissionData = {
      axis,
      evaluateeId,
      answers: questions
        .filter((q) => answers[q.id] !== undefined)
        .map((q) => ({ questionId: q.id, score: answers[q.id] })),
    };
    // ترسل فقط إن وُجد نص، أو لمسح نص محفوظ سابقاً
    if (comments.trim() || submission?.comments) payload.comments = comments.trim();
    if (axis === "SELF" && (achievementNote.trim() || submission?.achievementNote)) {
      payload.achievementNote = achievementNote.trim();
    }
    return payload;
  };

  const handleSaveDraft = async () => {
    try {
      await saveMutation.mutateAsync(buildPayload());
      toast.success(t("messages.draftSaved"));
    } catch {
      // الخطأ معروض من الـ hook
    }
  };

  const handleSubmitClick = () => {
    const missing = questions.filter((q) => answers[q.id] === undefined).map((q) => q.displayOrder);
    if (missing.length > 0) {
      toast.error(t("form.missingAnswers", { questions: missing.join("، ") }));
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);
    // نحفظ آخر التعديلات أولاً لنضمن أن الإرسال يشمل كل الإجابات ولنحصل على id
    try {
      const saved = await saveMutation.mutateAsync(buildPayload());
      await submitMutation.mutateAsync(saved.id);
      backToList();
    } catch {
      // الخطأ معروض من الـ hook
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > ACHIEVEMENT_MAX_BYTES) {
      toast.error(t("form.fileTooLarge"));
      return;
    }
    uploadMutation.mutate(file);
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={backToList}>
        <ArrowRight className="me-2 h-4 w-4 ltr:rotate-180" />
        {t("form.back")}
      </Button>

      <PageHeader
        title={t(`form.titles.${axis}`)}
        description={`${task.evaluateeName}${task.evaluateeJobTitle ? ` — ${task.evaluateeJobTitle}` : ""}`}
        actions={<TaskStatusBadge status={task.status} />}
      />

      {anonymous && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <EyeOff className="h-4 w-4 shrink-0" />
          {t("anonymousNote")}
        </div>
      )}

      {readOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <Lock className="h-4 w-4 shrink-0" />
          {isSubmitted ? t("form.submittedNote") : t("my.readOnly")}
        </div>
      )}

      {axis === "MANAGER" && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={downloadMutation.isPending}
            onClick={() => downloadMutation.mutate({ cycleId, employeeId: evaluateeId })}
          >
            <Download className="me-2 h-4 w-4" />
            {t("form.downloadEmployeeAchievements")}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{t("form.questions")}</CardTitle>
          <span className="text-sm text-muted-foreground tabular-nums">
            {answeredCount} / {questions.length}
          </span>
        </CardHeader>
        <CardContent className="divide-y">
          {questions.map((question) => (
            <div key={question.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-medium">
                <span className="me-2 text-muted-foreground tabular-nums">{question.displayOrder}.</span>
                {question.textAr}
                <span className="ms-2 text-xs text-muted-foreground">({t("form.outOf", { max: question.maxScore })})</span>
              </p>
              <ScorePicker
                maxScore={question.maxScore}
                value={answers[question.id]}
                disabled={readOnly || busy}
                onChange={(score) => setAnswers((prev) => ({ ...prev, [question.id]: score }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {axis === "SELF" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("form.achievements")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("form.achievementNote")}</Label>
              <Textarea
                rows={4}
                value={achievementNote}
                disabled={readOnly || busy}
                onChange={(e) => setAchievementNote(e.target.value)}
                placeholder={t("form.achievementNotePlaceholder")}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!readOnly && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACHIEVEMENT_ACCEPT}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadMutation.isPending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="me-2 h-4 w-4" />
                    {uploadMutation.isPending
                      ? t("form.uploading")
                      : submission?.achievementFileUrl
                        ? t("form.replaceFile")
                        : t("form.uploadFile")}
                  </Button>
                </>
              )}
              {submission?.achievementFileUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={downloadMutation.isPending}
                  onClick={() => downloadMutation.mutate({ cycleId, employeeId: evaluateeId })}
                >
                  <Paperclip className="me-2 h-4 w-4" />
                  {t("form.downloadFile")}
                </Button>
              )}
              <p className="w-full text-xs text-muted-foreground">{t("form.fileHint")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-2 pt-6">
          <Label>{t("form.comments")}</Label>
          <Textarea
            rows={3}
            value={comments}
            disabled={readOnly || busy}
            onChange={(e) => setComments(e.target.value)}
            placeholder={t("form.commentsPlaceholder")}
          />
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={handleSaveDraft}>
            <Save className="me-2 h-4 w-4" />
            {t("form.saveDraft")}
          </Button>
          <Button disabled={busy} onClick={handleSubmitClick}>
            <Send className="me-2 h-4 w-4" />
            {t("form.submit")}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("form.confirmSubmitTitle")}
        description={t("form.confirmSubmitDescription")}
        confirmText={t("form.submit")}
        onConfirm={handleConfirmSubmit}
      />
    </div>
  );
}
