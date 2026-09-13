/**
 * أسماء الأدوار — يجب أن تطابق DB exactly
 * كل تغيير هنا يجب أن يتم بالتنسيق مع Backend
 */
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  HR: "HR",
  HR_SPECIALIST: "HR_Specialist",
  CEO: "CEO",
  CFO: "CFO",
  GENERAL_MANAGER: "General Manager",
  DIRECT_MANAGER: "DIRECT_MANAGER",
  FOLLOW_UP_OFFICER: "Follow-up official",
  EMPLOYEE: "موظف",
  /** الوحيد (مع super_admin) الذي يرى تقييمات المعالجين السرية في تطبيق المريض. */
  CLINIC_PHYSIO_DEPT_HEAD: "clinic_physio_dept_head",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/** الأدوار التي تعتبر "Admin" — لها وصول كامل */
export const ADMIN_ROLES: RoleName[] = [ROLES.SUPER_ADMIN];

/** الأدوار التي يمكنها الموافقة على الإجازات كـ HR */
export const HR_APPROVAL_ROLES: RoleName[] = [ROLES.SUPER_ADMIN, ROLES.HR];

/** الأدوار الإدارية (تظهر لها قائمة Management) */
export const MANAGEMENT_ROLES: RoleName[] = [
  ROLES.SUPER_ADMIN,
  ROLES.HR,
  ROLES.HR_SPECIALIST,
  ROLES.CEO,
  ROLES.CFO,
  ROLES.GENERAL_MANAGER,
];
