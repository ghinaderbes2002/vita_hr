"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, XCircle, Send } from "lucide-react";
import { EvaluationForm, GmStatus } from "@/lib/api/evaluation-forms";
import { useGmApproval } from "@/lib/hooks/use-evaluation-forms";
import { Badge } from "@/components/ui/badge";

interface GmApprovalTabProps {
  form: EvaluationForm;
}

export function GmApprovalTab({ form }: GmApprovalTabProps) {
  const mutation = useGmApproval();

  const [status, setStatus] = useState<GmStatus>(form.gmStatus || "APPROVED");
  const [comments, setComments] = useState(form.gmComments || "");

  useEffect(() => {
    setStatus(form.gmStatus || "APPROVED");
    setComments(form.gmComments || "");
  }, [form]);

  const handleSubmit = () => {
    mutation.mutate({
      id: form.id,
      data: {
        status,
        comments: comments || undefined,
      },
    });
  };

  const canEdit = form.status === "HR_REVIEW" || form.status === "GM_APPROVAL";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>موافقة المدير العام</CardTitle>
          <CardDescription>
            الموافقة النهائية على نموذج التقييم
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Complete Evaluation Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">التقييم الذاتي</h4>
              <p className="text-2xl font-bold text-blue-600">
                {form.totalSelfScore?.toFixed(1) || "-"}
              </p>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="text-sm font-semibold text-orange-900 mb-1">تقييم المدير</h4>
              <p className="text-2xl font-bold text-orange-600">
                {form.totalManagerScore?.toFixed(1) || "-"}
              </p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-semibold text-green-900 mb-1">الدرجة النهائية</h4>
              <p className="text-2xl font-bold text-green-600">
                {form.finalScore?.toFixed(1) || "-"}
              </p>
            </div>
          </div>

          {/* Manager Summary */}
          {(form.managerStrengths || form.managerWeaknesses || form.managerRecommendations) && (
            <div className="space-y-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-900">ملخص تقييم المدير</h4>
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
                  <p className="text-sm font-medium">التوصيات:</p>
                  <p className="text-sm text-muted-foreground">{form.managerRecommendations}</p>
                </div>
              )}
            </div>
          )}

          {/* HR Review Summary */}
          {form.hrComments && (
            <div className="space-y-2 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex justify-between items-start">
                <h4 className="font-semibold text-purple-900">مراجعة الموارد البشرية</h4>
                {form.hrRecommendation && (
                  <Badge className="bg-purple-100 text-purple-800">
                    {form.hrRecommendation}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-purple-700">{form.hrComments}</p>
            </div>
          )}

          {/* GM Decision Form */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-3">
              <Label>القرار</Label>
              <RadioGroup
                value={status}
                onValueChange={(value) => setStatus(value as GmStatus)}
                disabled={!canEdit}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2 space-x-reverse border rounded-lg p-4 flex-1 cursor-pointer hover:bg-green-50">
                  <RadioGroupItem value="APPROVED" id="approved" />
                  <Label htmlFor="approved" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">موافقة</p>
                      <p className="text-xs text-muted-foreground">الموافقة على التقييم</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse border rounded-lg p-4 flex-1 cursor-pointer hover:bg-red-50">
                  <RadioGroupItem value="REJECTED" id="rejected" />
                  <Label htmlFor="rejected" className="flex items-center gap-2 cursor-pointer flex-1">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">رفض</p>
                      <p className="text-xs text-muted-foreground">رفض التقييم</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات المدير العام (اختياري)</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="أضف ملاحظاتك أو تعليقاتك على القرار..."
                rows={4}
                disabled={!canEdit}
              />
            </div>

            {canEdit && (
              <Button
                onClick={handleSubmit}
                disabled={mutation.isPending}
                className="w-full"
              >
                <Send className="h-4 w-4 ml-2" />
                إرسال القرار
              </Button>
            )}

            {!canEdit && form.status !== "HR_REVIEW" && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {form.status === "COMPLETED"
                    ? "تم إرسال قرار المدير العام"
                    : "يجب على الموارد البشرية مراجعة التقييم أولاً"}
                </p>
              </div>
            )}
          </div>

          {/* Current GM Decision (if exists) */}
          {form.gmStatus && (
            <div className={`p-4 border rounded-lg ${
              form.gmStatus === "APPROVED"
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-start gap-2 mb-2">
                {form.gmStatus === "APPROVED" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <h4 className={`font-semibold ${
                    form.gmStatus === "APPROVED" ? "text-green-900" : "text-red-900"
                  }`}>
                    القرار: {form.gmStatus === "APPROVED" ? "موافق" : "مرفوض"}
                  </h4>
                  {form.gmComments && (
                    <p className={`text-sm mt-1 ${
                      form.gmStatus === "APPROVED" ? "text-green-700" : "text-red-700"
                    }`}>
                      {form.gmComments}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
