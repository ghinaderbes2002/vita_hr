export type RequestType =
  | "TRANSFER"
  | "PERMISSION"
  | "ADVANCE"
  | "RESIGNATION"
  | "JOB_CHANGE"
  | "RIGHTS"
  | "REWARD"
  | "SPONSORSHIP"
  | "OTHER";

export type RequestStatus =
  | "DRAFT"
  | "PENDING_MANAGER"
  | "PENDING_HR"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface Request {
  id: string;
  requestNumber: string;
  employeeId: string;
  employee?: {
    id: string;
    employeeNumber: string;
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn: string;
    lastNameEn: string;
  };
  type: RequestType;
  status: RequestStatus;
  reason: string;
  notes?: string;
  attachmentUrl?: string;
  details?: Record<string, any>;
  managerStatus?: string;
  managerReviewedAt?: string;
  managerNotes?: string;
  hrStatus?: string;
  hrReviewedAt?: string;
  hrNotes?: string;
  cancelReason?: string;
  history?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface JobTitle {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  nameTr?: string;
  description?: string;
  gradeId?: string;
  grade?: {
    id: string;
    code: string;
    nameAr: string;
    minSalary: string | number;
    maxSalary: string | number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  id: string;
  name: string;
  displayNameAr: string;
  displayNameEn: string;
  description?: string;
  permissions?: Permission[];
  _count?: {
    users?: number;
    permissions?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  displayNameAr?: string;
  displayNameEn?: string;
  module: string;
  resource?: string;
  action?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  profileImage?: string;
  status?: "ACTIVE" | "INACTIVE";
  role?: Role;
  roles?: Array<{
    role: {
      id: string;
      name: string;
      displayNameAr: string;
      displayNameEn: string;
    };
  }>;
  permissions?: string[];
  employeeId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  id: string;
  userId?: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
  email: string;
  phone?: string;
  mobile?: string;
  nationalId: string;
  gender: "MALE" | "FEMALE";
  dateOfBirth: string;
  nationality?: string;
  maritalStatus?: string;
  departmentId: string;
  department?: Department;
  jobTitle?: string;
  managerId?: string;
  manager?: Employee;
  hireDate: string;
  contractType: "PERMANENT" | "CONTRACT" | "TEMPORARY" | "INTERN";
  employmentStatus: "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED";
  profileImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  nameTr: string;
  parentId?: string;
  parent?: Department;
  managerId?: string;
  manager?: {
    id: string;
    employeeNumber: string;
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn: string;
    lastNameEn: string;
  };
  employeeCount?: number;
  children?: Department[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Leave {
  id: string;
  employeeId: string;
  employee?: Employee;
  leaveTypeId: string;
  leaveType?: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveType {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  defaultDays: number;
  isPaid: boolean;
  requiresApproval: boolean;
  allowHalfDay: boolean;
  color?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Holiday {
  id: string;
  nameAr: string;
  nameEn: string;
  date: string;
  type: "PUBLIC" | "NATIONAL" | "RELIGIOUS" | "OTHER";
  isRecurring: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employee?: Employee;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: "present" | "absent" | "late" | "early_leave" | "on_leave";
  workHours?: number;
  notes?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
