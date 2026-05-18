export function workTypeArabicLabel(workType?: string | null): string {
  switch (workType) {
    case "FULL_TIME": return "كامل";
    case "PART_TIME": return "جزئي";
    case "REMOTE":    return "أونلاين";
    default:          return "—";
  }
}

export function employmentStatusArabicLabel(status?: string | null): string {
  switch (status) {
    case "ACTIVE":     return "فاعل";
    case "INACTIVE":   return "غير فاعل";
    case "ON_LEAVE":   return "بإجازة";
    case "SUSPENDED":  return "موقوف";
    case "TERMINATED": return "مستقيل";
    default:           return "—";
  }
}

export function isResigned(payroll: {
  employmentStatusAtGenTime?: string | null;
  notes?: string | null;
}): boolean {
  return (
    payroll.employmentStatusAtGenTime === "TERMINATED" ||
    payroll.employmentStatusAtGenTime === "INACTIVE" ||
    payroll.notes === "مستقيل"
  );
}
