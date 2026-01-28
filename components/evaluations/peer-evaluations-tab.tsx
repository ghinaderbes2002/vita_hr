"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, UserRound, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  usePeerEvaluations,
  useSubmitPeerEvaluation,
} from "@/lib/hooks/use-peer-evaluations";
import { PeerEvaluation, PeerRating } from "@/lib/api/peer-evaluations";

interface PeerEvaluationsTabProps {
  formId: string;
}

export function PeerEvaluationsTab({ formId }: PeerEvaluationsTabProps) {
  const { data, isLoading } = usePeerEvaluations(formId);
  const submitMutation = useSubmitPeerEvaluation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    rating: "GOOD" as PeerRating,
    strengths: "",
    improvements: "",
    comments: "",
    isAnonymous: false,
  });

  const evaluations = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const ratingOptions = [
    { value: "EXCELLENT", label: "ممتاز", color: "text-green-600" },
    { value: "VERY_GOOD", label: "جيد جداً", color: "text-blue-600" },
    { value: "GOOD", label: "جيد", color: "text-cyan-600" },
    { value: "FAIR", label: "مقبول", color: "text-yellow-600" },
    { value: "POOR", label: "ضعيف", color: "text-red-600" },
  ];

  const getRatingBadge = (rating: PeerRating) => {
    const config = {
      EXCELLENT: { label: "ممتاز", className: "bg-green-100 text-green-800" },
      VERY_GOOD: { label: "جيد جداً", className: "bg-blue-100 text-blue-800" },
      GOOD: { label: "جيد", className: "bg-cyan-100 text-cyan-800" },
      FAIR: { label: "مقبول", className: "bg-yellow-100 text-yellow-800" },
      POOR: { label: "ضعيف", className: "bg-red-100 text-red-800" },
    };

    const item = config[rating];
    return <Badge className={item.className}>{item.label}</Badge>;
  };

  const handleSubmit = () => {
    submitMutation.mutate(
      {
        formId,
        data: {
          ...formData,
          strengths: formData.strengths || undefined,
          improvements: formData.improvements || undefined,
          comments: formData.comments || undefined,
        },
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setFormData({
            rating: "GOOD",
            strengths: "",
            improvements: "",
            comments: "",
            isAnonymous: false,
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>تقييمات الزملاء</CardTitle>
              <CardDescription>
                تقييمات الموظف من قبل زملائه في العمل
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة تقييم
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>تقييم زميل</DialogTitle>
                  <DialogDescription>
                    قدم تقييمك لأداء زميلك في العمل
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>التقدير *</Label>
                    <Select
                      value={formData.rating}
                      onValueChange={(value) =>
                        setFormData({ ...formData, rating: value as PeerRating })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ratingOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>{option.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>نقاط القوة</Label>
                    <Textarea
                      value={formData.strengths}
                      onChange={(e) =>
                        setFormData({ ...formData, strengths: e.target.value })
                      }
                      placeholder="ما هي نقاط القوة لدى زميلك؟"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>نقاط التحسين</Label>
                    <Textarea
                      value={formData.improvements}
                      onChange={(e) =>
                        setFormData({ ...formData, improvements: e.target.value })
                      }
                      placeholder="ما هي المجالات التي يمكن تحسينها؟"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>ملاحظات عامة</Label>
                    <Textarea
                      value={formData.comments}
                      onChange={(e) =>
                        setFormData({ ...formData, comments: e.target.value })
                      }
                      placeholder="أضف أي ملاحظات إضافية..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="anonymous"
                      checked={formData.isAnonymous}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isAnonymous: checked as boolean })
                      }
                    />
                    <Label
                      htmlFor="anonymous"
                      className="text-sm font-normal cursor-pointer"
                    >
                      تقييم مجهول (لن يظهر اسمك)
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                  >
                    إرسال التقييم
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : evaluations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">لا توجد تقييمات من الزملاء</p>
              <p className="text-sm text-muted-foreground mt-1">
                قم بإضافة تقييم لهذا الموظف
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {evaluations.map((evaluation: PeerEvaluation) => (
                <Card key={evaluation.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-primary/10 rounded-full">
                            <UserRound className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {evaluation.isAnonymous
                                ? "تقييم مجهول"
                                : `${evaluation.evaluator?.firstNameAr} ${evaluation.evaluator?.lastNameAr}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(evaluation.createdAt).toLocaleDateString("ar-EG")}
                            </p>
                          </div>
                        </div>
                        {getRatingBadge(evaluation.rating)}
                      </div>

                      {evaluation.strengths && (
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-1">
                            نقاط القوة:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {evaluation.strengths}
                          </p>
                        </div>
                      )}

                      {evaluation.improvements && (
                        <div>
                          <p className="text-sm font-medium text-orange-700 mb-1">
                            نقاط التحسين:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {evaluation.improvements}
                          </p>
                        </div>
                      )}

                      {evaluation.comments && (
                        <div>
                          <p className="text-sm font-medium mb-1">ملاحظات عامة:</p>
                          <p className="text-sm text-muted-foreground">
                            {evaluation.comments}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {evaluations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>إحصائيات التقييمات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {ratingOptions.map((option) => {
                const count = evaluations.filter(
                  (e: PeerEvaluation) => e.rating === option.value
                ).length;
                return (
                  <div
                    key={option.value}
                    className="p-4 border rounded-lg text-center"
                  >
                    <p className={`text-2xl font-bold ${option.color}`}>{count}</p>
                    <p className="text-sm text-muted-foreground">{option.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">إجمالي التقييمات</span>
                <span className="text-2xl font-bold text-primary">
                  {evaluations.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
