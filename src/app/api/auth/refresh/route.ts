import { NextRequest } from "next/server";

import { ok, fail } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import {
  clearAuthCookies,
  hashToken,
  setAuthCookies,
  signAccessToken,
  signRefreshToken,
} from "@/lib/auth";
import { ACCESS_COOKIE_NAME, isEnabledStatus, REFRESH_COOKIE_NAME } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { verifyRefreshSessionToken, getRefreshTokenFromRequest } from "@/lib/middleware/auth";
import { prisma } from "@/lib/prisma";
import { serializeSessionUser } from "@/lib/serializers";

// Rotates refresh tokens so every successful refresh invalidates the previous session token.
export async function POST(request: NextRequest) {
  try {
    const refreshToken = getRefreshTokenFromRequest(request);
    if (!refreshToken) {
      throw new AppError(401, "UNAUTHORIZED", "Refresh token is required.");
    }

    const payload = verifyRefreshSessionToken(request);
    const session = await prisma.refreshToken.findUnique({
      where: { id: payload.sessionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new AppError(401, "UNAUTHORIZED", "The refresh token is no longer valid.");
    }

    if (session.tokenHash !== hashToken(refreshToken)) {
      throw new AppError(401, "UNAUTHORIZED", "The refresh token is invalid.");
    }

    if (!isEnabledStatus(session.user.status)) {
      throw new AppError(401, "UNAUTHORIZED", "The account is inactive.");
    }

    // Token rotation creates a new session row before revoking the current one.
    const replacement = await prisma.refreshToken.create({
      data: {
        userId: session.user.id,
        tokenHash: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: request.headers.get("user-agent"),
        ipAddress:
          request.headers.get("x-forwarded-for") ??
          request.headers.get("x-real-ip") ??
          undefined,
      },
    });

    const nextAccessToken = signAccessToken({
      sub: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    });
    const nextRefreshToken = signRefreshToken({
      sub: session.user.id,
      sessionId: replacement.id,
    });

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: replacement.id,
        },
      }),
      prisma.refreshToken.update({
        where: { id: replacement.id },
        data: { tokenHash: hashToken(nextRefreshToken) },
      }),
    ]);

    await setAuthCookies(nextAccessToken, nextRefreshToken);

    await createAuditLog(prisma, {
      actorId: session.user.id,
      action: "AUTH_REFRESH",
      entityType: "session",
      entityId: replacement.id,
      description: `${session.user.email} refreshed the session.`,
    });

    return ok({
      user: serializeSessionUser(session.user),
      access_token: nextAccessToken,
      refresh_token: nextRefreshToken,
      token_type: "Bearer",
      expires_in: 60 * 15,
      cookie_names: {
        access: ACCESS_COOKIE_NAME,
        refresh: REFRESH_COOKIE_NAME,
      },
    });
  } catch (error) {
    await clearAuthCookies();
    return fail(error);
  }
}
