import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

import { fail, ok, parseBody } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { canManageUsers } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/schemas";
import { serializeUser } from "@/lib/serializers";
import { requireSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const payload = await parseBody(request, registerSchema);
    const userCount = await prisma.user.count();

    let actorId: string | null = null;
    let actorEmail = "bootstrap";
    let nextRole = payload.role ?? "EMPLOYEE";

    if (userCount === 0) {
      nextRole = payload.role ?? "ADMIN";
    } else {
      const session = await requireSession(request);

      if (!canManageUsers(session.role)) {
        throw new AppError(403, "FORBIDDEN", "Only admins can register new users.");
      }

      actorId = session.id;
      actorEmail = session.email;
    }

    const existing = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(409, "EMAIL_TAKEN", "Email is already in use.");
    }

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email.toLowerCase(),
        passwordHash: await bcrypt.hash(payload.password, 12),
        role: nextRole,
        status: payload.status ?? "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog(prisma, {
      actorId,
      action: "USER_CREATED",
      entityType: "user",
      entityId: user.id,
      description: `${actorEmail} registered ${user.email}.`,
      metadata: { role: user.role, status: user.status },
    });

    return ok({ user: serializeUser(user) }, 201);
  } catch (error) {
    return fail(error);
  }
}
