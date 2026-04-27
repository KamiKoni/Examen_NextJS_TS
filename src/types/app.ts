import type { AuditAction, AppRole, ScheduleStatus, UserStatus } from "@/lib/constants";

// Shared API and UI contracts live here so the client and server speak the same shape.
export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
  meta?: Record<string, unknown>;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  status: UserStatus;
  active: boolean;
}

export interface UserRecord extends SessionUser {
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleRecord {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  status: ScheduleStatus;
  assignedUserId: string;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  assignedUser: Pick<SessionUser, "id" | "name" | "email" | "role" | "active">;
  createdBy: Pick<SessionUser, "id" | "name" | "email" | "role" | "active">;
  updatedBy: Pick<SessionUser, "id" | "name" | "email" | "role" | "active"> | null;
}

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description: string;
  metadata: unknown;
  createdAt: string;
  actor: Pick<UserRecord, "id" | "name" | "email" | "role"> | null;
}

export interface DashboardSummary {
  session: SessionUser;
  users: UserRecord[];
  schedules: ScheduleRecord[];
  auditLogs: AuditLogRecord[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: AppRole;
  status?: UserStatus;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  role?: AppRole;
  status?: UserStatus;
}

export interface CreateSchedulePayload {
  title: string;
  description?: string;
  assignedUserId: string;
  startAt: string;
  endAt: string;
  status?: ScheduleStatus;
}

export interface UpdateSchedulePayload {
  title?: string;
  description?: string;
  assignedUserId?: string;
  startAt?: string;
  endAt?: string;
  status?: ScheduleStatus;
}

export interface NotificationState {
  tone: "success" | "error" | "info";
  message: string;
}
