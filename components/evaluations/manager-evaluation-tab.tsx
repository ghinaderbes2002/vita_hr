"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Send } from "lucide-react";
import { EvaluationForm } from "@/lib/api/evaluation-forms";
import { useSaveManagerEvaluation, useSubmitManagerEvaluation } from "@/lib/hooks/use-evaluation-forms";

interface ManagerEvaluationTabProps {
  form: EvaluationForm;
}

export function ManagerEvaluationTab({ form }: ManagerEvaluationTabProps) {
  const saveMutation = useSaveManagerEvaluation();
  const submitMutation = useSubmitManagerEvaluation();

  const [sections, setSections] = useState(
    form.sections.map((section) => ({
      criteriaId: section.criteriaId,
      score: section.managerScore || 0,
      comments: section.managerComments || "",
    }))
  );
  const [comments, setComments] = useState(form.managerComments || "");
  const [strengths, setStrengths] = useState(form.managerStrengths || "");
  const [weaknesses, setWeaknesses] = useState(form.managerWeaknesses || "");
  const [recommendations, setRecommendations] = useState(form.managerRecommendations || "");

  // Update local state when form data changes
  useEffect(() => {
    setSections(
      form.sections.map((section) => ({
        criteriaId: section.criteriaId,
        score: section.managerScore || 0,
        comments: section.managerComments || "",
      }))
    );
    setComments(form.managerComments || "");
    setStrengths(form.managerStrengths || "");
    setWeaknesses(form.managerWeaknesses || "");
    setRecommendations(form.managerRecommendations || "");
  }, [form]);

  const handleScoreChange = (criteriaId: string, score: number) => {
    setSections((prev) =>
      prev.map((s) =>
        s.criteriaId === criteriaId ? { ...s, score } : s
      )
    );
  };

  const handleCommentChange = (criteriaId: string, comment: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.criteriaId === criteriaId ? { ...s, comments: comment } : s
      )
    );
  };

  const handleSave = () => {
    saveMutation.mutate({
      id: form.id,
      data: {
        sections: sections.map((s) => ({
          criteriaId: s.criteriaId,
          score: s.score,
          comments: s.comments || undefined,
        })),
        comments,
        strengths: strengths || undefined,
        weaknesses: weaknesses || undefined,
        recommendations: recommendations || undefined,
      },
    });
  };

  const handleSubmit = () => {
    submitMutation.mutate(form.id);
  };

  const canEdit = form.status === "SELF_SUBMITTED" || form.status === "MANAGER_EVALUATION";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>تقييم المدير</CardTitle>
          <CardDescription>
            قم بتقييم أداء الموظف بناءً على المعايير التالية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Show Self Evaluation First */}
          {form.totalSelfScore && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">التقييم الذاتي للموظف</h4>
              <div className="space-y-2">
                {form.sections.map((section) => (
                  <div key={section.criteriaId} className="flex justify-between text-sm">
                    <span className="text-blue-700">{section.criteria?.nameAr}</span>
                    <span className="font-medium text-blue-900">
                      {section.selfScore || "-"} / {section.criteria?.maxScore}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-blue-300">
                  <span className="font-semibold text-blue-900">المجموع الكلي</span>
                  <span className="font-bold text-blue-900">{form.totalSelfScore.toFixed(1)}</span>
                </div>
              </div>
              {form.selfComments && (
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">ملاحظات الموظف: </span>
                    {form.selfComments}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Criteria Sections */}
          {form.sections.map((section, index) => {
            const sectionData = sections[index];
            return (
              <div key={section.criteriaId} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold">{section.criteria?.nameAr}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      الوزن: {section.criteria?.weight} | الحد الأقصى: {section.criteria?.maxScore}
                    </p>
                    {section.selfScore !== undefined && (
                      <p className="text-sm text-blue-600 mt-1">
                        التقييم الذاتي: {section.selfScore}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Label className="text-sm text-muted-foreground">الدرجة</Label>
                    <Input
                      type="number"
                      min={0}
                      max={section.criteria?.maxScore}
                      value={sectionData?.score || 0}
                      onChange={(e) =>
                        handleScoreChange(section.criteriaId, Number(e.target.value))
                      }
                      className="w-20 mt-1 text-center"
                      disabled={!canEdit}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">ملاحظات</Label>
                  <Textarea
                    value={sectionData?.comments || ""}
                    onChange={(e) =>
                      handleCommentChange(section.criteriaId, e.target.value)
                    }
                    placeholder="أضف ملاحظاتك هنا..."
                    rows={2}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            );
          })}

          {/* General Comments */}
          <div className="space-y-2">
            <Label>ملاحظات عامة</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="أضف ملاحظاتك العامة..."
              rows={3}
              disabled={!canEdit}
            />
          </div>

          {/* Strengths */}
          <div className="space-y-2">
            <Label>نقاط القوة</Label>
            <Textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="اذكر نقاط القوة الرئيسية للموظف..."
              rows={3}
              disabled={!canEdit}
            />
          </div>

          {/* Weaknesses */}
          <div className="space-y-2">
            <Label>نقاط الضعف</Label>
            <Textarea
              value={weaknesses}
              onChange={(e) => setWeaknesses(e.target.value)}
              placeholder="اذكر نقاط الضعف التي تحتاج لتحسين..."
              rows={3}
              disabled={!canEdit}
            />
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <Label>التوصيات</Label>
            <Textarea
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="ما هي توصياتك لتطوير الموظف؟"
              rows={3}
              disabled={!canEdit}
            />
          </div>

          {/* Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">المجموع الكلي</span>
              <span className="text-2xl font-bold text-orange-600">
                {form.totalManagerScore?.toFixed(1) || "0.0"}
              </span>
            </div>
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                variant="outline"
                className="flex-1"
              >
                <Save className="h-4 w-4 ml-2" />
                حفظ المسودة
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="flex-1"
              >
                <Send className="h-4 w-4 ml-2" />
                إرسال التقييم
              </Button>
            </div>
          )}

          {!canEdit && form.status !== "DRAFT" && form.status !== "SELF_EVALUATION" && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                {form.status === "MANAGER_SUBMITTED" || form.status === "HR_REVIEW" || form.status === "GM_APPROVAL" || form.status === "COMPLETED"
                  ? "تم إرسال تقييم المدير ولا يمكن تعديله"
                  : "يجب على الموظف إرسال التقييم الذاتي أولاً"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
