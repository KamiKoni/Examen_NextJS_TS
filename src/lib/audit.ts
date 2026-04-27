import type { Prisma, PrismaClient } from "@prisma/client";

export async function createAuditLog(
  db: PrismaClient | Prisma.TransactionClient,
  params: {
    actorId?: string | null;
    action:
      | "AUTH_LOGIN"
      | "AUTH_LOGOUT"
      | "AUTH_REFRESH"
      | "USER_CREATED"
      | "USER_UPDATED"
      | "USER_DELETED"
      | "SCHEDULE_CREATED"
      | "SCHEDULE_UPDATED"
      | "SCHEDULE_DELETED";
    entityType: string;
    entityId: string;
    description: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return db.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
      metadata: params.metadata,
    },
  });
}
