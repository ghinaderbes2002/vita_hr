"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Send } from "lucide-react";
import { EvaluationForm } from "@/lib/api/evaluation-forms";
import { useSaveSelfEvaluation, useSubmitSelfEvaluation } from "@/lib/hooks/use-evaluation-forms";

interface SelfEvaluationTabProps {
  form: EvaluationForm;
}

export function SelfEvaluationTab({ form }: SelfEvaluationTabProps) {
  const saveMutation = useSaveSelfEvaluation();
  const submitMutation = useSubmitSelfEvaluation();

  const [sections, setSections] = useState(
    form.sections.map((section) => ({
      criteriaId: section.criteriaId,
      score: section.selfScore || 0,
      comments: section.selfComments || "",
    }))
  );
  const [comments, setComments] = useState(form.selfComments || "");

  // Update local state when form data changes
  useEffect(() => {
    setSections(
      form.sections.map((section) => ({
        criteriaId: section.criteriaId,
        score: section.selfScore || 0,
        comments: section.selfComments || "",
      }))
    );
    setComments(form.selfComments || "");
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
      },
    });
  };

  const handleSubmit = () => {
    submitMutation.mutate(form.id);
  };

  const canEdit =
    form.status === "DRAFT" ||
    form.status === "SELF_EVALUATION" ||
    (form.status as any) === "PENDING_SELF"; // دعم الحالة من الباك

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>التقييم الذاتي</CardTitle>
          <CardDescription>
            قم بتقييم أدائك بناءً على المعايير التالية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
              placeholder="أضف ملاحظاتك العامة على أدائك..."
              rows={4}
              disabled={!canEdit}
            />
          </div>

          {/* Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">المجموع الكلي</span>
              <span className="text-2xl font-bold text-blue-600">
                {form.totalSelfScore?.toFixed(1) || "0.0"}
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

          {!canEdit && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                تم إرسال التقييم الذاتي ولا يمكن تعديله
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
