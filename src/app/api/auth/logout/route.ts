import { NextRequest } from "next/server";

import { clearAuthCookies, verifyRefreshToken } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { REFRESH_COOKIE_NAME } from "@/lib/constants";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await prisma.refreshToken.updateMany({
          where: {
            id: payload.sessionId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });

        await createAuditLog(prisma, {
          actorId: payload.sub,
          action: "AUTH_LOGOUT",
          entityType: "session",
          entityId: payload.sessionId,
          description: `${payload.sub} signed out.`,
        });
      } catch {
        // Logout is best-effort.
      }
    }

    await clearAuthCookies();
    return ok({ success: true });
  } catch (error) {
    return fail(error);
  }
}
