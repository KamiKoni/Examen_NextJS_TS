import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { requireRole } from "@/lib/middleware/auth";
import { getPaginationParams, buildPaginationMeta } from "@/lib/pagination";
import { canViewAudit } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { serializeAuditLog } from "@/lib/serializers";
import { requireSession } from "@/lib/session";

// Returns audit history filtered by the viewer's permissions.
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const pagination = getPaginationParams(request);

    if (!canViewAudit(session.role)) {
      throw new AppError(403, "FORBIDDEN", "You cannot view audit logs.");
    }

    requireRole(session.role, ["ADMIN", "MANAGER"]);

    const where =
      session.role === "MANAGER"
        ? {
            entityType: {
              in: ["schedule", "session"],
            },
          }
        : undefined;

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
