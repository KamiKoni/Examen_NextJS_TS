// Central enum-like constants shared by validation, API handlers and UI labels.
export const ACCESS_COOKIE_NAME = 'clockhub_access';
export const REFRESH_COOKIE_NAME = 'clockhub_refresh';

export const ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'] as const;
export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export const SCHEDULE_STATUSES = ['PLANNED', 'APPROVED', 'CANCELLED'] as const;

export const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'EMPLOYEE', label: 'Employee' },
] as const;

export const USER_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
] as const;

export const SCHEDULE_STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;
export const AUDIT_ACTIONS = [
  'AUTH_LOGIN',
  'AUTH_LOGOUT',
  'AUTH_REFRESH',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'SCHEDULE_CREATED',
  'SCHEDULE_UPDATED',
  'SCHEDULE_DELETED',
  'DOCUMENT_UPLOADED',
  'DOCUMENT_ANALYZED',
] as const;

export type AppRole = (typeof ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// Only ACTIVE users may authenticate or receive new work assignments.
export function isEnabledStatus(status: UserStatus) {
  return status === 'ACTIVE';
}
