import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

import { fail, ok, parseBody } from "@/lib/api";
import { createAuditLog } from "@/lib/audit";
import { createUserSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { AppError } from "@/lib/errors";
import { assertCanManageRole, canManageUsers, canViewUserDirectory } from "@/lib/permissions";
import { serializeUser } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);

    if (!canViewUserDirectory(session.role)) {
      throw new AppError(403, "FORBIDDEN", "You cannot list users.");
    }

    const users = await prisma.user.findMany({
      where: session.role === "MANAGER" ? { role: "EMPLOYEE" } : undefined,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
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

    return ok({ users: users.map(serializeUser) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);

    if (!canManageUsers(session.role)) {
      throw new AppError(403, "FORBIDDEN", "You cannot create users.");
    }

    const payload = await parseBody(request, createUserSchema);
    assertCanManageRole(session.role, payload.role, payload.role);

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
        role: payload.role,
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
      actorId: session.id,
      action: "USER_CREATED",
      entityType: "user",
      entityId: user.id,
      description: `${session.email} created ${user.email}.`,
      metadata: { role: user.role, status: user.status },
    });

    return ok({ user: serializeUser(user) }, 201);
  } catch (error) {
    return fail(error);
  }
}
