// ============================================================================
// The Nexus Case - Shared TypeScript Types
// For use across API routes, components, and data fetching
// ============================================================================

// ============================================================================
// ENUMS & TYPES
// ============================================================================

export type UserRole = 'admin' | 'attorney' | 'paralegal' | 'clerk' | 'client'

export type CaseStatus = 'pending' | 'active' | 'closed'

export type CasePriority = 'low' | 'medium' | 'high'

// ============================================================================
// DATABASE MODELS
// ============================================================================

/**
 * User model - Represents a user in the system
 */
export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  createdAt: string | Date
  updatedAt: string | Date
}

/**
 * Case model - Represents a legal case
 */
export interface Case {
  id: number
  title: string
  description: string
  category: string
  status: CaseStatus
  priority: CasePriority
  assignedTo: number | null
  createdAt: string | Date
  updatedAt: string | Date
  // Optional relations
  assignee?: User
  documents?: Document[]
}

/**
 * Document model - Represents a document associated with a case
 */
export interface Document {
  id: number
  caseId: number
  name: string
  filePathS3: string
  fileSize: number
  uploadedAt: string | Date
  // Optional relations
  case?: Case
}

/**
 * AuditLog model - Represents an audit log entry
 */
export interface AuditLog {
  id: number
  caseId: number | null
  userId: number | null
  action: string
  entityType: string
  entityId: number
  changes: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string | Date
  // Optional relations
  case?: Case
  user?: User
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Create user request
 */
export interface CreateUserRequest {
  name: string
  email: string
  role?: UserRole
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  name?: string
  email?: string
  role?: UserRole
}

/**
 * Create case request
 */
export interface CreateCaseRequest {
  title: string
  description: string
  category: string
  status?: CaseStatus
  priority?: CasePriority
  assignedTo?: number
}

/**
 * Update case request
 */
export interface UpdateCaseRequest {
  title?: string
  description?: string
  category?: string
  status?: CaseStatus
  priority?: CasePriority
  assignedTo?: number | null
}

/**
 * Create document request
 */
export interface CreateDocumentRequest {
  caseId: number
  name: string
  filePathS3: string
  fileSize: number
}

/**
 * Case filter options
 */
export interface CaseFilterOptions {
  status?: CaseStatus[]
  priority?: CasePriority[]
  assignedTo?: number
  category?: string
  search?: string
  limit?: number
  offset?: number
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  error: string
  message: string
  statusCode: number
  timestamp: string
}

/**
 * Generic API response
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ============================================================================
// HELPER CONSTANTS
// ============================================================================

export const USER_ROLES: UserRole[] = ['admin', 'attorney', 'paralegal', 'clerk', 'client']

export const CASE_STATUSES: CaseStatus[] = ['pending', 'active', 'closed']

export const CASE_PRIORITIES: CasePriority[] = ['low', 'medium', 'high']

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  closed: 'Closed',
}

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  attorney: 'Attorney',
  paralegal: 'Paralegal',
  clerk: 'Clerk',
  client: 'Client',
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export type AuditAction = 'create' | 'update' | 'delete' | 'view'

export type AuditEntityType = 'case' | 'document' | 'user'

export interface AuditLogEntry {
  caseId?: number
  userId?: number
  action: AuditAction
  entityType: AuditEntityType
  entityId: number
  changes?: Record<string, unknown>
  ipAddress?: string
}
