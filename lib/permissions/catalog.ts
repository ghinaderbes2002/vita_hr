/**
 * Permission Catalog — يجب أن يطابق Backend exactly
 * مرجع: my-api-platform/packages/shared/src/constants/permissions.constants.ts
 */

export const PERMISSIONS = {
  USERS: {
    READ: "users:read",
    CREATE: "users:create",
    UPDATE: "users:update",
    DELETE: "users:delete",
    ASSIGN_ROLES: "users:assign_roles",
  },

  EMPLOYEES: {
    READ: "employees:read",
    CREATE: "employees:create",
    UPDATE: "employees:update",
    DELETE: "employees:delete",
    MANAGER_NOTES_READ: "employees:manager-notes:read",
    MANAGER_NOTES_WRITE: "employees:manager-notes:write",
    PROBATION_REPORT: "employees:probation-report:read",
    CONTRACT_REPORT: "employees:contract-report:read",
    EXPORT: "employees:export",
  },

  DEPARTMENTS: {
    READ: "departments:read",
    CREATE: "departments:create",
    UPDATE: "departments:update",
    DELETE: "departments:delete",
  },

  ROLES: {
    READ: "roles:read",
    CREATE: "roles:create",
    UPDATE: "roles:update",
    DELETE: "roles:delete",
  },

  JOB_TITLES: {
    READ: "job-titles:read",
    CREATE: "job-titles:create",
    UPDATE: "job-titles:update",
    DELETE: "job-titles:delete",
  },
  JOB_GRADES: {
    READ: "job-grades:read",
    CREATE: "job-grades:create",
    UPDATE: "job-grades:update",
    DELETE: "job-grades:delete",
  },

  LEAVE_TYPES: {
    READ: "leave_types:read",
    CREATE: "leave_types:create",
    UPDATE: "leave_types:update",
    DELETE: "leave_types:delete",
  },
  LEAVE_REQUESTS: {
    READ: "leave_requests:read",
    READ_ALL: "leave_requests:read_all",
    CREATE: "leave_requests:create",
    UPDATE: "leave_requests:update",
    SUBMIT: "leave_requests:submit",
    DELETE: "leave_requests:delete",
    APPROVE_MANAGER: "leave_requests:approve_manager",
    APPROVE_HR: "leave_requests:approve_hr",
    CANCEL: "leave_requests:cancel",
  },
  LEAVE_BALANCES: {
    READ: "leave_balances:read",
    READ_ALL: "leave_balances:read_all",
    CREATE: "leave_balances:create",
    ADJUST: "leave_balances:adjust",
    INITIALIZE: "leave_balances:initialize",
    DELETE: "leave_balances:delete",
    CARRY_OVER: "leave_balances:carry_over",
  },
  HOLIDAYS: {
    READ: "holidays:read",
    CREATE: "holidays:create",
    UPDATE: "holidays:update",
    DELETE: "holidays:delete",
  },

  WORK_SCHEDULES: {
    READ: "attendance.work-schedules.read",
    CREATE: "attendance.work-schedules.create",
    UPDATE: "attendance.work-schedules.update",
    DELETE: "attendance.work-schedules.delete",
  },
  ATTENDANCE_RECORDS: {
    READ: "attendance.records.read",
    READ_OWN: "attendance.records.read-own",
    /** بصمات المرؤوسين المباشرين — تُمنح للمدير المباشر من شاشة الأدوار. */
    READ_TEAM: "attendance.records.read-team",
    CREATE: "attendance.records.create",
    CREATE_MANUAL: "attendance.records.create-manual",
    UPDATE: "attendance.records.update",
    UPDATE_MANUAL: "attendance.records.update-manual",
    DELETE: "attendance.records.delete",
    CHECK_IN: "attendance.records.check-in",
    CHECK_OUT: "attendance.records.check-out",
  },
  ATTENDANCE_ALERTS: {
    READ: "attendance.alerts.read",
    READ_OWN: "attendance.alerts.read-own",
    CREATE: "attendance.alerts.create",
    UPDATE: "attendance.alerts.update",
    DELETE: "attendance.alerts.delete",
    RESOLVE: "attendance.alerts.resolve",
  },
  ATTENDANCE_JUSTIFICATIONS: {
    READ: "attendance.justifications.read",
    READ_OWN: "attendance.justifications.read-own",
    CREATE_OWN: "attendance.justifications.create-own",
    MANAGER_REVIEW: "attendance.justifications.manager-review",
    HR_REVIEW: "attendance.justifications.hr-review",
  },
  ATTENDANCE_REPORTS: {
    READ: "attendance.reports.read",
  },
  ATTENDANCE_PAYROLL: {
    GENERATE: "attendance.payroll.generate",
    READ: "attendance.payroll.read",
    CONFIRM: "attendance.payroll.confirm",
    EXPORT: "attendance.payroll.export",
  },
  ATTENDANCE_POLICIES: {
    READ: "attendance.policies.read",
    CREATE: "attendance.policies.create",
    UPDATE: "attendance.policies.update",
    DELETE: "attendance.policies.delete",
  },

  PAYROLL_ADVANCES: {
    READ:   "payroll.advances.read",
    CREATE: "payroll.advances.create",
    UPDATE: "payroll.advances.update",
    CANCEL: "payroll.advances.cancel",
    DELETE: "payroll.advances.delete",
  },
  PAYROLL_COMMISSIONS: {
    READ:    "payroll.commissions.read",
    CREATE:  "payroll.commissions.create",
    UPDATE:  "payroll.commissions.update",
    CONFIRM: "payroll.commissions.confirm",
    DELETE:  "payroll.commissions.delete",
  },
  ONBOARDING: {
    VIEW:        "onboarding.view",
    MANAGE:      "onboarding.manage",
    UPDATE_TASK: "onboarding.update_task",
  },

  EVALUATION_PERIODS: {
    READ: "evaluation:periods:read",
    CREATE: "evaluation:periods:create",
    UPDATE: "evaluation:periods:update",
    DELETE: "evaluation:periods:delete",
    MANAGE: "evaluation:periods:manage",
  },
  EVALUATION_CRITERIA: {
    READ: "evaluation:criteria:read",
    CREATE: "evaluation:criteria:create",
    UPDATE: "evaluation:criteria:update",
    DELETE: "evaluation:criteria:delete",
  },
  EVALUATION_FORMS: {
    VIEW_OWN: "evaluation:forms:view-own",
    VIEW_ALL: "evaluation:forms:view-all",
    SELF_EVALUATE: "evaluation:forms:self-evaluate",
    MANAGER_EVALUATE: "evaluation:forms:manager-evaluate",
    HR_REVIEW: "evaluation:forms:hr-review",
    GM_APPROVAL: "evaluation:forms:gm-approval",
  },

  PROBATION: {
    VIEW_ALL: "probation:view-all",
    SENIOR_REVIEW: "probation:senior-review",
    HR_REVIEW: "probation:hr-review",
    CEO_REVIEW: "probation:ceo-review",
    SUBMIT: "probation:submit",
    ACKNOWLEDGE: "probation:acknowledge",
  },

  CUSTODIES: {
    READ: "custodies:read",
    CREATE: "custodies:create",
    UPDATE: "custodies:update",
    DELETE: "custodies:delete",
  },

  REQUESTS: {
    READ: "requests:read",
    MANAGER_APPROVE: "requests:manager-approve",
    MANAGER_REJECT: "requests:manager-reject",
    HR_APPROVE: "requests:hr-approve",
    HR_REJECT: "requests:hr-reject",
    APPROVE: "requests:approve",
    REJECT: "requests:reject",
    CEO_APPROVE: "requests:ceo-approve",
    CFO_APPROVE: "requests:cfo-approve",
    LO_APPROVE: "requests:lo-approve",
    READ_ALL_STEPS: "requests:read-all-steps",
    MANAGE_WORKFLOWS: "requests:manage-workflows",
    HIRING_COMPLETE: "requests:hiring:complete",
  },

  MAIL: {
    SEND: "mail:send",
    READ_OWN: "mail:read_own",
    READ_ALL: "mail:read_all",
    DRAFT: "mail:draft",
    UPDATE: "mail:update",
    DELETE: "mail:delete",
    MANAGE: "mail:manage",
  },

  JOB_APPLICATIONS: {
    READ: "job-applications:read",
    UPDATE: "job-applications:update",
    CEO_APPROVE: "job-applications:ceo-approve",
  },

  BIOMETRIC_DEVICES: {
    READ: "biometric.devices.read",
    CREATE: "biometric.devices.create",
    UPDATE: "biometric.devices.update",
    DELETE: "biometric.devices.delete",
  },
  BIOMETRIC_MAPPINGS: {
    READ: "biometric.mappings.read",
    CREATE: "biometric.mappings.create",
    UPDATE: "biometric.mappings.update",
    DELETE: "biometric.mappings.delete",
  },
  // ── Clinic Module ──────────────────────────────────────────
  CLINIC_PATIENTS: {
    VIEW:             "clinic.patients.view",
    CREATE:           "clinic.patients.create",
    EDIT:             "clinic.patients.edit",
    DELETE:           "clinic.patients.delete",
    VIEW_DOCUMENTS:   "clinic.patients.view_documents",
    UPLOAD_DOCUMENTS: "clinic.patients.upload_documents",
    VIEW_CONSENTS:    "clinic.patients.view_consents",
  },
  CLINIC_PROSTHETICS: {
    CASE_VIEW:         "clinic.prosthetics.case.view",
    CASE_CREATE:       "clinic.prosthetics.case.create",
    ASSESSMENT_CREATE: "clinic.prosthetics.assessment.create",
    COMMITTEE_OPINION: "clinic.prosthetics.committee.opinion",
    COMMITTEE_DECIDE:  "clinic.prosthetics.committee.decide",
    COMMITTEE_SIGN:    "clinic.prosthetics.committee.sign",
    COMPONENTS_ADD:    "clinic.prosthetics.components.add",
    GAIT_CREATE:       "clinic.prosthetics.gait.create",
    DELIVERY_CREATE:   "clinic.prosthetics.delivery.create",
    DELIVERY_APPROVE:  "clinic.prosthetics.delivery.approve",
  },
  CLINIC_PHYSIO: {
    CASE_VIEW:         "clinic.physio.case.view",
    CASE_CREATE:       "clinic.physio.case.create",
    ASSESSMENT_CREATE: "clinic.physio.assessment.create",
    SUPERVISOR_REVIEW: "clinic.physio.supervisor_review",
    PLAN_SIGN:         "clinic.physio.plan.sign",
    SESSIONS_CREATE:   "clinic.physio.sessions.create",
    EMERGENCY_ALERT:   "physio:emergency-alert",
  },
  CLINIC_PODIATRY: {
    RECEPTION_VIEW:   "clinic.podiatry.reception.view",
    RECEPTION_CREATE: "clinic.podiatry.reception.create",
    RECEPTION_EDIT:   "clinic.podiatry.reception.edit",
    SESSION_CREATE:   "clinic.podiatry.session.create",
    SESSION_EDIT:     "clinic.podiatry.session.edit",
    SESSION_ARCHIVE:  "clinic.podiatry.session.archive",
  },
  CLINIC_APPOINTMENTS: {
    VIEW:   "clinic.appointments.view",
    /** مواعيد المستخدم نفسه فقط — تُمنح للموظف العادي */
    VIEW_OWN: "clinic.appointments.view_own",
    CREATE: "clinic.appointments.create",
    CANCEL: "clinic.appointments.cancel",
    /**
     * تقرير إحصائيات المواعيد. لا تُمنح لأي دور تلقائياً — تُضاف يدوياً من
     * شاشة إدارة الأدوار بعد نشر الباك.
     */
    STATISTICS_VIEW: "clinic.appointments.statistics_view",
  },
  /** قائمة انتظار العيادة — مرضى بانتظار جدولة موعد. */
  CLINIC_WAITING_LIST: {
    VIEW:   "clinic.waiting_list.view",
    CREATE: "clinic.waiting_list.create",
    EDIT:   "clinic.waiting_list.edit",
    DELETE: "clinic.waiting_list.delete",
  },
  CLINIC_INVENTORY: {
    VIEW:   "clinic.inventory.view",
    MANAGE: "clinic.inventory.manage",
    ISSUE:  "clinic.inventory.issue",
  },
  CLINIC_REPORTS: {
    VIEW_CLINICAL: "clinic.reports.view_clinical",
    VIEW_DONOR:    "clinic.reports.view_donor",
  },
  CLINIC_REFERRALS: {
    VIEW:       "clinic.referrals.view",
    MANAGE:     "clinic.referrals.manage",
    VISITS_ADD: "clinic.referrals.visits.add",
    STATS_VIEW: "clinic.referrals.stats.view",
  },

  /**
   * تطبيق المريض (patient-app). الأسماء منقولة حرفياً من دليل الباك
   * PATIENT_APP_FRONTEND_INTEGRATION_GUIDE §5 و§8.
   * تقييمات المعالجين لا صلاحية لها — محصورة بدور clinic_physio_dept_head.
   */
  PATIENT_APP: {
    MANAGE_ACCOUNT:           "clinic.patient_app.account.manage",
    MANAGE_TAXONOMY:          "clinic.patient_app.taxonomy.manage",
    MANAGE_EXERCISE_LIBRARY:  "clinic.patient_app.exercise_library.manage",
    ASSIGN_EXERCISE:          "clinic.patient_app.assignment.create",
    EDIT_ASSIGNED_EXERCISE:   "clinic.patient_app.assignment.edit",
    CANCEL_ASSIGNED_EXERCISE: "clinic.patient_app.assignment.cancel",
    VIEW_PATIENT_EXECUTIONS:  "clinic.patient_app.execution.view",
    CHAT_USE:                 "clinic.patient_app.chat.use",
    VIEW_RATINGS:             "clinic.patient_app.ratings.view",
  },

  /**
   * خدمة المستودعات (warehouse) — منفصلة عن CLINIC_INVENTORY القديمة.
   * الأسماء منقولة حرفياً من Warehouse_API_Frontend_Guide_AR §15.
   */
  WAREHOUSE_WAREHOUSES: {
    READ:   "warehouse.warehouses.read",
    CREATE: "warehouse.warehouses.create",
    UPDATE: "warehouse.warehouses.update",
  },
  /** الأصناف والتصنيفات تشترك بنفس الصلاحيات، وحذف الصنف يتبع UPDATE. */
  WAREHOUSE_ITEMS: {
    READ:   "warehouse.items.read",
    CREATE: "warehouse.items.create",
    UPDATE: "warehouse.items.update",
  },
  WAREHOUSE_UNITS: {
    READ:   "warehouse.units.read",
    CREATE: "warehouse.units.create",
    UPDATE: "warehouse.units.update",
  },
  WAREHOUSE_SUPPLIERS: {
    READ:   "warehouse.suppliers.read",
    CREATE: "warehouse.suppliers.create",
    UPDATE: "warehouse.suppliers.update",
  },
  WAREHOUSE_STOCK: {
    READ:   "warehouse.stock.read",
    ADJUST: "warehouse.stock.adjust",
  },
  WAREHOUSE_MATERIAL_REQUESTS: {
    READ:     "warehouse.material_requests.read",
    READ_OWN: "warehouse.material_requests.read_own",
    CREATE:   "warehouse.material_requests.create",
    /** اعتماد + رفض + صرف */
    APPROVE:  "warehouse.material_requests.approve",
  },
  WAREHOUSE_CURRENCIES: {
    READ:   "warehouse.currencies.read",
    MANAGE: "warehouse.currencies.manage",
  },
  WAREHOUSE_PURCHASE_INVOICES: {
    READ:    "warehouse.purchase_invoices.read",
    CREATE:  "warehouse.purchase_invoices.create",
    APPROVE: "warehouse.purchase_invoices.approve",
    POST:    "warehouse.purchase_invoices.post",
    /** بدونها يحذف الباك حقول السعر من الاستجابة أصلاً. */
    VIEW_PRICES: "warehouse.purchase_prices.view",
  },
  WAREHOUSE_TRANSFERS: {
    READ:    "warehouse.transfers.read",
    CREATE:  "warehouse.transfers.create",
    RECEIVE: "warehouse.transfers.receive",
  },
  WAREHOUSE_RETURNS: {
    READ:   "warehouse.returns.read",
    CREATE: "warehouse.returns.create",
  },
  WAREHOUSE_COUNTS: {
    READ:    "warehouse.counts.read",
    /** بدء الجلسة + تسجيل العدّ */
    CREATE:  "warehouse.counts.create",
    /** إنهاء/إلغاء */
    APPROVE: "warehouse.counts.approve",
  },
  WAREHOUSE_QUOTATIONS: {
    READ:        "warehouse.quotations.read",
    CREATE:      "warehouse.quotations.create",
    APPROVE:     "warehouse.quotations.approve",
    EDIT_PRICES: "warehouse.quotations.edit_prices",
    /** تشمل فواتير المبيعات أيضاً — بدونها نسخة الفني بلا أسعار. */
    VIEW_PRICES: "warehouse.quotations.view_prices",
  },
  WAREHOUSE_SALES_INVOICES: {
    READ:    "warehouse.sales_invoices.read",
    CREATE:  "warehouse.sales_invoices.create",
    APPROVE: "warehouse.sales_invoices.approve",
  },
  WAREHOUSE_REPORTS: {
    READ: "warehouse.reports.read",
  },

  AUDIT: {
    READ: "audit:read",
  },
} as const;

type ExtractValues<T> = T extends Record<string, infer U>
  ? U extends string
    ? U
    : ExtractValues<U>
  : never;

export type PermissionName = ExtractValues<typeof PERMISSIONS>;
