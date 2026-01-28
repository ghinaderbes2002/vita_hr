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
  roles?: Role[];
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
  employmentStatus: "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";
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
  employeeCount?: number;
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
