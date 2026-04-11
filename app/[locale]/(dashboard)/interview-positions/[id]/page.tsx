"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight, Plus, Trash2, Trophy, BarChart2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useInterviewPosition,
  useInterviewPositionComparison,
  useAddTechnicalQuestion,
  useDeleteTechnicalQuestion,
} from "@/lib/hooks/use-interview-positions";
import { InterviewDecision } from "@/lib/api/interview-evaluations";

const DECISION_CLASSES: Record<InterviewDecision, string> = {
  ACCEPTED:          "bg-green-100 text-green-700",
  REFERRED_TO_OTHER: "bg-blue-100 text-blue-700",
  DEFERRED:          "bg-amber-100 text-amber-700",
  REJECTED:          "bg-red-100 text-red-700",
};

export default function InterviewPositionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("interviewPositions");
  const tCommon = useTranslations("common");

  const [qDialogOpen, setQDialogOpen] = useState(false);
  const [deleteQOpen, setDeleteQOpen] = useState(false);
  const [selectedQId, setSelectedQId] = useState("");
  const [qForm, setQForm] = useState({ text: "", maxScore: "10" });
  const [showComparison, setShowComparison] = useState(false);

  const { data: position, isLoading } = useInterviewPosition(id);
  const { data: comparison, isLoading: compLoading } = useInterviewPositionComparison(id, showComparison);
  const addQuestion = useAddTechnicalQuestion(id);
  const deleteQuestion = useDeleteTechnicalQuestion(id);

  const rawPos = position as any;
  const pos = rawPos
    ? {
        ...rawPos,
        committeeMembers: Array.isArray(rawPos.committeeMembers)
          ? rawPos.committeeMembers
          : rawPos.committeeMembers
          ? String(rawPos.committeeMembers).split(",").map((s: string) => s.trim()).filter(Boolean)
          : [],
      }
    : rawPos;
  const comp = comparison as any;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!pos) return null;

  function handleAddQuestion() {
    if (!qForm.text.trim()) return;
    const nextOrder = (pos.technicalQuestions?.length || 0) + 1;
    addQuestion.mutate(
      { text: qForm.text, maxScore: Number(qForm.maxScore) || 10, displayOrder: nextOrder },
      { onSuccess: () => { setQDialogOpen(false); setQForm({ text: "", maxScore: "10" }); } }
    );
  }

  const statusClass =
    pos.status === "OPEN" ? "bg-green-100 text-green-700 border-green-200" :
    pos.status === "CLOSED" ? "bg-gray-100 text-gray-600 border-gray-200" :
    "bg-amber-100 text-amber-700 border-amber-200";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{pos.jobTitle}</h1>
          <p className="text-muted-foreground text-sm">{pos.department}</p>
        </div>
        <Badge className={`mr-auto text-xs border ${statusClass}`}>
          {t(`status.${pos.status}`)}
        </Badge>
      </div>

      {/* Position Info */}
      <div className="grid gap-4 sm:grid-cols-3 text-sm">
        {pos.workType && (
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("detail.workType")}</p>
            <p className="font-medium mt-0.5">{t(`workType.${pos.workType}`)}</p>
          </div>
        )}
        {pos.workMode && (
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("detail.workMode")}</p>
            <p className="font-medium mt-0.5">{t(`workMode.${pos.workMode}`)}</p>
          </div>
        )}
        {pos.interviewDate && (
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("detail.interviewDate")}</p>
            <p className="font-medium mt-0.5">{new Date(pos.interviewDate).toLocaleDateString()}</p>
          </div>
        )}
        {pos.committeeMembers?.length > 0 && (
          <div className="rounded-lg border p-3 sm:col-span-3">
            <p className="text-xs text-muted-foreground mb-1">{t("detail.committee")}</p>
            <div className="flex flex-wrap gap-1.5">
              {pos.committeeMembers.map((m: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Technical Questions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {t("detail.technicalQuestions")}
            <Badge variant="secondary" className="mr-auto">{pos.technicalQuestions?.length || 0}</Badge>
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs ms-auto"
              onClick={() => setQDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" />{t("detail.addQuestion")}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!pos.technicalQuestions?.length ? (
            <p className="text-center py-4 text-sm text-muted-foreground">{t("detail.noQuestions")}</p>
          ) : (
            <div className="space-y-2">
              {pos.technicalQuestions.map((q: any, i: number) => (
                <div key={q.id} className="flex items-start justify-between rounded-lg border p-3 gap-3">
                  <div className="flex gap-3 flex-1">
                    <span className="text-muted-foreground text-sm shrink-0 w-5">{i + 1}.</span>
                    <p className="text-sm">{q.question}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">{t("detail.score", { score: q.maxScore })}</Badge>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => { setSelectedQId(q.id); setDeleteQOpen(true); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candidates Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            {t("detail.comparison")}
            <Button
              size="sm" variant="outline" className="gap-1.5 h-7 text-xs ms-auto"
              onClick={() => setShowComparison(true)}
              disabled={showComparison}
            >
              {showComparison ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
              {t("detail.showComparison")}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showComparison ? (
            <p className="text-center py-4 text-sm text-muted-foreground">{t("detail.comparisonHint")}</p>
          ) : compLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !comp?.candidates?.length ? (
            <p className="text-center py-4 text-sm text-muted-foreground">{t("detail.noCandidates")}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{t("detail.totalCandidates")}: <strong className="text-foreground">{comp.total}</strong></span>
                <span>{t("detail.accepted")}: <strong className="text-green-600">{comp.accepted}</strong></span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("detail.rank")}</TableHead>
                      <TableHead>{t("detail.candidate")}</TableHead>
                      <TableHead>{t("detail.personal")}</TableHead>
                      <TableHead>{t("detail.technical")}</TableHead>
                      <TableHead>{t("detail.computer")}</TableHead>
                      <TableHead>{t("detail.total")}</TableHead>
                      <TableHead>{t("detail.decision")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comp.candidates.map((c: any, i: number) => (
                      <TableRow key={c.id} className={i === 0 ? "bg-amber-50/50" : ""}>
                        <TableCell>
                          {i === 0 ? <Trophy className="h-4 w-4 text-amber-500" /> : <span className="text-muted-foreground text-sm">#{i + 1}</span>}
                        </TableCell>
                        <TableCell className="font-medium">{c.candidateName}</TableCell>
                        <TableCell>{c.personalScore?.toFixed(1) || "—"}</TableCell>
                        <TableCell>{c.technicalScore?.toFixed(1) || "—"}</TableCell>
                        <TableCell>{c.computerScore?.toFixed(1) || "—"}</TableCell>
                        <TableCell className="font-bold text-primary">{c.totalScore?.toFixed(1) || "—"}</TableCell>
                        <TableCell>
                          {c.decision ? (
                            <Badge className={`text-xs ${DECISION_CLASSES[c.decision as InterviewDecision]}`}>
                              {t(`decisions.${c.decision}`)}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Question Dialog */}
      <Dialog open={qDialogOpen} onOpenChange={setQDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t("detail.addQuestionTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("detail.questionText")} *</Label>
              <Input
                value={qForm.text}
                onChange={(e) => setQForm({ ...qForm, text: e.target.value })}
                placeholder={t("detail.questionPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("detail.maxScore")}</Label>
              <Input
                type="number"
                value={qForm.maxScore}
                onChange={(e) => setQForm({ ...qForm, maxScore: e.target.value })}
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQDialogOpen(false)}>{tCommon("cancel")}</Button>
            <Button onClick={handleAddQuestion} disabled={!qForm.text.trim() || addQuestion.isPending}>
              {tCommon("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteQOpen}
        onOpenChange={setDeleteQOpen}
        title={t("detail.deleteQuestion")}
        description={t("detail.deleteQuestionConfirm")}
        onConfirm={() => deleteQuestion.mutate(selectedQId, { onSuccess: () => setDeleteQOpen(false) })}
        variant="destructive"
      />
    </div>
  );
}
