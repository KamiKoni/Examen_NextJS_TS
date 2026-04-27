import type {
  Prisma,
  PrismaClient,
  AuditAction as PrismaAuditAction,
} from '@prisma/client';
import type { AuditAction } from '@/lib/constants';

// Central helper for writing audit rows from any transactional context.
export async function createAuditLog(
  db: PrismaClient | Prisma.TransactionClient,
  params: {
    actorId?: string | null;
    action: AuditAction;
    entityType: string;
    entityId: string;
    description: string;
    metadata?: Prisma.InputJsonValue;
  }
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
