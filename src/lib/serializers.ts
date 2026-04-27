import type { AuditLog, Role, Schedule, ScheduleStatus, User } from "@prisma/client";

import { isEnabledStatus } from "@/lib/constants";
import type { AuditLogRecord, ScheduleRecord, SessionUser, UserRecord } from "@/types/app";

// Serializers convert Prisma entities into plain JSON-safe records for the frontend.
type UserShape = Pick<
  User,
  "id" | "name" | "email" | "role" | "status" | "createdAt" | "updatedAt"
>;

type RelatedUserShape = Pick<User, "id" | "name" | "email" | "role" | "status">;

export function serializeSessionUser(user: RelatedUserShape): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as SessionUser["role"],
    status: user.status as SessionUser["status"],
    active: isEnabledStatus(user.status as SessionUser["status"]),
  };
}

export function serializeUser(user: UserShape): UserRecord {
  return {
    ...serializeSessionUser(user),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

type ScheduleWithRelations = Schedule & {
  assignedUser: RelatedUserShape;
  createdBy: RelatedUserShape;
  updatedBy: RelatedUserShape | null;
};

export function serializeSchedule(schedule: ScheduleWithRelations): ScheduleRecord {
  return {
    id: schedule.id,
    title: schedule.title,
    description: schedule.description,
    startAt: schedule.startAt.toISOString(),
    endAt: schedule.endAt.toISOString(),
    status: schedule.status as ScheduleStatus,
    assignedUserId: schedule.assignedUserId,
    createdById: schedule.createdById,
    updatedById: schedule.updatedById,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
    assignedUser: serializeSessionUser(schedule.assignedUser),
    createdBy: serializeSessionUser(schedule.createdBy),
    updatedBy: schedule.updatedBy ? serializeSessionUser(schedule.updatedBy) : null,
  };
}

type AuditWithActor = AuditLog & {
  actor: Pick<User, "id" | "name" | "email" | "role"> | null;
};

export function serializeAuditLog(log: AuditWithActor): AuditLogRecord {
  return {
    id: log.id,
    actorId: log.actorId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    description: log.description,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
    actor: log.actor
      ? {
          id: log.actor.id,
          name: log.actor.name,
          email: log.actor.email,
          role: log.actor.role as Role,
        }
      : null,
  };
}
