"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useEmployeeGoals,
  useCreateEmployeeGoal,
  useUpdateEmployeeGoal,
  useDeleteEmployeeGoal,
} from "@/lib/hooks/use-employee-goals";
import { EmployeeGoal } from "@/lib/api/employee-goals";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface EmployeeGoalsTabProps {
  formId: string;
}

export function EmployeeGoalsTab({ formId }: EmployeeGoalsTabProps) {
  const { data, isLoading } = useEmployeeGoals(formId);
  const createMutation = useCreateEmployeeGoal();
  const updateMutation = useUpdateEmployeeGoal();
  const deleteMutation = useDeleteEmployeeGoal();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<EmployeeGoal | null>(null);

  // Create form state
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    targetDate: "",
    weight: 1,
  });

  // Update form state
  const [updateData, setUpdateData] = useState({
    selfAchievement: 0,
    selfComments: "",
  });

  const goals = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const handleCreate = () => {
    createMutation.mutate(
      {
        formId,
        data: {
          ...newGoal,
          description: newGoal.description || undefined,
        },
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          setNewGoal({ title: "", description: "", targetDate: "", weight: 1 });
        },
      }
    );
  };

  const handleUpdate = (goalId: string) => {
    updateMutation.mutate(
      {
        id: goalId,
        data: {
          selfAchievement: updateData.selfAchievement,
          selfComments: updateData.selfComments || undefined,
        },
      },
      {
        onSuccess: () => {
          setEditingGoal(null);
        },
      }
    );
  };

  const handleDelete = (goalId: string) => {
    deleteMutation.mutate(goalId);
  };

  const openEditDialog = (goal: EmployeeGoal) => {
    setEditingGoal(goal);
    setUpdateData({
      selfAchievement: goal.selfAchievement || 0,
      selfComments: goal.selfComments || "",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>أهداف الموظف</CardTitle>
              <CardDescription>
                إدارة الأهداف وتتبع الإنجازات
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة هدف
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>إضافة هدف جديد</DialogTitle>
                  <DialogDescription>
                    أضف هدف جديد للموظف في هذه الفترة
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>عنوان الهدف *</Label>
                    <Input
                      value={newGoal.title}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, title: e.target.value })
                      }
                      placeholder="مثال: زيادة الإنتاجية بنسبة 20%"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الوصف</Label>
                    <Textarea
                      value={newGoal.description}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, description: e.target.value })
                      }
                      placeholder="وصف تفصيلي للهدف..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>تاريخ الإنجاز المستهدف *</Label>
                      <Input
                        type="date"
                        value={newGoal.targetDate}
                        onChange={(e) =>
                          setNewGoal({ ...newGoal, targetDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الوزن *</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={newGoal.weight}
                        onChange={(e) =>
                          setNewGoal({ ...newGoal, weight: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending || !newGoal.title || !newGoal.targetDate}
                  >
                    إضافة
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
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">لا توجد أهداف</p>
              <p className="text-sm text-muted-foreground mt-1">
                قم بإضافة أهداف لهذا الموظف
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الهدف</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>التاريخ المستهدف</TableHead>
                    <TableHead>الوزن</TableHead>
                    <TableHead>الإنجاز الذاتي</TableHead>
                    <TableHead>إنجاز المدير</TableHead>
                    <TableHead className="w-[100px]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goals.map((goal: EmployeeGoal) => (
                    <TableRow key={goal.id}>
                      <TableCell className="font-medium">{goal.title}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {goal.description || "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        {new Date(goal.targetDate).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell>{goal.weight}</TableCell>
                      <TableCell>
                        {goal.selfAchievement !== null && goal.selfAchievement !== undefined
                          ? `${goal.selfAchievement}%`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {goal.managerAchievement !== null && goal.managerAchievement !== undefined
                          ? `${goal.managerAchievement}%`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(goal)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف الهدف</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف هذا الهدف؟ لا يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(goal.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={() => setEditingGoal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تحديث الإنجاز</DialogTitle>
            <DialogDescription>
              قم بتحديث نسبة الإنجاز والملاحظات
            </DialogDescription>
          </DialogHeader>
          {editingGoal && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-1">{editingGoal.title}</h4>
                {editingGoal.description && (
                  <p className="text-sm text-muted-foreground">{editingGoal.description}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>نسبة الإنجاز الذاتي (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={updateData.selfAchievement}
                  onChange={(e) =>
                    setUpdateData({
                      ...updateData,
                      selfAchievement: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات الإنجاز</Label>
                <Textarea
                  value={updateData.selfComments}
                  onChange={(e) =>
                    setUpdateData({ ...updateData, selfComments: e.target.value })
                  }
                  placeholder="أضف ملاحظاتك على الإنجاز..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGoal(null)}>
              إلغاء
            </Button>
            <Button
              onClick={() => editingGoal && handleUpdate(editingGoal.id)}
              disabled={updateMutation.isPending}
            >
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
