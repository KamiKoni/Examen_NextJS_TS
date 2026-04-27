import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { requireRole } from "@/lib/middleware/auth";
import { getPaginationParams, buildPaginationMeta } from "@/lib/pagination";
import { canViewAudit, getAuditVisibilityFilter } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { serializeAuditLog } from "@/lib/serializers";
import { requireSession } from "@/lib/session";

function getAuditFilters(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const actorId = searchParams.get("actorId");
  const action = searchParams.get("action");

  if (action && !AUDIT_ACTIONS.includes(action as (typeof AUDIT_ACTIONS)[number])) {
    throw new AppError(400, "INVALID_AUDIT_ACTION", "The provided audit action is not supported.");
  }

  return {
    ...(entityType ? { entityType } : {}),
    ...(actorId ? { actorId } : {}),
    ...(action ? { action } : {}),
  };
}

// Returns audit history filtered by the viewer's permissions.
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const pagination = getPaginationParams(request);

    if (!canViewAudit(session.role)) {
      throw new AppError(403, "FORBIDDEN", "You cannot view audit logs.");
    }

    requireRole(session.role, ["ADMIN", "MANAGER"]);
    const where = {
      ...getAuditFilters(request),
      ...getAuditVisibilityFilter(session.role),
    };

    const [total, auditLogs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.offset,
        take: pagination.limit,
      }),
    ]);

    return ok(
      { auditLogs: auditLogs.map(serializeAuditLog) },
      200,
      { pagination: buildPaginationMeta(total, pagination) },
    );
  } catch (error) {
    return fail(error);
  }
}
