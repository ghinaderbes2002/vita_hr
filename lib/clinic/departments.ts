// الأقسام الطبية التي يُختار منها الكادر المعالج في شاشات العيادة.
//
// Codes are the primary match — names get re-spelled, codes do not. The names
// stay as a fallback for the endpoints that return a department without its id,
// and Arabic spelling varies with and without hamza, so both forms are listed.

/** قسم الإدارة الطبية. */
export const MEDICAL_ADMIN_DEPT_CODE = "VTX-DEP-000007";

/** قسم العلاج الفيزيائي. */
export const PHYSIO_DEPT_CODE = "VTX-DEP-000016";

/** الإدارة الطبية + العلاج الفيزيائي + الأطراف الصناعية وطب الأقدام. */
export const CLINICAL_DEPT_CODES = [
  MEDICAL_ADMIN_DEPT_CODE,
  "VTX-DEP-000015",
  PHYSIO_DEPT_CODE,
];

/**
 * أسماء الأقسام نفسها بكل تهجئاتها. A department counts when its name
 * *contains* one of these, so a sub-department keeps its parent's classification.
 */
export const CLINICAL_DEPT_NAMES = [
  "الإدارة الطبية", "الادارة الطبية",
  "الأطراف الصناعية", "الاطراف الصناعية",
  "طب الأقدام", "طب الاقدام",
  "العلاج الفيزيائي",
];

export const isClinicalDepartmentCode = (code?: string | null): boolean =>
  !!code && CLINICAL_DEPT_CODES.includes(code);

export const isClinicalDepartmentName = (name?: string | null): boolean =>
  !!name && CLINICAL_DEPT_NAMES.some((d) => name.includes(d));

/** اسم قسم العلاج الفيزيائي — يُستعمل احتياطاً حين لا يرجع الكود مع القسم. */
const PHYSIO_DEPT_NAME = "العلاج الفيزيائي";

/**
 * هل الموظف من قسم العلاج الفيزيائي؟ يقبل الكود، وكود القسم الأب (للأقسام
 * الفرعية)، والاسم — لأن بعض الردود تعيد القسم بدون كوده.
 */
export const isPhysioDepartment = (
  dept?: { code?: string | null; nameAr?: string | null; parent?: { code?: string | null; nameAr?: string | null } | null } | null,
): boolean => {
  if (!dept) return false;
  if (dept.code === PHYSIO_DEPT_CODE || dept.parent?.code === PHYSIO_DEPT_CODE) return true;
  return [dept.nameAr, dept.parent?.nameAr].some((n) => !!n && n.includes(PHYSIO_DEPT_NAME));
};
