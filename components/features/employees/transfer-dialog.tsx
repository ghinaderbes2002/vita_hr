"use client";

import { useState } from "react";
import { useTransferEmployee } from "@/lib/hooks/use-employees";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { AllowancesEditor, AllowanceRow } from "./allowances-editor";
import { useDepartments } from "@/lib/hooks/use-departments";
import { useJobTitles } from "@/lib/hooks/use-job-titles";
import { useJobGrades } from "@/lib/hooks/use-job-grades";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
}

const EMPTY = "__NONE__";

export function TransferDialog({ open, onOpenChange, employeeId }: Props) {
  const transfer = useTransferEmployee();
  const { data: deptData }  = useDepartments({ limit: 200 });
  const { data: titleData } = useJobTitles({ limit: 200 });
  const { data: gradeData } = useJobGrades({ limit: 200 });
  const { data: empList }   = useEmployeesBasicList();

  function extractList(d: any): any[] {
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data?.items)) return d.data.items;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.items)) return d.items;
    return [];
  }

  const departments = extractList(deptData);
  const jobTitles   = extractList(titleData);
  const jobGrades   = extractList(gradeData);
  const employees   = Array.isArray(empList) ? empList.filter((e: any) => e.id !== employeeId) : [];

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    departmentId:  "",
    jobTitleId:    "",
    jobGradeId:    "",
    managerId:     "",
    basicSalary:   "",
    salaryCurrency:"USD",
    effectiveDate: today,
    note:          "",
  });
  const [editAllowances, setEditAllowances] = useState(false);
  const [allowanceRows, setAllowanceRows] = useState<AllowanceRow[]>([]);

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function reset() {
    setForm({
      departmentId: "", jobTitleId: "", jobGradeId: "", managerId: "",
      basicSalary: "", salaryCurrency: "USD", effectiveDate: today, note: "",
    });
    setEditAllowances(false);
    setAllowanceRows([]);
  }

  async function handleSubmit() {
    const dto: Record<string, any> = { effectiveDate: form.effectiveDate };
    if (form.departmentId)   dto.departmentId  = form.departmentId;
    if (form.jobTitleId)     dto.jobTitleId    = form.jobTitleId;
    if (form.jobGradeId)     dto.jobGradeId    = form.jobGradeId;
    if (form.managerId)      dto.managerId     = form.managerId;
    if (form.basicSalary)    { dto.basicSalary = parseFloat(form.basicSalary); dto.salaryCurrency = form.salaryCurrency; }
    if (form.note.trim())    dto.note = form.note.trim();
    if (editAllowances) {
      dto.allowances = allowanceRows
        .filter(r => r.type && r.amount)
        .map(r => ({ type: r.type, amount: parseFloat(r.amount) }));
    }

    await transfer.mutateAsync({ id: employeeId, dto: dto as any });
    reset();
    onOpenChange(false);
  }

  const canSubmit = !!form.effectiveDate && (
    !!form.departmentId || !!form.jobTitleId || !!form.jobGradeId ||
    !!form.managerId    || !!form.basicSalary || editAllowances
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle>نقل / تحويل الموظف</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1 overflow-y-auto flex-1 px-1">
          {/* Department */}
          <div className="space-y-1.5">
            <Label>القسم الجديد</Label>
            <Select value={form.departmentId || EMPTY} onValueChange={(v) => set("departmentId", v === EMPTY ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="— لا تغيير —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY}>— لا تغيير —</SelectItem>
                {departments.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Title */}
          <div className="space-y-1.5">
            <Label>المسمى الوظيفي الجديد</Label>
            <Select value={form.jobTitleId || EMPTY} onValueChange={(v) => set("jobTitleId", v === EMPTY ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="— لا تغيير —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY}>— لا تغيير —</SelectItem>
                {jobTitles.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.nameAr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Grade */}
          <div className="space-y-1.5">
            <Label>الدرجة الوظيفية الجديدة</Label>
            <Select value={form.jobGradeId || EMPTY} onValueChange={(v) => set("jobGradeId", v === EMPTY ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="— لا تغيير —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY}>— لا تغيير —</SelectItem>
                {jobGrades.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>{g.nameAr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Manager */}
          <div className="space-y-1.5">
            <Label>المدير المباشر الجديد</Label>
            <Select value={form.managerId || EMPTY} onValueChange={(v) => set("managerId", v === EMPTY ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="— لا تغيير —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY}>— لا تغيير —</SelectItem>
                {employees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.firstNameAr} {e.lastNameAr}
                    {e.employeeNumber ? ` (${e.employeeNumber})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Salary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>الراتب الأساسي الجديد</Label>
              <Input
                type="number" min={0} placeholder="— لا تغيير —"
                value={form.basicSalary}
                onChange={(e) => set("basicSalary", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>العملة</Label>
              <Select value={form.salaryCurrency} onValueChange={(v) => set("salaryCurrency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">$ (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Allowances */}
          <AllowancesEditor
            enabled={editAllowances}
            onEnabledChange={setEditAllowances}
            rows={allowanceRows}
            onRowsChange={setAllowanceRows}
          />

          {/* Effective Date */}
          <div className="space-y-1.5">
            <Label>تاريخ التنفيذ *</Label>
            <Input type="date" value={form.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>ملاحظة</Label>
            <Textarea rows={2} placeholder="سبب النقل أو أي تفاصيل..." value={form.note} onChange={(e) => set("note", e.target.value)} />
          </div>

          {!canSubmit && (
            <p className="text-xs text-amber-600">يجب تغيير حقل واحد على الأقل مع تحديد تاريخ التنفيذ.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || transfer.isPending}>
            {transfer.isPending ? "جارٍ التنفيذ..." : "تنفيذ النقل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
