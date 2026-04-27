import { NextRequest } from 'next/server';

import { clearAuthCookies } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { getRefreshTokenFromRequest, verifyRefreshSessionToken } from '@/lib/middleware/auth';

// Logout clears cookies immediately and revokes the backing refresh token on a best-effort basis.
export async function POST(request: NextRequest) {
  try {
    const refreshToken = getRefreshTokenFromRequest(request);

    await clearAuthCookies();

    if (refreshToken) {
      try {
        const payload = verifyRefreshSessionToken(request);

        void (async () => {
          try {
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
              action: 'AUTH_LOGOUT',
              entityType: 'session',
              entityId: payload.sessionId,
              description: `${payload.sub} signed out.`,
            });
          } catch {
            // Logout cleanup is best-effort.
          }
        })();
      } catch {
        // Logout is best-effort.
      }
    }

    return ok({ success: true });
  } catch (error) {
    return fail(error);
  }
}
