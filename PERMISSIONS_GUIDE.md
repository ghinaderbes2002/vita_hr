# دليل استخدام نظام الصلاحيات - Vita HR

## 📚 نظرة عامة

تم تطبيق نظام صلاحيات متكامل في التطبيق يسمح بالتحكم الدقيق في من يمكنه الوصول لكل ميزة.

---

## 🔑 قائمة الصلاحيات المطلوبة

### صلاحيات الإدارة (Management)
- `VIEW_MANAGEMENT` - عرض قسم الإدارة
- `VIEW_USERS` - عرض المستخدمين
- `CREATE_USER` - إضافة مستخدم جديد
- `EDIT_USER` - تعديل مستخدم
- `DELETE_USER` - حذف مستخدم
- `VIEW_ROLES` - عرض الأدوار
- `CREATE_ROLE` - إضافة دور جديد
- `EDIT_ROLE` - تعديل دور
- `DELETE_ROLE` - حذف دور
- `VIEW_DEPARTMENTS` - عرض الأقسام
- `CREATE_DEPARTMENT` - إضافة قسم
- `EDIT_DEPARTMENT` - تعديل قسم
- `DELETE_DEPARTMENT` - حذف قسم
- `VIEW_EMPLOYEES` - عرض الموظفين
- `CREATE_EMPLOYEE` - إضافة موظف
- `EDIT_EMPLOYEE` - تعديل موظف
- `DELETE_EMPLOYEE` - حذف موظف
- `VIEW_SUBORDINATES` - عرض المرؤوسين

### صلاحيات الحضور (Attendance)
- `VIEW_MY_ATTENDANCE` - عرض حضوري الشخصي
- `CHECK_IN_OUT` - تسجيل الحضور والانصراف
- `VIEW_ALL_ATTENDANCE` - عرض حضور جميع الموظفين
- `EDIT_ATTENDANCE` - تعديل سجلات الحضور
- `DELETE_ATTENDANCE` - حذف سجلات الحضور
- `VIEW_MY_ALERTS` - عرض تنبيهاتي الشخصية
- `VIEW_ALL_ALERTS` - عرض جميع التنبيهات
- `VIEW_WORK_SCHEDULES` - عرض جداول العمل
- `CREATE_WORK_SCHEDULE` - إضافة جدول عمل
- `EDIT_WORK_SCHEDULE` - تعديل جدول عمل
- `DELETE_WORK_SCHEDULE` - حذف جدول عمل

### صلاحيات الإجازات (Leaves)
- `VIEW_MY_LEAVES` - عرض إجازاتي
- `REQUEST_LEAVE` - طلب إجازة
- `CANCEL_LEAVE` - إلغاء طلب إجازة
- `VIEW_ALL_LEAVES` - عرض جميع الإجازات
- `APPROVE_LEAVE` - الموافقة على الإجازات
- `REJECT_LEAVE` - رفض الإجازات
- `VIEW_LEAVE_TYPES` - عرض أنواع الإجازات
- `CREATE_LEAVE_TYPE` - إضافة نوع إجازة
- `EDIT_LEAVE_TYPE` - تعديل نوع إجازة
- `DELETE_LEAVE_TYPE` - حذف نوع إجازة
- `VIEW_HOLIDAYS` - عرض الأيام الرسمية
- `CREATE_HOLIDAY` - إضافة يوم رسمي
- `EDIT_HOLIDAY` - تعديل يوم رسمي
- `DELETE_HOLIDAY` - حذف يوم رسمي
- `VIEW_LEAVE_BALANCES` - عرض أرصدة الإجازات
- `ADJUST_LEAVE_BALANCE` - تعديل رصيد الإجازة

### صلاحيات التقييم (Evaluations)
- `VIEW_EVALUATIONS` - عرض قسم التقييمات
- `VIEW_MY_EVALUATIONS` - عرض تقييماتي
- `SUBMIT_SELF_EVALUATION` - تقديم التقييم الذاتي
- `VIEW_ALL_EVALUATIONS` - عرض جميع التقييمات
- `REVIEW_EVALUATIONS` - مراجعة التقييمات
- `APPROVE_EVALUATION` - الموافقة على التقييم
- `REJECT_EVALUATION` - رفض التقييم
- `VIEW_EVALUATION_PERIODS` - عرض فترات التقييم
- `CREATE_EVALUATION_PERIOD` - إضافة فترة تقييم
- `EDIT_EVALUATION_PERIOD` - تعديل فترة تقييم
- `DELETE_EVALUATION_PERIOD` - حذف فترة تقييم
- `VIEW_EVALUATION_CRITERIA` - عرض معايير التقييم
- `CREATE_EVALUATION_CRITERIA` - إضافة معيار تقييم
- `EDIT_EVALUATION_CRITERIA` - تعديل معيار تقييم
- `DELETE_EVALUATION_CRITERIA` - حذف معيار تقييم

### صلاحيات خاصة
- `*` أو `ADMIN` - صلاحيات كاملة (Admin)

---

## 💼 توزيع الصلاحيات على الأدوار

