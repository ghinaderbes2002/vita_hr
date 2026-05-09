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
