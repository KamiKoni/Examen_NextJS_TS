import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

import { ok, fail, parseBody } from '@/lib/api';
import { createAuditLog } from '@/lib/audit';
import {
  hashToken,
  setAuthCookies,
  signAccessToken,
  signRefreshToken,
} from '@/lib/auth';
import { ACCESS_COOKIE_NAME, isEnabledStatus, REFRESH_COOKIE_NAME } from '@/lib/constants';
import { loginSchema } from '@/lib/schemas';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { serializeSessionUser } from '@/lib/serializers';

// Creates a refresh-token backed session and stores both auth cookies.
export async function POST(request: NextRequest) {
  try {
    const payload = await parseBody(request, loginSchema);

    const user = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });

    if (!user || !isEnabledStatus(user.status)) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password.'
      );
    }

    const passwordMatches = await bcrypt.compare(
      payload.password,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password.'
      );
    }

    // Persist the refresh session first so the signed token can point at a real database row.
    const refreshRecord = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: request.headers.get('user-agent'),
        ipAddress:
          request.headers.get('x-forwarded-for') ??
          request.headers.get('x-real-ip') ??
          undefined,
      },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    const refreshToken = signRefreshToken({
      sub: user.id,
      sessionId: refreshRecord.id,
    });

    await prisma.refreshToken.update({
      where: { id: refreshRecord.id },
      data: { tokenHash: hashToken(refreshToken) },
    });

    await setAuthCookies(accessToken, refreshToken);

    await createAuditLog(prisma, {
      actorId: user.id,
      action: 'AUTH_LOGIN',
      entityType: 'session',
      entityId: refreshRecord.id,
      description: `${user.email} signed in.`,
    });

    return ok({
      user: serializeSessionUser(user),
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 60 * 15,
      cookie_names: {
        access: ACCESS_COOKIE_NAME,
        refresh: REFRESH_COOKIE_NAME,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