### Admin
```json
["*"]
```
أو
```json
["ADMIN"]
```

### HR Manager
```json
[
  "VIEW_MANAGEMENT",
  "VIEW_EMPLOYEES", "CREATE_EMPLOYEE", "EDIT_EMPLOYEE", "DELETE_EMPLOYEE",
  "VIEW_DEPARTMENTS", "CREATE_DEPARTMENT", "EDIT_DEPARTMENT", "DELETE_DEPARTMENT",
  "VIEW_ALL_ATTENDANCE", "EDIT_ATTENDANCE", "DELETE_ATTENDANCE",
  "VIEW_ALL_ALERTS",
  "VIEW_WORK_SCHEDULES", "CREATE_WORK_SCHEDULE", "EDIT_WORK_SCHEDULE", "DELETE_WORK_SCHEDULE",
  "VIEW_ALL_LEAVES", "APPROVE_LEAVE", "REJECT_LEAVE",
  "VIEW_LEAVE_TYPES", "CREATE_LEAVE_TYPE", "EDIT_LEAVE_TYPE", "DELETE_LEAVE_TYPE",
  "VIEW_HOLIDAYS", "CREATE_HOLIDAY", "EDIT_HOLIDAY", "DELETE_HOLIDAY",
  "VIEW_LEAVE_BALANCES", "ADJUST_LEAVE_BALANCE",
  "VIEW_EVALUATIONS", "VIEW_ALL_EVALUATIONS", "REVIEW_EVALUATIONS"
]
```

### Manager
```json
[
  "VIEW_SUBORDINATES",
  "VIEW_MY_ATTENDANCE", "CHECK_IN_OUT",
  "VIEW_MY_ALERTS",
  "VIEW_MY_LEAVES", "REQUEST_LEAVE", "CANCEL_LEAVE",
  "APPROVE_LEAVE", "REJECT_LEAVE",
  "VIEW_MY_EVALUATIONS", "REVIEW_EVALUATIONS"
]
```

### Employee
```json
[
  "VIEW_MY_ATTENDANCE", "CHECK_IN_OUT",
  "VIEW_MY_ALERTS",
  "VIEW_MY_LEAVES", "REQUEST_LEAVE", "CANCEL_LEAVE",
  "VIEW_MY_EVALUATIONS", "SUBMIT_SELF_EVALUATION"
]
```

---

## 📖 كيفية الاستخدام

### 1. حماية صفحة كاملة (Page Protection)

استخدم `withPermission` HOC لحماية صفحة كاملة:

```tsx
// app/[locale]/(dashboard)/employees/page.tsx
"use client";

import { withPermission } from "@/components/shared/with-permission";

function EmployeesPage() {
  return (
    <div>
      <h1>قائمة الموظفين</h1>
      {/* محتوى الصفحة */}
    </div>
  );
}

// تصدير الصفحة مع الحماية
export default withPermission(EmployeesPage, "VIEW_EMPLOYEES");
```

**حماية بعدة صلاحيات (يحتاج أي واحدة):**
```tsx
export default withPermission(
  AttendancePage,
  ["VIEW_MY_ATTENDANCE", "VIEW_ALL_ATTENDANCE"]
);
```

**حماية بعدة صلاحيات (يحتاج الكل):**
```tsx
export default withPermission(
  ExportPage,
  ["VIEW_EMPLOYEES", "EXPORT_DATA"],
  { requireAll: true }
);
```

**رسالة مخصصة:**
```tsx
export default withPermission(
  SalaryPage,
  "VIEW_SALARY",
  { message: "ليس لديك صلاحية لعرض الرواتب" }
);
```

---

### 2. حماية العناصر داخل المكون (Component Elements)

استخدم `PermissionGuard` لإخفاء أو عرض عناصر معينة:

```tsx
import { PermissionGuard } from "@/components/shared/permission-guard";

export function EmployeesList() {
  return (
    <div>
      <PageHeader title="الموظفين">
        {/* زر "إضافة موظف" يظهر فقط لمن لديه صلاحية */}
        <PermissionGuard permission="CREATE_EMPLOYEE">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة موظف
          </Button>
        </PermissionGuard>
      </PageHeader>

      <Table>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>{employee.name}</TableCell>
              <TableCell>
                {/* أزرار التعديل والحذف */}
                <PermissionGuard permission="EDIT_EMPLOYEE">
                  <Button onClick={() => handleEdit(employee)}>
                    تعديل
                  </Button>
                </PermissionGuard>

                <PermissionGuard permission="DELETE_EMPLOYEE">
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(employee)}
                  >
                    حذف
                  </Button>
                </PermissionGuard>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

**مع عنصر بديل:**
```tsx
<PermissionGuard
  permission="VIEW_SALARY"
  fallback={<span className="text-muted">مخفي</span>}
>
  <span>{employee.salary} ريال</span>
</PermissionGuard>
```

**عدة صلاحيات:**
```tsx
<PermissionGuard permissions={["EDIT_EMPLOYEE", "DELETE_EMPLOYEE"]}>
  <div className="flex gap-2">
    <Button>تعديل</Button>
    <Button>حذف</Button>
  </div>
