import type { NextRequest } from "next/server";

import { isEnabledStatus } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { verifyToken } from "@/lib/middleware/auth";

// Require a valid access cookie and hydrate the current user from the database.
export async function requireSession(request: NextRequest) {
  const payload = verifyToken(request);

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
