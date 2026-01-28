"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send } from "lucide-react";
import { EvaluationForm, HrRecommendation } from "@/lib/api/evaluation-forms";
import { useHrReview } from "@/lib/hooks/use-evaluation-forms";
import { Badge } from "@/components/ui/badge";

interface HrReviewTabProps {
  form: EvaluationForm;
}

export function HrReviewTab({ form }: HrReviewTabProps) {
  const mutation = useHrReview();

  const [comments, setComments] = useState(form.hrComments || "");
  const [recommendation, setRecommendation] = useState<HrRecommendation>(
    form.hrRecommendation || "NO_ACTION"
  );

  useEffect(() => {
    setComments(form.hrComments || "");
    setRecommendation(form.hrRecommendation || "NO_ACTION");
  }, [form]);

  const handleSubmit = () => {
    mutation.mutate({
      id: form.id,
      data: {
        comments,
        recommendation,
      },
    });
  };

  const canEdit = form.status === "MANAGER_SUBMITTED" || form.status === "HR_REVIEW";

  const recommendationOptions = [
    { value: "NO_ACTION", label: "لا يوجد إجراء" },
    { value: "SALARY_INCREASE", label: "زيادة راتب" },
    { value: "PROMOTION", label: "ترقية" },
    { value: "TRAINING", label: "تدريب" },
    { value: "WARNING", label: "إنذار" },
    { value: "TERMINATION", label: "إنهاء خدمات" },
  ];

  const getRecommendationBadge = (rec: HrRecommendation) => {
    const config = {
      NO_ACTION: { label: "لا يوجد إجراء", className: "bg-gray-100 text-gray-800" },
      SALARY_INCREASE: { label: "زيادة راتب", className: "bg-green-100 text-green-800" },
      PROMOTION: { label: "ترقية", className: "bg-blue-100 text-blue-800" },
      TRAINING: { label: "تدريب", className: "bg-yellow-100 text-yellow-800" },
      WARNING: { label: "إنذار", className: "bg-orange-100 text-orange-800" },
      TERMINATION: { label: "إنهاء خدمات", className: "bg-red-100 text-red-800" },
    };

    const item = config[rec];
    return <Badge className={item.className}>{item.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>مراجعة الموارد البشرية</CardTitle>
          <CardDescription>
            مراجعة التقييم وتقديم التوصيات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Evaluation Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">التقييم الذاتي</h4>
              <p className="text-2xl font-bold text-blue-600">
                {form.totalSelfScore?.toFixed(1) || "-"}
              </p>
              {form.selfComments && (
                <p className="text-xs text-blue-700 mt-2 line-clamp-2">{form.selfComments}</p>
              )}
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="text-sm font-semibold text-orange-900 mb-2">تقييم المدير</h4>
              <p className="text-2xl font-bold text-orange-600">
                {form.totalManagerScore?.toFixed(1) || "-"}
              </p>
              {form.managerComments && (
                <p className="text-xs text-orange-700 mt-2 line-clamp-2">{form.managerComments}</p>
              )}
            </div>
          </div>

          {/* Manager's detailed feedback */}
          {(form.managerStrengths || form.managerWeaknesses || form.managerRecommendations) && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold">ملخص تقييم المدير</h4>
              {form.managerStrengths && (
                <div>
                  <p className="text-sm font-medium text-green-700">نقاط القوة:</p>
                  <p className="text-sm text-muted-foreground">{form.managerStrengths}</p>
                </div>
              )}
              {form.managerWeaknesses && (
                <div>
                  <p className="text-sm font-medium text-red-700">نقاط الضعف:</p>
                  <p className="text-sm text-muted-foreground">{form.managerWeaknesses}</p>
                </div>
              )}
              {form.managerRecommendations && (
                <div>
                  <p className="text-sm font-medium">توصيات المدير:</p>
                  <p className="text-sm text-muted-foreground">{form.managerRecommendations}</p>
                </div>
              )}
            </div>
          )}

          {/* HR Review Form */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>التوصية</Label>
              <Select
                value={recommendation}
                onValueChange={(value) => setRecommendation(value as HrRecommendation)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر التوصية" />
                </SelectTrigger>
                <SelectContent>
                  {recommendationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات الموارد البشرية</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="أضف ملاحظاتك ومراجعتك للتقييم..."
                rows={5}
                disabled={!canEdit}
              />
            </div>

            {canEdit && (
              <Button
                onClick={handleSubmit}
                disabled={mutation.isPending || !comments.trim()}
                className="w-full"
              >
                <Send className="h-4 w-4 ml-2" />
                إرسال المراجعة
              </Button>
            )}

            {!canEdit && form.status !== "MANAGER_SUBMITTED" && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {form.status === "HR_REVIEW" || form.status === "GM_APPROVAL" || form.status === "COMPLETED"
                    ? "تم إرسال مراجعة الموارد البشرية"
                    : "يجب على المدير إرسال التقييم أولاً"}
                </p>
              </div>
            )}
          </div>

          {/* Current HR Review (if exists) */}
          {form.hrComments && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-purple-900">المراجعة الحالية</h4>
                {form.hrRecommendation && getRecommendationBadge(form.hrRecommendation)}
              </div>
              <p className="text-sm text-purple-700">{form.hrComments}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
