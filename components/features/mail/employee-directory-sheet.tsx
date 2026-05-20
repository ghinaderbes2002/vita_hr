"use client";

import { useState } from "react";
import { Search, User, Phone, Building2, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useEmployeesBasicList, useEmployeeBasic } from "@/lib/hooks/use-employees";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EmployeeDetail({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useEmployeeBasic(employeeId);
  const emp = data as any;

  if (isLoading) {
    return (
      <div className="mt-3 space-y-2 rounded-lg border bg-muted/30 p-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  if (!emp) return null;

  const deptName = emp.department?.parent?.nameAr
    ? `${emp.department.parent.nameAr} > ${emp.department.nameAr}`
    : emp.department?.nameAr;

  return (
    <div className="mt-2 rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
      {emp.profilePhoto && (
        <div className="flex justify-center pb-1">
          <img
            src={emp.profilePhoto}
            alt={`${emp.firstNameAr} ${emp.lastNameAr}`}
            className="h-20 w-20 rounded-full object-cover border-2 border-primary/20"
          />
        </div>
      )}
      {(emp.mobile || emp.phone) && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span>{emp.mobile || emp.phone}</span>
        </div>
      )}
      {deptName && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span>{deptName}</span>
        </div>
      )}
      {emp.jobTitle?.nameAr && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5 shrink-0" />
          <span>{emp.jobTitle.nameAr}</span>
        </div>
      )}
    </div>
  );
}

export function EmployeeDirectorySheet({ open, onOpenChange }: Props) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: allData, isLoading } = useEmployeesBasicList();

  const allEmployeesList: any[] = Array.isArray(allData) ? allData : [];
  const employees: any[] = search
    ? allEmployeesList.filter((e: any) =>
        `${e.firstNameAr} ${e.lastNameAr}`.includes(search) ||
        `${e.firstNameEn} ${e.lastNameEn}`.toLowerCase().includes(search.toLowerCase())
      )
    : allEmployeesList;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-95 sm:w-105 flex flex-col gap-0 p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            دليل الموظفين
          </SheetTitle>
          <div className="relative mt-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setExpandedId(null); }}
              placeholder="ابحث بالاسم..."
              className="pr-9 h-9 text-sm"
            />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))
          ) : employees.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">لا توجد نتائج</p>
          ) : (
            employees.map((emp: any) => {
              const isExpanded = expandedId === emp.id;
              return (
                <div key={emp.id} className="rounded-lg border">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-right hover:bg-muted/50 transition-colors rounded-lg",
                      isExpanded && "bg-muted/50 rounded-b-none border-b",
                    )}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {emp.firstNameAr} {emp.lastNameAr}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {emp.department?.nameAr || "—"}
                        </Badge>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            emp.employmentStatus === "ACTIVE" ? "text-green-600" : "text-muted-foreground",
                          )}
                        >
                          {emp.employmentStatus === "ACTIVE" ? "نشط" : emp.employmentStatus === "ON_LEAVE" ? "في إجازة" : "غير نشط"}
                        </span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3">
                      <EmployeeDetail employeeId={emp.id} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
