export type RequestType =
  | "TRANSFER"
  | "RESIGNATION"
  | "REWARD"
  | "OTHER"
  | "PENALTY_PROPOSAL"
  | "OVERTIME_EMPLOYEE"
  | "OVERTIME_MANAGER"
  | "BUSINESS_MISSION"
  | "DELEGATION"
  | "HIRING_REQUEST"
  | "COMPLAINT"
  | "WORK_ACCIDENT"
  | "REMOTE_WORK";

export type RequestStatus =
  | "DRAFT"
  | "PENDING_MANAGER"
  | "PENDING_HR"
  | "IN_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type ApproverRole =
  | "DIRECT_MANAGER"
  | "DEPARTMENT_MANAGER"
  | "TARGET_MANAGER"
  | "HR"
  | "CEO"
  | "CFO";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";

export interface ApprovalStep {
  id: string;
  requestId: string;
  stepOrder: number;
  approverRole: ApproverRole;
  status: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  createdAt: string;
}

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
  reason?: string;
  notes?: string;
  attachmentUrl?: string;
  details?: Record<string, any>;
  currentStepOrder?: number;
  targetEmployeeId?: string;
  approvalSteps?: ApprovalStep[];
  managerStatus?: string;
  managerReviewedAt?: string;
  managerNotes?: string;
  hrStatus?: string;
  hrReviewedAt?: string;
  hrNotes?: string;
  cancelReason?: string;
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
    nameEn?: string;
    order?: number;
    color?: string;
    minSalary?: string | number;
    maxSalary?: string | number;
  };
  order?: number;
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

export interface EmployeeAttachment {
  id?: string;
  employeeId?: string;
  fileUrl: string;
  fileName: string;
  createdAt?: string;
}

export type AllowanceType =
  | "FOOD"
  | "PREVIOUS_EXPERIENCE"
  | "ACADEMIC_DEGREE"
  | "WORK_NATURE"
  | "RESPONSIBILITY";

export interface EmployeeAllowance {
  id: string;
  type: AllowanceType;
  amount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainingCertificate {
  id?: string;
  name: string;
  attachmentUrl?: string;
  createdAt?: string;
}

export interface Employee {
  id: string;
  userId?: string;
  employeeNumber: string;
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
  maritalStatus?: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
  hasDrivingLicense?: boolean;
  departmentId: string;
  department?: Department;
  jobTitleId?: string;
  jobTitle?: { id: string; nameAr: string; nameEn: string; code: string };
  jobGradeId?: string;
  jobGrade?: { id: string; nameAr: string; nameEn: string; code: string; color?: string; minSalary?: number; maxSalary?: number };
  managerId?: string;
  manager?: { id: string; employeeNumber: string; firstNameAr: string; lastNameAr: string };
  hireDate: string;
  contractType: "FIXED_TERM" | "INDEFINITE" | "TEMPORARY" | "TRAINEE" | "CONSULTANT" | "SERVICE_PROVIDER";
  employmentStatus: "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED";
  workType?: "FULL_TIME" | "PART_TIME" | "REMOTE";
  basicSalary?: number;
  // Additional fields
  profilePhoto?: string;
  bloodType?: "A_POSITIVE" | "A_NEGATIVE" | "B_POSITIVE" | "B_NEGATIVE" | "AB_POSITIVE" | "AB_NEGATIVE" | "O_POSITIVE" | "O_NEGATIVE";
  familyMembersCount?: number;
  chronicDiseases?: string;
  currentAddress?: string;
  isSmoker?: boolean;
  educationLevel?: "PRIMARY" | "INTERMEDIATE" | "SECONDARY" | "DIPLOMA" | "BACHELOR" | "POSTGRADUATE";
  universityYear?: number;
  religion?: string;
  // Qualification fields
  yearsOfExperience?: number;
  certificate1?: string;
  specialization1?: string;
  university1?: string;
  certificateAttachment1?: string;
  certificate2?: string;
  specialization2?: string;
  university2?: string;
  certificateAttachment2?: string;
  // Arrays
  attachments?: EmployeeAttachment[];
  trainingCertificates?: TrainingCertificate[];
  allowances?: EmployeeAllowance[];
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
  gradeId?: string;
  grade?: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    order?: number;
    color?: string;
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
  status: "PRESENT" | "ABSENT" | "LATE" | "EARLY_LEAVE" | "HALF_DAY" | "ON_LEAVE" | "HOLIDAY" | "WEEKEND";
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

export type CustodyStatus = "WITH_EMPLOYEE" | "RETURNED" | "DAMAGED" | "LOST";
export type CustodyCategory = "ELECTRONICS" | "FURNITURE" | "VEHICLE" | "TOOLS" | "KEYS" | "UNIFORM" | "OTHER";

export interface Custody {
  id: string;
  name: string;
  description?: string;
  serialNumber?: string;
  category: CustodyCategory;
  employeeId: string;
  assignedDate: string;
  returnedDate?: string;
  status: CustodyStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  employee?: {
    id: string;
    firstNameAr: string;
    lastNameAr: string;
    firstNameEn?: string;
    lastNameEn?: string;
    employeeNumber: string;
    department?: { id: string; nameAr: string };
  };
}

export type JobApplicationStatus = "PENDING" | "INTERVIEW_READY" | "ACCEPTED" | "REJECTED" | "HIRED";

export interface JobApplication {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  yearsOfExperience: number;
  education: string;
  cvFileUrl: string;
  coverLetter: string;
  linkedinUrl: string | null;
  ref1Name: string;
  ref1Company: string;
  ref1JobTitle: string;
  ref1Phone: string;
  ref2Name: string | null;
  ref2Company: string | null;
  ref2JobTitle: string | null;
  ref2Phone: string | null;
  status: JobApplicationStatus;
  reviewNotes: string | null;
  rejectionNote: string | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplicationStats {
  total: number;
  pending: number;
  interviewReady: number;
  accepted: number;
  rejected: number;
  hired: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
