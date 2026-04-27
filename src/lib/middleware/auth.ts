import type { NextRequest } from "next/server";

import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  type AppRole,
} from "@/lib/constants";
import {
  type AccessTokenPayload,
  type RefreshTokenPayload,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth";
import { AppError } from "@/lib/errors";

// Header-aware authentication helpers used by protected route handlers.
function readBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new AppError(401, "INVALID_TOKEN", "Authorization header must use Bearer format.");
  }

  return token;
}

export function getAccessTokenFromRequest(request: NextRequest) {
  return readBearerToken(request) ?? request.cookies.get(ACCESS_COOKIE_NAME)?.value ?? null;
}

export function getRefreshTokenFromRequest(request: NextRequest) {
  const bearerToken = readBearerToken(request);

  if (bearerToken) {
    return bearerToken;
  }

  return request.cookies.get(REFRESH_COOKIE_NAME)?.value ?? null;
}

export function verifyToken(request: NextRequest): AccessTokenPayload {
  const token = getAccessTokenFromRequest(request);

  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication token is required.");
  }

  try {
    return verifyAccessToken(token);
  } catch {
    throw new AppError(401, "TOKEN_EXPIRED", "The access token is expired or invalid.");
  }
}

export function verifyRefreshSessionToken(request: NextRequest): RefreshTokenPayload {
  const token = getRefreshTokenFromRequest(request);

  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Refresh token is required.");
  }

  try {
    return verifyRefreshToken(token);
  } catch {
    throw new AppError(401, "TOKEN_EXPIRED", "The refresh token is expired or invalid.");
  }
}

export function requireRole(role: AppRole, allowedRoles: AppRole[]) {
  if (!allowedRoles.includes(role)) {
    throw new AppError(403, "FORBIDDEN", "You do not have permission to access this resource.");
  }
}
