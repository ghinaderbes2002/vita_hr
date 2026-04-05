"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight, Plus, Trash2, Trophy, User, BarChart2,
  CheckCircle2, XCircle, Clock, RefreshCw,
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

const DECISION_CONFIG: Record<InterviewDecision, { label: string; className: string }> = {
  ACCEPTED:          { label: "مقبول",                  className: "bg-green-100 text-green-700" },
  REFERRED_TO_OTHER: { label: "مرشح لشاغر آخر",         className: "bg-blue-100 text-blue-700" },
  DEFERRED:          { label: "مؤجل",                   className: "bg-amber-100 text-amber-700" },
  REJECTED:          { label: "مرفوض",                  className: "bg-red-100 text-red-700" },
};

export default function InterviewPositionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [qDialogOpen, setQDialogOpen] = useState(false);
  const [deleteQOpen, setDeleteQOpen] = useState(false);
  const [selectedQId, setSelectedQId] = useState("");
  const [qForm, setQForm] = useState({ text: "", maxScore: "10" });
  const [showComparison, setShowComparison] = useState(false);

  const { data: position, isLoading } = useInterviewPosition(id);
  const { data: comparison, isLoading: compLoading } = useInterviewPositionComparison(id, showComparison);
  const addQuestion = useAddTechnicalQuestion(id);
  const deleteQuestion = useDeleteTechnicalQuestion(id);

  const pos = position as any;
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
        <Badge className={`mr-auto text-xs border ${
          pos.status === "OPEN" ? "bg-green-100 text-green-700 border-green-200" :
          pos.status === "CLOSED" ? "bg-gray-100 text-gray-600 border-gray-200" :
          "bg-amber-100 text-amber-700 border-amber-200"
        }`}>
          {pos.status === "OPEN" ? "مفتوح" : pos.status === "CLOSED" ? "مغلق" : "موقوف"}
        </Badge>
      </div>

      {/* Position Info */}
      <div className="grid gap-4 sm:grid-cols-3 text-sm">
        {pos.workType && <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">نوع الدوام</p><p className="font-medium mt-0.5">{pos.workType === "FULL_TIME" ? "دوام كامل" : "دوام جزئي"}</p></div>}
        {pos.workMode && <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">طريقة العمل</p><p className="font-medium mt-0.5">{{ ON_SITE: "حضوري", REMOTE: "عن بُعد", HYBRID: "هجين" }[pos.workMode as string]}</p></div>}
        {pos.interviewDate && <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">تاريخ المقابلة</p><p className="font-medium mt-0.5">{new Date(pos.interviewDate).toLocaleDateString("ar-EG")}</p></div>}
        {pos.committeeMembers?.length > 0 && (
          <div className="rounded-lg border p-3 sm:col-span-3">
            <p className="text-xs text-muted-foreground mb-1">لجنة المقابلة</p>
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
            الأسئلة التقنية
            <Badge variant="secondary" className="mr-auto">{pos.technicalQuestions?.length || 0}</Badge>
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs ms-auto"
              onClick={() => setQDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" />إضافة سؤال
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!pos.technicalQuestions?.length ? (
            <p className="text-center py-4 text-sm text-muted-foreground">لا توجد أسئلة تقنية — أضف سؤالاً للبدء</p>
          ) : (
            <div className="space-y-2">
              {pos.technicalQuestions.map((q: any, i: number) => (
                <div key={q.id} className="flex items-start justify-between rounded-lg border p-3 gap-3">
                  <div className="flex gap-3 flex-1">
                    <span className="text-muted-foreground text-sm shrink-0 w-5">{i + 1}.</span>
                    <p className="text-sm">{q.question}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">{q.maxScore} درجة</Badge>
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
            مقارنة المرشحين
            <Button
              size="sm" variant="outline" className="gap-1.5 h-7 text-xs ms-auto"
              onClick={() => setShowComparison(true)}
              disabled={showComparison}
            >
              {showComparison ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
              عرض المقارنة
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showComparison ? (
            <p className="text-center py-4 text-sm text-muted-foreground">اضغط "عرض المقارنة" لتحميل بيانات المرشحين</p>
          ) : compLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !comp?.candidates?.length ? (
            <p className="text-center py-4 text-sm text-muted-foreground">لا يوجد مرشحون مقيَّمون لهذا الشاغر بعد</p>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>إجمالي المرشحين: <strong className="text-foreground">{comp.total}</strong></span>
                <span>المقبولون: <strong className="text-green-600">{comp.accepted}</strong></span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الترتيب</TableHead>
                      <TableHead>المرشح</TableHead>
                      <TableHead>شخصي (40)</TableHead>
                      <TableHead>تقني (40)</TableHead>
                      <TableHead>حاسوبي (20)</TableHead>
                      <TableHead>المجموع</TableHead>
                      <TableHead>القرار</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comp.candidates.map((c: any, i: number) => {
                      const dcfg = c.decision ? DECISION_CONFIG[c.decision as InterviewDecision] : null;
                      return (
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
                            {dcfg ? (
                              <Badge className={`text-xs ${dcfg.className}`}>{dcfg.label}</Badge>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
          <DialogHeader><DialogTitle>إضافة سؤال تقني</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>نص السؤال *</Label>
              <Input
                value={qForm.text}
                onChange={(e) => setQForm({ ...qForm, text: e.target.value })}
                placeholder="ما الفرق بين REST وGraphQL؟"
              />
            </div>
            <div className="space-y-1.5">
              <Label>الدرجة القصوى</Label>
              <Input
                type="number"
                value={qForm.maxScore}
                onChange={(e) => setQForm({ ...qForm, maxScore: e.target.value })}
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleAddQuestion} disabled={!qForm.text.trim() || addQuestion.isPending}>
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteQOpen}
        onOpenChange={setDeleteQOpen}
        title="حذف السؤال"
        description="هل أنت متأكد من حذف هذا السؤال؟"
        onConfirm={() => deleteQuestion.mutate(selectedQId, { onSuccess: () => setDeleteQOpen(false) })}
        variant="destructive"
      />
    </div>
  );
}
