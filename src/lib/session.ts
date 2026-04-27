import type { NextRequest } from "next/server";

import { isEnabledStatus } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";
import { ACCESS_COOKIE_NAME } from "@/lib/constants";
import { AppError } from "@/lib/errors";

export async function requireSession(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;

  if (!accessToken) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  let payload: { sub: string };

  try {
    payload = verifyAccessToken(accessToken);
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Your session has expired.");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!user || !isEnabledStatus(user.status)) {
    throw new AppError(401, "UNAUTHORIZED", "Your account is unavailable.");
  }

  return user;
}