</PermissionGuard>
```

---

### 3. استخدام Hook مباشرة

للحالات المعقدة، استخدم `usePermissions` hook:

```tsx
import { usePermissions } from "@/lib/hooks/use-permissions";

export function EmployeesPage() {
  const { hasPermission, hasAnyPermission, isAdmin } = usePermissions();

  const canEdit = hasPermission("EDIT_EMPLOYEE");
  const canDelete = hasPermission("DELETE_EMPLOYEE");
  const canViewOrEdit = hasAnyPermission(["VIEW_EMPLOYEES", "EDIT_EMPLOYEE"]);

  return (
    <div>
      {isAdmin() && (
        <div className="bg-yellow-100 p-4">
          أنت مدير النظام - لديك كل الصلاحيات
        </div>
      )}

      {canEdit && <Button>تعديل</Button>}
      {canDelete && <Button>حذف</Button>}

      {canViewOrEdit && (
        <div>يمكنك عرض أو تعديل الموظفين</div>
      )}
    </div>
  );
}
```

---

## 🔧 تخزين الصلاحيات

الصلاحيات يتم تخزينها في:
- **Auth Store** (`lib/stores/auth-store.ts`)
- **localStorage/Cookie** (تلقائياً عبر Zustand persist)

عند تسجيل الدخول، يتم جلب الصلاحيات من Backend وتخزينها تلقائياً.

---

## 🔄 تحديث الصلاحيات

### عند تغيير صلاحيات المستخدم:

**الطريقة الأولى - إعادة تسجيل الدخول:**
```tsx
// المستخدم يحتاج تسجيل خروج ودخول من جديد
await logout();
```

**الطريقة الثانية - تحديث تلقائي (مستقبلاً):**
```tsx
import { useAuthStore } from "@/lib/stores/auth-store";

// في مكون معين
const refreshPermissions = async () => {
  const response = await fetch("/api/auth/me");
  const data = await response.json();

  useAuthStore.getState().setPermissions(data.permissions);
};
```

---

## ⚠️ ملاحظات مهمة

1. **الحماية في Frontend فقط للعرض**
   - الحماية الحقيقية يجب أن تكون في Backend
   - Frontend يخفي العناصر فقط، لكن Backend يمنع الوصول

2. **Admin له كل الصلاحيات**
   - إذا كان لديه صلاحية `*` أو `ADMIN`
   - أو دوره `ADMIN`

3. **الصلاحيات حساسة لحالة الأحرف**
   - `VIEW_EMPLOYEES` ≠ `view_employees`
   - استخدم الصلاحيات بنفس الصيغة المحددة

4. **الصفحات بدون حماية**
   - إذا لم تضف `withPermission` للصفحة
   - الكل يمكنه الوصول إليها

---

## 🎨 أمثلة متقدمة

### مثال 1: صفحة مع حماية متعددة المستويات

```tsx
// الصفحة محمية بصلاحية VIEW_EMPLOYEES
function EmployeesPage() {
  const { hasPermission } = usePermissions();

  return (
    <div>
      {/* زر إضافة محمي بصلاحية CREATE_EMPLOYEE */}
      <PermissionGuard permission="CREATE_EMPLOYEE">
        <Button>إضافة موظف</Button>
      </PermissionGuard>

      <Table>
        <TableBody>
          {employees.map((employee) => (
            <TableRow>
              <TableCell>{employee.name}</TableCell>
              <TableCell>
                {/* إخفاء الراتب إذا ما عنده صلاحية */}
                <PermissionGuard
                  permission="VIEW_SALARY"
                  fallback="مخفي"
                >
                  {employee.salary}
                </PermissionGuard>
              </TableCell>
              <TableCell>
                {/* أزرار حسب الصلاحيات */}
                {hasPermission("EDIT_EMPLOYEE") && <Button>تعديل</Button>}
                {hasPermission("DELETE_EMPLOYEE") && <Button>حذف</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default withPermission(EmployeesPage, "VIEW_EMPLOYEES");
```

### مثال 2: شرط معقد

```tsx
function Dashboard() {
  const { hasPermission, hasAnyPermission, isAdmin } = usePermissions();

  // شرط معقد: Admin أو لديه صلاحيات معينة
  const canAccessReports =
    isAdmin() ||
    (hasPermission("VIEW_REPORTS") && hasPermission("EXPORT_DATA"));

  // عرض مختلف حسب الصلاحيات
  const userRole = isAdmin()
    ? "مدير النظام"
    : hasAnyPermission(["VIEW_EMPLOYEES", "EDIT_EMPLOYEES"])
    ? "موارد بشرية"
    : "موظف عادي";

  return (
    <div>
      <h1>مرحباً {userRole}</h1>

      {canAccessReports && (
        <div>
          <h2>التقارير</h2>
          {/* محتوى التقارير */}
        </div>
      )}
    </div>
  );
}
```

---

## 📞 الدعم

إذا كان لديك أسئلة أو مشاكل مع نظام الصلاحيات، يرجى التواصل مع فريق التطوير.

---

**آخر تحديث:** فبراير 2026
