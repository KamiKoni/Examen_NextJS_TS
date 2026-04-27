import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { canViewAudit } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { serializeAuditLog } from "@/lib/serializers";
import { requireSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);

    if (!canViewAudit(session.role)) {
      throw new AppError(403, "FORBIDDEN", "You cannot view audit logs.");
    }

    const auditLogs = await prisma.auditLog.findMany({
      where:
        session.role === "MANAGER"
          ? {
              entityType: {
                in: ["schedule", "session"],
              },
            }
          : undefined,
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
      take: session.role === "MANAGER" ? 25 : 50,
    });

    return ok({ auditLogs: auditLogs.map(serializeAuditLog) });
  } catch (error) {
    return fail(error);
  }
}
